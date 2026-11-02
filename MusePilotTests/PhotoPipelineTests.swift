import Foundation
import XCTest
@testable import MusePilot

final class PhotoPipelineTests: XCTestCase {
    @MainActor
    func testConfirmedPhotoWithFailedMetadataRetriesOnlyMetadata() async {
        let output = PhotoOutputDouble()
        let library = PhotoLibraryDouble()
        library.remainingAppendFailures = 1
        let model = makeModel(output: output, library: library)

        model.send(.save)
        await eventually { model.state.phase == .recordFailed }
        XCTAssertTrue(model.saved)
        XCTAssertEqual(library.activationDates.count, 1)
        XCTAssertEqual(output.systemWrites, 1)
        XCTAssertTrue(library.records.isEmpty)

        model.send(.retryRecord)
        XCTAssertEqual(model.state.phase, .saved)
        XCTAssertEqual(library.records.count, 1)
        XCTAssertEqual(library.appendCalls, 2)
        XCTAssertEqual(output.systemWrites, 1)
        XCTAssertEqual(library.activationDates.count, 1)
    }

    @MainActor
    func testRapidSaveAndShareCannotSubmitTwoWrites() async {
        let output = PhotoOutputDouble()
        output.holdSystemCompletion = true
        let library = PhotoLibraryDouble()
        let model = makeModel(output: output, library: library)

        model.send(.save)
        model.send(.save)
        model.send(.share)
        await eventually { model.state.phase == .saving }
        model.send(.save)
        model.send(.share)
        model.send(.cancelWork)
        XCTAssertEqual(model.state.phase, .saving, "Submitted writes cannot pretend to cancel.")
        XCTAssertEqual(output.systemWrites, 1)
        XCTAssertEqual(output.shareRequests, 0)

        output.finishSystemSave()
        await eventually { model.saved }
        model.send(.save)
        XCTAssertEqual(output.systemWrites, 1)
        XCTAssertEqual(library.records.count, 1)
    }

    @MainActor
    func testDeniedPermissionDoesNotActivateOrWrite() async {
        let output = PhotoOutputDouble()
        output.authorizationError = PhotoOutputError.permissionDenied
        let library = PhotoLibraryDouble()
        let model = makeModel(output: output, library: library)

        model.send(.save)
        await eventually { model.state.phase == .saveFailed }
        XCTAssertFalse(model.saved)
        XCTAssertTrue(model.state.needsSettings)
        XCTAssertEqual(output.systemWrites, 0)
        XCTAssertTrue(library.activationDates.isEmpty)
        XCTAssertTrue(library.records.isEmpty)
    }

    @MainActor
    func testFailedAdjustmentPreviewBlocksMismatchingSaveAndShare() async {
        let output = PhotoOutputDouble()
        output.failAdjustedRendering = true
        let library = PhotoLibraryDouble()
        let model = makeModel(output: output, library: library)
        let originalPreview = model.state.previewData

        model.send(.brightness(0.1))
        await eventually { !model.state.isPreparingPreview && model.state.errorMessage != nil }
        XCTAssertEqual(model.state.previewData, originalPreview)
        XCTAssertFalse(model.state.previewMatchesAdjustments)
        XCTAssertFalse(model.canSave)
        XCTAssertFalse(model.canShare)
        model.send(.save)
        model.send(.share)
        XCTAssertEqual(output.authorizationRequests, 0)
        XCTAssertEqual(output.systemWrites, 0)
        XCTAssertEqual(output.shareRequests, 0)

        model.send(.reset)
        XCTAssertTrue(model.state.adjustments.isOriginal)
        XCTAssertTrue(model.state.previewMatchesAdjustments)
        XCTAssertTrue(model.canSave)
        model.send(.save)
        await eventually { model.saved }
        XCTAssertEqual(output.systemWrites, 1)
    }

    @MainActor
    func testCancelledRenderCannotSaveItsLateResult() async {
        let output = PhotoOutputDouble()
        output.holdRendering = true
        let library = PhotoLibraryDouble()
        let model = makeModel(output: output, library: library)

        model.send(.save)
        await eventually { output.renderContinuation != nil }
        model.send(.cancelWork)
        output.finishRendering()
        await eventually { output.completedRenders == 1 }
        await settleMainActor()

        XCTAssertEqual(model.state.phase, .unsaved)
        XCTAssertFalse(model.saved)
        XCTAssertEqual(output.authorizationRequests, 0)
        XCTAssertEqual(output.systemWrites, 0)
        XCTAssertTrue(library.activationDates.isEmpty)
    }

