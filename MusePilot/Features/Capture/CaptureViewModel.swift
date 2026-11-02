import Foundation
import Observation

enum CaptureRecipient: String, CaseIterable, Identifiable {
    case photographer = "I'm shooting", subject = "I'm in frame"
    var id: String { rawValue }
}

enum CaptureSupport: String, CaseIterable, Identifiable {
    case handheld = "Handheld", fixed = "Fixed phone"
    var id: String { rawValue }
}

struct CaptureState {
    var recipe: ShotRecipe = ShotRecipe.starterRecipes[0]
    var goalIndex = 0
    var recipient: CaptureRecipient = .photographer
    var support: CaptureSupport = .handheld
    var paused = false
    var skipped = false
    var grid = true
    var timer = false
    var flash = false
    var referenceExpanded = true
    var countdown: Int?
    var researchEnabled = false
    var centeredComposition = false
    var suggestion = GuidanceSuggestion(kind: .reference, title: "For the photographer", message: "Keep the person and the place in your picture.")
    var error: String?
    var photo: NativePhotoViewModel?
    var goal: ShotGoal { recipe.goals[goalIndex] }
}

enum CaptureAction {
    case start, stop, shutter, cancelCountdown, switchLens, togglePause, skip
    case chooseRecipe(ShotRecipe), chooseGoal(Int), recipient(CaptureRecipient), support(CaptureSupport)
    case grid(Bool), timer(Bool), flash(Bool), reference(Bool), research(Bool), centered(Bool)
    case photoDismissed, nextGoal, clearError, hardwareInterrupted
}

@MainActor @Observable
final class CaptureViewModel {
    private(set) var state = CaptureState()
    let camera: NativeCameraService
    private let library: LocalLibraryStore
    private let output: PhotoOutputService
    private var task: Task<Void, Never>?
    private var watchdog: Task<Void, Never>?
    private var generation = UUID()
    private var lastObservationAt: Date?
    private var pendingSuggestion: GuidanceSuggestion?
    private var pendingSince: Date?
    private var lastPublishedAt = Date.distantPast
    private var isVisible = false

    init(camera: NativeCameraService, library: LocalLibraryStore, output: PhotoOutputService) {
        self.camera = camera
        self.library = library
        self.output = output
        camera.onObservation = { [weak self] observation in self?.receive(observation) }
        updateReference()
    }

    var canCapture: Bool { camera.status == .ready && state.countdown == nil && state.photo == nil }

    func send(_ action: CaptureAction) {
        // Once a user-triggered exposure is in flight, reference/tool changes must
        // not silently throw its result away. Stop still invalidates on exit.
        if camera.status == .capturing {
            switch action {
            case .stop, .togglePause, .skip, .clearError, .hardwareInterrupted: break
            default: return
            }
        }
        switch action {
        case .start:
            guard state.photo == nil else { return }
            isVisible = true
            cancelWork()
            let request = generation
            task = Task { [weak self] in
                guard let self else { return }
                await camera.start()
                guard request == generation, isVisible, !Task.isCancelled else { return }
                configureAnalysis()
            }
        case .stop:
            isVisible = false
            cancelWork()
            camera.stop()
            updateReference()
        case .shutter:
            guard canCapture else { return }
            cancelWork()
            let request = generation
            task = Task { [weak self] in
                guard let self else { return }
                do {
                    if state.timer {
                        for second in stride(from: 3, through: 1, by: -1) {
                            guard valid(request) else { return }
                            state.countdown = second
                            try await Task.sleep(for: .seconds(1))
                        }
                    }
                    guard valid(request) else { return }
                    state.countdown = nil
                    let recipe = state.recipe
                    let goal = state.goal
                    let data = try await camera.capture(flash: state.flash)
                    guard valid(request) else { return }
                    camera.stop()
                    state.photo = NativePhotoViewModel(data: data, recipe: recipe, goal: goal, library: library, output: output)
                } catch is CancellationError {
                    state.countdown = nil
                } catch {
                    guard request == generation else { return }
                    state.countdown = nil
                    state.error = error.localizedDescription
                }
            }
        case .cancelCountdown:
            cancelWork()
            configureAnalysis()
        case .switchLens:
            guard state.photo == nil, camera.status != .capturing else { return }
            cancelWork()
            updateReference()
            let request = generation
            let lens: NativeLens = camera.lens == .rear ? .front : .rear
            task = Task { [weak self] in
                guard let self else { return }
                await camera.setLens(lens)
                guard valid(request) else { return }
                configureAnalysis()
            }
        case .togglePause:
            state.paused.toggle()
            if state.countdown != nil { cancelWork() }
            updateReference()
            configureAnalysis()
        case .skip:
            state.skipped = true
            updateReference()
            configureAnalysis()
        case .chooseRecipe(let recipe):
            guard !recipe.goals.isEmpty else { return }
            cancelWork()
            state.recipe = recipe
            state.goalIndex = 0
            state.centeredComposition = false
            state.skipped = false
            updateReference()
            configureAnalysis()
        case .chooseGoal(let index):
            guard state.recipe.goals.indices.contains(index) else { return }
            cancelWork()
            state.goalIndex = index
            state.centeredComposition = false
            state.skipped = false
            updateReference()
            configureAnalysis()
        case .recipient(let recipient):
            cancelWork()
            state.recipient = recipient
            updateReference()
            configureAnalysis()
        case .support(let support):
            cancelWork()
            state.support = support
            updateReference()
            configureAnalysis()
        case .grid(let value): state.grid = value
        case .timer(let value): cancelWork(); state.timer = value; configureAnalysis()
        case .flash(let value): state.flash = value && camera.supportsFlash
        case .reference(let value): state.referenceExpanded = value
        case .centered(let value):
            cancelWork()
            state.centeredComposition = value
            updateReference()
            configureAnalysis()
        case .research(let value):
            #if DEBUG
            state.researchEnabled = value
            #else
            state.researchEnabled = false
            #endif
            cancelWork()
            updateReference()
            configureAnalysis()
        case .photoDismissed:
            state.photo = nil
            // The user explicitly enables the camera again after reviewing a photo.
            cancelWork()
            updateReference()
        case .nextGoal:
            state.photo = nil
            send(.chooseGoal((state.goalIndex + 1) % state.recipe.goals.count))
        case .clearError: state.error = nil
        case .hardwareInterrupted:
            cancelWork()
            camera.setAnalysisEnabled(false)
            updateReference()
        }
    }

