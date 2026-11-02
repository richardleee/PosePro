import Foundation
import Observation

enum NativePhotoPhase: Equatable {
    case unsaved, rendering, authorizing, saving, saveFailed, recordFailed, saved
}

struct NativePhotoState {
    var phase: NativePhotoPhase = .unsaved
    var adjustments = PhotoAdjustments()
    var previewData: Data
    var isPreparingPreview = false
    var previewMatchesAdjustments = true
    var isPreparingShare = false
    var isFavorite = false
    var errorMessage: String?
    var needsSettings = false
    var shareURL: URL?
}

enum NativePhotoAction {
    case brightness(Double), contrast(Double), temperature(Double), reset
    case save, retryPreview, retryRecord, toggleFavorite, share, dismissShare, dismissError, cancelWork
}

@MainActor
protocol NativePhotoLibraryProviding: AnyObject {
    func markPhotoSaved(at date: Date)
    func append(_ record: SavedPhotoRecord) throws
    func setFavorite(recordID: UUID, isFavorite: Bool) throws
}

extension LocalLibraryStore: NativePhotoLibraryProviding {}

@MainActor @Observable
final class NativePhotoViewModel {
    private(set) var state: NativePhotoState
    private(set) var saved = false
    let captureID: UUID
    let recipe: ShotRecipe?
    let goal: ShotGoal?
    private let original: Data
    private let library: any NativePhotoLibraryProviding
    private let output: any PhotoOutputProviding
    private var pendingRecord: SavedPhotoRecord?
    private var storedRecord: SavedPhotoRecord?
    private var rendered: RenderedPhoto?
    private var previewTask: Task<Void, Never>?
    private var operationTask: Task<Void, Never>?
    private var previewGeneration = UUID()
    private var operationGeneration = UUID()
    private let previewDelay: Duration

    init(data: Data, captureID: UUID = UUID(), recipe: ShotRecipe?, goal: ShotGoal?,
         library: any NativePhotoLibraryProviding, output: any PhotoOutputProviding,
         previewDelay: Duration = .milliseconds(160)) {
        original = data
        self.captureID = captureID
        self.recipe = recipe
        self.goal = goal
        self.library = library
        self.output = output
        self.previewDelay = previewDelay
        state = NativePhotoState(previewData: data)
    }

    var isBusy: Bool { state.phase == .rendering || state.phase == .authorizing || state.phase == .saving || state.isPreparingShare }
    var canEdit: Bool { !saved && !isBusy }
    var canSave: Bool { !saved && !isBusy && state.previewMatchesAdjustments }
    var canShare: Bool { !isBusy && state.previewMatchesAdjustments }
    var canRetryRecord: Bool { pendingRecord != nil }
    var canFavorite: Bool { storedRecord != nil && !isBusy }

    func send(_ action: NativePhotoAction) {
        switch action {
        case .brightness(let value): update { $0.brightness = min(0.3, max(-0.3, value)) }
        case .contrast(let value): update { $0.contrast = min(1.3, max(0.7, value)) }
        case .temperature(let value): update { $0.temperature = min(1, max(-1, value)) }
        case .reset: update { $0 = PhotoAdjustments() }
        case .save: save()
        case .retryPreview: update { _ in }
        case .retryRecord:
            guard saved, pendingRecord != nil, !isBusy else { return }
            persistRecord()
        case .toggleFavorite: toggleFavorite()
        case .share: share()
        case .dismissShare:
            if let url = state.shareURL { output.removeShareFile(url) }
            state.shareURL = nil
        case .dismissError: state.errorMessage = nil
        case .cancelWork:
            // A submitted PhotoKit transaction cannot honestly be cancelled.
            guard state.phase != .saving else { return }
            previewGeneration = UUID()
            operationGeneration = UUID()
            previewTask?.cancel()
            operationTask?.cancel()
            state.isPreparingPreview = false
            state.isPreparingShare = false
            if !state.previewMatchesAdjustments {
                state.errorMessage = "Preview preparation was interrupted. Retry the preview or choose Original before saving."
            }
            if state.phase == .rendering || state.phase == .authorizing { state.phase = .unsaved }
        }
    }