    @MainActor
    func testCancelledPermissionCannotWriteAfterLateAuthorization() async {
        let output = PhotoOutputDouble()
        output.holdAuthorization = true
        let library = PhotoLibraryDouble()
        let model = makeModel(output: output, library: library)

        model.send(.save)
        await eventually { model.state.phase == .authorizing && output.authorizationContinuation != nil }
        model.send(.cancelWork) // Same action the view sends on real backgrounding.
        output.finishAuthorization()
        await settleMainActor()

        XCTAssertEqual(model.state.phase, .unsaved)
        XCTAssertFalse(model.saved)
        XCTAssertEqual(output.systemWrites, 0)
        XCTAssertTrue(library.activationDates.isEmpty)
    }

    @MainActor
    private func makeModel(output: PhotoOutputDouble, library: PhotoLibraryDouble) -> NativePhotoViewModel {
        NativePhotoViewModel(data: Data([1, 2, 3]), recipe: nil, goal: nil,
                             library: library, output: output, previewDelay: .zero)
    }

    @MainActor
    private func eventually(_ predicate: @MainActor () -> Bool,
                            file: StaticString = #filePath, line: UInt = #line) async {
        let deadline = ContinuousClock.now + .seconds(2)
        while !predicate() {
            guard ContinuousClock.now < deadline else {
                XCTFail("Expected photo pipeline state was not reached.", file: file, line: line)
                return
            }
            try? await Task.sleep(for: .milliseconds(5))
        }
    }

    @MainActor
    private func settleMainActor() async {
        // Drain a late continuation without introducing production timing assumptions.
        for _ in 0..<10 { await Task.yield() }
    }
}

@MainActor
private final class PhotoLibraryDouble: NativePhotoLibraryProviding {
    var records: [SavedPhotoRecord] = []
    var activationDates: [Date] = []
    var appendCalls = 0
    var remainingAppendFailures = 0

    func markPhotoSaved(at date: Date) { activationDates.append(date) }

    func append(_ record: SavedPhotoRecord) throws {
        appendCalls += 1
        if remainingAppendFailures > 0 {
            remainingAppendFailures -= 1
            throw CocoaError(.fileWriteNoPermission)
        }
        if !records.contains(where: { $0.captureID == record.captureID && $0.outputVersion == record.outputVersion }) {
            records.append(record)
        }
    }

    func setFavorite(recordID: UUID, isFavorite: Bool) throws {
        guard let index = records.firstIndex(where: { $0.id == recordID }) else { return }
        records[index].favorite = isFavorite
    }
}

@MainActor
private final class PhotoOutputDouble: PhotoOutputProviding {
    var authorizationError: Error?
    var authorizationRequests = 0
    var systemWrites = 0
    var shareRequests = 0
    var completedRenders = 0
    var failAdjustedRendering = false
    var holdRendering = false
    var holdAuthorization = false
    var holdSystemCompletion = false
    var renderContinuation: CheckedContinuation<Void, Never>?
    var authorizationContinuation: CheckedContinuation<Void, Never>?
    private var systemContinuation: CheckedContinuation<Void, Never>?

    func render(_ data: Data, adjustments: PhotoAdjustments) async throws -> RenderedPhoto {
        if holdRendering { await withCheckedContinuation { renderContinuation = $0 } }
        completedRenders += 1
        // Deliberately ignore cancellation: the model must reject late output itself.
        if failAdjustedRendering && !adjustments.isOriginal { throw PhotoOutputError.renderFailed }
        return RenderedPhoto(data: data, fileExtension: "jpg", uniformTypeIdentifier: "public.jpeg")
    }

    func authorizeSaving() async throws {
        authorizationRequests += 1
        if holdAuthorization { await withCheckedContinuation { authorizationContinuation = $0 } }
        if let authorizationError { throw authorizationError }
    }

    func save(_ photo: RenderedPhoto, captureID: UUID, outputVersion: String,
              submissionAllowed: @escaping @MainActor @Sendable () -> Bool) async throws -> PhotoSaveReceipt {
        guard submissionAllowed() else { throw CancellationError() }
        systemWrites += 1
        if holdSystemCompletion { await withCheckedContinuation { systemContinuation = $0 } }
        return PhotoSaveReceipt(localIdentifier: "test-asset", savedAt: Date(timeIntervalSince1970: 1_700_000_000))
    }

    func shareFile(_ photo: RenderedPhoto) async throws -> URL {
        shareRequests += 1
        return URL(fileURLWithPath: "/test-photo.jpg")
    }
    func removeShareFile(_ url: URL) {}

    func finishRendering() { renderContinuation?.resume(); renderContinuation = nil }
    func finishAuthorization() { authorizationContinuation?.resume(); authorizationContinuation = nil }
    func finishSystemSave() { systemContinuation?.resume(); systemContinuation = nil }
}