    private func valid(_ request: UUID) -> Bool {
        request == generation && isVisible && !Task.isCancelled
    }

    private func cancelWork() {
        generation = UUID()
        task?.cancel()
        task = nil
        watchdog?.cancel()
        watchdog = nil
        state.countdown = nil
        pendingSuggestion = nil
        pendingSince = nil
        lastObservationAt = nil
    }

    private func updateReference() {
        state.suggestion = .init(kind: .reference,
                                title: state.paused ? "Guidance paused" : state.recipient == .photographer ? "For the photographer" : "For the person in frame",
                                message: state.skipped ? "Use the reference when you want, or take the photo whenever you're ready." : state.recipient == .photographer ? state.goal.cameraTip : state.goal.subjectTip)
    }

    private func configureAnalysis() {
        watchdog?.cancel()
        watchdog = nil
        let enabled = isVisible && (camera.status == .ready || camera.status == .capturing) && state.researchEnabled && state.centeredComposition && state.recipient == .photographer && !state.paused && !state.skipped && state.photo == nil && camera.lens == .rear && state.support == .handheld && state.goal.framing == .halfBody
        camera.setAnalysisEnabled(enabled)
        guard enabled else { return }
        // Prevent a frozen observation remaining visible if the camera stalls.
        watchdog = Task { [weak self] in
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(1)) } catch { return }
                guard let self else { return }
                if let observedAt = lastObservationAt, Date().timeIntervalSince(observedAt) > 1.5 {
                    state.suggestion = .init(kind: .unavailable, title: "Can't judge this frame", message: "Use the reference or take the photo whenever you like.")
                }
            }
        }
    }

    private func receive(_ observation: NativeBodyObservation) {
        guard isVisible, state.researchEnabled, state.centeredComposition, state.recipient == .photographer, !state.paused, !state.skipped, state.photo == nil else { return }
        lastObservationAt = observation.timestamp
        let left = observation.joints["leftShoulder"]
        let right = observation.joints["rightShoulder"]
        let x = left.flatMap { l in right.map { (l.x + $0.x) / 2 } }
        let confidence = min(left?.confidence ?? 0, right?.confidence ?? 0)
        let suggestion = GuidancePolicy.suggestion(
            signals: .init(bodyCount: observation.bodyCount, shoulderMidX: x, shoulderConfidence: confidence,
                           age: Date().timeIntervalSince(observation.timestamp),
                           supportedRearHandheld: camera.lens == .rear && state.support == .handheld && state.goal.framing == .halfBody,
                           centeredCompositionRequested: state.centeredComposition),
            researchEnabled: state.researchEnabled, paused: state.paused, skipped: state.skipped,
            reference: state.recipient == .photographer ? state.goal.cameraTip : state.goal.subjectTip)
        // Unknown invalidates immediately. New directional advice must remain stable.
        if suggestion.kind != .research {
            state.suggestion = suggestion
            pendingSuggestion = nil
            pendingSince = nil
        } else if suggestion == pendingSuggestion {
            let now = Date()
            if now.timeIntervalSince(pendingSince ?? now) >= 0.8 && now.timeIntervalSince(lastPublishedAt) >= 3 {
                state.suggestion = suggestion
                lastPublishedAt = now
            }
        } else {
            updateReference()
            pendingSuggestion = suggestion
            pendingSince = Date()
        }
    }

    static var preview: CaptureViewModel {
        .init(camera: NativeCameraService(previewOnly: true), library: LocalLibraryStore(inMemory: true), output: PhotoOutputService(previewOnly: true))
    }
}