    private func update(_ change: (inout PhotoAdjustments) -> Void) {
        guard canEdit else { return }
        change(&state.adjustments)
        state.phase = .unsaved
        state.errorMessage = nil
        state.needsSettings = false
        rendered = nil
        state.previewMatchesAdjustments = false
        previewTask?.cancel()
        let generation = UUID()
        previewGeneration = generation
        let adjustments = state.adjustments
        if adjustments.isOriginal {
            state.previewData = original
            state.isPreparingPreview = false
            state.previewMatchesAdjustments = true
            return
        }
        state.isPreparingPreview = true
        previewTask = Task { [weak self] in
            guard let self else { return }
            do {
                try await Task.sleep(for: previewDelay)
                let result = try await output.render(original, adjustments: adjustments)
                guard !Task.isCancelled, previewGeneration == generation else { return }
                state.previewData = result.data
                state.isPreparingPreview = false
                state.previewMatchesAdjustments = true
                rendered = result
            } catch is CancellationError {
                // A newer adjustment owns the preview.
            } catch {
                guard previewGeneration == generation else { return }
                state.isPreparingPreview = false
                state.errorMessage = error.localizedDescription
            }
        }
    }

    private func save() {
        guard canSave else { return }
        previewTask?.cancel()
        previewGeneration = UUID()
        state.isPreparingPreview = false
        state.phase = .rendering
        state.errorMessage = nil
        state.needsSettings = false
        let generation = UUID()
        operationGeneration = generation
        let adjustments = state.adjustments
        operationTask = Task { [weak self] in
            guard let self else { return }
            do {
                let result = try await output.render(original, adjustments: adjustments)
                guard !Task.isCancelled, operationGeneration == generation else { return }
                rendered = result
                state.previewData = result.data
                state.phase = .authorizing
                try await output.authorizeSaving()
                guard !Task.isCancelled, operationGeneration == generation else { return }
                let receipt = try await output.save(
                    result, captureID: captureID, outputVersion: adjustments.outputVersion,
                    submissionAllowed: { [weak self] in
                        guard let self, self.operationGeneration == generation,
                              self.state.phase == .authorizing else { return false }
                        // No suspension occurs between this state change and
                        // PhotoKit submission. From here onward, report its result.
                        self.state.phase = .saving
                        return true
                    }
                )
                // From the real PhotoKit success onward, never submit again.
                saved = true
                library.markPhotoSaved(at: receipt.savedAt)
                guard let identifier = receipt.localIdentifier else {
                    state.phase = .recordFailed
                    state.errorMessage = "Photo saved to Photos, but its library reference is unavailable. Check Photos; saving again is disabled to prevent a duplicate."
                    return
                }
                pendingRecord = SavedPhotoRecord(
                    id: captureID, captureID: captureID, outputVersion: adjustments.outputVersion,
                    photoLocalIdentifier: identifier, savedAt: receipt.savedAt,
                    recipeID: recipe?.id, recipeVersion: recipe?.version,
                    goalID: goal?.id, goalTitle: goal?.title, favorite: false
                )
                persistRecord()
            } catch is CancellationError {
                guard operationGeneration == generation else { return }
                state.phase = .unsaved
            } catch {
                guard operationGeneration == generation else { return }
                state.phase = .saveFailed
                state.errorMessage = error.localizedDescription
                if let photoError = error as? PhotoOutputError, case .permissionDenied = photoError {
                    state.needsSettings = true
                }
            }
        }
    }

    private func persistRecord() {
        guard let record = pendingRecord else { return }
        do {
            try library.append(record)
            storedRecord = record
            pendingRecord = nil
            state.phase = .saved
            state.errorMessage = nil
        } catch {
            state.phase = .recordFailed
            state.errorMessage = "Photo saved to Photos. The on-device history could not be updated. Retry history to finish without saving another photo."
        }
    }

    private func toggleFavorite() {
        guard canFavorite, let record = storedRecord else { return }
        let favorite = !state.isFavorite
        do {
            try library.setFavorite(recordID: record.id, isFavorite: favorite)
            state.isFavorite = favorite
        } catch {
            state.errorMessage = "Your photo is saved. Its Favorite setting could not be updated; please try again."
        }
    }

    private func share() {
        guard canShare, state.shareURL == nil else { return }
        state.isPreparingShare = true
        let generation = UUID()
        operationGeneration = generation
        let adjustments = state.adjustments
        operationTask = Task { [weak self] in
            guard let self else { return }
            do {
                let result: RenderedPhoto
                if let rendered { result = rendered }
                else { result = try await output.render(original, adjustments: adjustments) }
                guard !Task.isCancelled, operationGeneration == generation else { return }
                let url = try await output.shareFile(result)
                guard !Task.isCancelled, operationGeneration == generation else {
                    output.removeShareFile(url)
                    return
                }
                state.shareURL = url
                state.isPreparingShare = false
            } catch {
                guard operationGeneration == generation else { return }
                state.isPreparingShare = false
                state.errorMessage = error.localizedDescription
            }
        }
    }
}
