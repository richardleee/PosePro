@preconcurrency import AVFoundation
import CoreVideo
import Foundation
import Observation

/// Main-actor UI facade. Capture hardware and Vision run on separate serial queues.
/// Creating the service does not request permission or start the camera.
@MainActor
@Observable
final class NativeCameraService {
    private(set) var status: NativeCameraStatus = .idle
    private(set) var lens: NativeLens = .rear
    private(set) var supportsFlash = false
    private(set) var lastError: String?

    @ObservationIgnored var onObservation: (@MainActor @Sendable (NativeBodyObservation) -> Void)?
    @ObservationIgnored let previewSource: NativePreviewSource?
    @ObservationIgnored private let backend: NativeCaptureBackend?
    @ObservationIgnored private var eventTask: Task<Void, Never>?
    @ObservationIgnored private var intent: UUID?
    @ObservationIgnored private var analysisEnabled = false

    init(previewOnly: Bool = false) {
        if previewOnly {
            backend = nil
            previewSource = nil
        } else {
            let captureBackend = NativeCaptureBackend()
            backend = captureBackend
            previewSource = captureBackend.previewSource
            let events = captureBackend.events
            eventTask = Task { @MainActor [weak self] in
                for await event in events {
                    guard !Task.isCancelled else { break }
                    self?.receive(event)
                }
            }
        }
    }

    deinit {
        eventTask?.cancel()
        backend?.stop()
    }

    func start() async {
        guard let backend else { return }
        guard status != .ready, status != .capturing, status != .requesting else { return }
        let request = UUID()
        intent = request
        lastError = nil
        status = .requesting

        let granted: Bool
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: granted = true
        case .notDetermined: granted = await AVCaptureDevice.requestAccess(for: .video)
        default: granted = false
        }
        // An authorization callback must not reopen a camera after leaving the tab.
        guard intent == request, !Task.isCancelled else {
            if intent == request { stop() }
            return
        }
        guard granted else {
            intent = nil
            status = .denied
            return
        }

        backend.activate(request)
        do {
            let result = try await backend.start(lens: lens, intent: request)
            guard intent == request, !Task.isCancelled else {
                if intent == request { stop() }
                return
            }
            lens = result.lens
            supportsFlash = result.supportsFlash
            lastError = result.warning
            status = .ready
        } catch {
            guard intent == request else { return }
            lastError = error.localizedDescription
            status = .unavailable(error.localizedDescription)
        }
    }

    func stop() {
        intent = nil
        status = .idle
        supportsFlash = false
        backend?.stop()
    }

    func setLens(_ requestedLens: NativeLens) async {
        guard requestedLens != lens else { return }
        // Selection while inactive does not cause a permission prompt or start capture.
        switch status {
        case .idle, .denied, .unavailable:
            lens = requestedLens
            supportsFlash = false
            return
        default:
            break
        }
        guard status == .ready, let backend else { return }
        let request = UUID()
        intent = request
        status = .requesting
        lastError = nil
        backend.activate(request)
        do {
            let result = try await backend.start(lens: requestedLens, intent: request)
            guard intent == request, !Task.isCancelled else {
                if intent == request { stop() }
                return
            }
            // A failed switch can recover the old input. Report the effective lens.
            lens = result.lens
            supportsFlash = result.supportsFlash
            lastError = result.warning
            status = .ready
        } catch {
            guard intent == request else { return }
            lastError = error.localizedDescription
            status = .unavailable(error.localizedDescription)
        }
    }

    func setAnalysisEnabled(_ enabled: Bool) {
        analysisEnabled = enabled
        backend?.setAnalysisEnabled(enabled)
    }

    func capture(flash: Bool) async throws -> Data {
        guard status == .ready, let backend, let request = intent else {
            throw NativeCaptureError.notReady
        }
        status = .capturing
        do {
            let bytes = try await backend.capture(flash: flash, intent: request)
            guard intent == request, !Task.isCancelled else { throw NativeCaptureError.cancelled }
            if status == .capturing { status = .ready }
            return bytes
        } catch {
            if intent == request, status == .capturing { status = .ready }
            throw error
        }
    }

    private func receive(_ event: NativeCaptureEvent) {
        switch event {
        case .observation(let observation, let request):
            guard intent == request, analysisEnabled,
                  observation.generation == backend?.analysisGeneration,
                  status == .ready || status == .capturing else { return }
            onObservation?(observation)
        case .interrupted(let message, let request):
            guard intent == request else { return }
            intent = nil
            supportsFlash = false
            lastError = message
            status = .unavailable(message)
        }
    }
}

/// Narrow AVFoundation bridge: the session is configured ONLY on the backend queue.
/// UIKit may attach its preview layer on the main actor; it must never configure it.
final class NativePreviewSource: @unchecked Sendable {
    let session: AVCaptureSession
    init(session: AVCaptureSession) { self.session = session }
}

struct NativeCameraStartResult: Sendable {
    let lens: NativeLens
    let supportsFlash: Bool
    var warning: String? = nil
}

enum NativeCaptureEvent: Sendable {
    case observation(NativeBodyObservation, intent: UUID)
    case interrupted(String, intent: UUID)
}

/// Queue-confined AVFoundation owner. The lock protects only cross-queue intent;
/// all session inputs, outputs, and retained delegates belong to `queue`.
final class NativeCaptureBackend: NSObject, @unchecked Sendable {
    let previewSource: NativePreviewSource
    let events: AsyncStream<NativeCaptureEvent>

    private let eventContinuation: AsyncStream<NativeCaptureEvent>.Continuation
    private let session: AVCaptureSession
    private let queue = DispatchQueue(label: "com.posepro.capture", qos: .userInitiated)
    private let analysisQueue = DispatchQueue(label: "com.posepro.pose", qos: .userInitiated)
    private let intentLock = NSLock()
    private var activeIntent: UUID?
    private let photoOutput = AVCapturePhotoOutput()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let vision: NativePoseFrameProcessor
    private var input: AVCaptureDeviceInput?
    private var currentLens: NativeLens = .rear
    private var outputsConfigured = false
    private var photoDelegates: [Int64: NativePhotoDelegate] = [:]
    private var notificationTokens: [NSObjectProtocol] = []

    var analysisGeneration: UUID { vision.generation }

    override init() {
        let stream = AsyncStream<NativeCaptureEvent>.makeStream(bufferingPolicy: .bufferingNewest(8))
        events = stream.stream
        eventContinuation = stream.continuation
        let captureSession = AVCaptureSession()
        session = captureSession
        previewSource = NativePreviewSource(session: captureSession)
        vision = NativePoseFrameProcessor(continuation: stream.continuation)
        super.init()
        let center = NotificationCenter.default
        for name in [AVCaptureSession.wasInterruptedNotification, AVCaptureSession.runtimeErrorNotification] {
            notificationTokens.append(center.addObserver(forName: name, object: session, queue: nil) { [weak self] _ in
                self?.interrupt()
            })
        }
    }

    deinit {
        notificationTokens.forEach { NotificationCenter.default.removeObserver($0) }
        eventContinuation.finish()
    }

    func activate(_ intent: UUID) {
        intentLock.withLock { activeIntent = intent }
        vision.invalidateContext()
    }

    func setAnalysisEnabled(_ enabled: Bool) { vision.setEnabled(enabled) }

    func stop() {
        intentLock.withLock { activeIntent = nil }
        vision.invalidateContext()
        queue.async { [self] in
            // A newer explicit enable request supersedes this queued stop.
            guard intentLock.withLock({ activeIntent == nil }) else { return }
            cancelPhotos()
            if session.isRunning { session.stopRunning() }
        }
    }

    func start(lens: NativeLens, intent: UUID) async throws -> NativeCameraStartResult {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                guard isActive(intent) else {
                    continuation.resume(throwing: NativeCaptureError.cancelled)
                    return
                }
                do {
                    cancelPhotos()
                    var warning: String?
                    do {
                        try configure(lens: lens)
                    } catch {
                        // A previous working input can survive a switch failure.
                        guard input != nil, session.isRunning else { throw error }
                        warning = error.localizedDescription
                    }
                    guard isActive(intent) else { throw NativeCaptureError.cancelled }
                    if !session.isRunning { session.startRunning() }
                    guard isActive(intent), session.isRunning else {
                        if session.isRunning { session.stopRunning() }
                        throw NativeCaptureError.cancelled
                    }
                    let portraitBuffers = configureConnections()
                    vision.setContext(intent: intent, portraitBuffers: portraitBuffers)
                    continuation.resume(returning: NativeCameraStartResult(
                        lens: currentLens, supportsFlash: input?.device.hasFlash ?? false, warning: warning))
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    func capture(flash: Bool, intent: UUID) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                guard isActive(intent), session.isRunning, photoDelegates.isEmpty else {
                    continuation.resume(throwing: NativeCaptureError.notReady)
                    return
                }
                let settings: AVCapturePhotoSettings
                if photoOutput.availablePhotoCodecTypes.contains(.jpeg) {
                    settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
                } else {
                    settings = AVCapturePhotoSettings()
                }
                settings.photoQualityPrioritization = .quality
                settings.flashMode = flash && input?.device.hasFlash == true ? .on : .off
                // The app does not request location or add a GPS metadata dictionary.
                settings.metadata = [:]
                if let connection = photoOutput.connection(with: .video) {
                    if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
                    if connection.isVideoMirroringSupported {
                        connection.automaticallyAdjustsVideoMirroring = false
                        connection.isVideoMirrored = false
                    }
                }
                let captureID = settings.uniqueID
                let delegate = NativePhotoDelegate { [weak self] result in
                    guard let self else {
                        continuation.resume(throwing: NativeCaptureError.cancelled)
                        return
                    }
                    self.queue.async { [self] in
                        photoDelegates[captureID] = nil
                        guard isActive(intent) else {
                            continuation.resume(throwing: NativeCaptureError.cancelled)
                            return
                        }
                        continuation.resume(with: result.mapError { $0 as Error })
                    }
                }
                photoDelegates[captureID] = delegate
                photoOutput.capturePhoto(with: settings, delegate: delegate)
                queue.asyncAfter(deadline: .now() + 30) { [weak self] in
                    guard let self, self.photoDelegates[captureID] != nil,
                          self.isActive(intent) else { return }
                    // Do not silently allow another capture after an unresolved
                    // hardware request. Stop and require explicit re-enabling.
                    self.interrupt()
                }
            }
        }
    }

    private func isActive(_ intent: UUID) -> Bool {
        intentLock.withLock { activeIntent == intent }
    }

    private func configure(lens: NativeLens) throws {
        if input != nil, currentLens == lens, outputsConfigured { return }
        let position: AVCaptureDevice.Position = lens == .rear ? .back : .front
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position) else {
            throw NativeCaptureError.unavailable("This camera is not available. Try the other lens or use the guides.")
        }
        let replacement = try AVCaptureDeviceInput(device: device)
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        if session.canSetSessionPreset(.photo) { session.sessionPreset = .photo }
        let previousInput = input
        if let previousInput { session.removeInput(previousInput) }
        guard session.canAddInput(replacement) else {
            if let previousInput, session.canAddInput(previousInput) {
                session.addInput(previousInput)
            } else {
                input = nil
            }
            throw NativeCaptureError.unavailable("The camera could not be switched. Your previous lens is kept when available.")
        }
        session.addInput(replacement)
        input = replacement
        currentLens = lens
        if !outputsConfigured {
            guard session.canAddOutput(photoOutput) else {
                session.removeInput(replacement)
                input = nil
                throw NativeCaptureError.unavailable("Photo capture is not available on this device.")
            }
            photoOutput.maxPhotoQualityPrioritization = .quality
            session.addOutput(photoOutput)
            videoOutput.alwaysDiscardsLateVideoFrames = true
            videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            videoOutput.setSampleBufferDelegate(vision, queue: analysisQueue)
            guard session.canAddOutput(videoOutput) else {
                session.removeOutput(photoOutput)
                session.removeInput(replacement)
                input = nil
                throw NativeCaptureError.unavailable("This camera cannot provide the required preview analysis stream.")
            }
            session.addOutput(videoOutput)
            outputsConfigured = true
        }
    }

    /// Pixel buffers are physically rotated and mirrored to match the portrait
    /// preview. If the hardware cannot deliver that transform, analysis is unknown.
    private func configureConnections() -> Bool {
        guard let connection = videoOutput.connection(with: .video),
              connection.isVideoRotationAngleSupported(90) else { return false }
        connection.videoRotationAngle = 90
        if connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = currentLens == .front
        } else if currentLens == .front {
            return false
        }
        return true
    }

    private func cancelPhotos() {
        let delegates = Array(photoDelegates.values)
        delegates.forEach { $0.cancel() }
        photoDelegates.removeAll()
    }

    private func interrupt() {
        let previousIntent = intentLock.withLock { () -> UUID? in
            let previous = activeIntent
            activeIntent = nil
            return previous
        }
        vision.invalidateContext()
        guard let previousIntent else { return }
        eventContinuation.yield(.interrupted(
            "The camera was interrupted. Enable it again when you are ready.", intent: previousIntent))
        queue.async { [self] in
            guard intentLock.withLock({ activeIntent == nil }) else { return }
            cancelPhotos()
            if session.isRunning { session.stopRunning() }
        }
        // Interruption-ended notifications deliberately never restart capture.
    }
}

/// AVFoundation retains delegates for a capture; the backend also owns them until
/// completion. Locking makes cancellation and delegate callbacks finish once.
private final class NativePhotoDelegate: NSObject, AVCapturePhotoCaptureDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var data: Data?
    private var processingError: NativeCaptureError?
    private var finished = false
    private let completion: @Sendable (Result<Data, NativeCaptureError>) -> Void

    init(completion: @escaping @Sendable (Result<Data, NativeCaptureError>) -> Void) {
        self.completion = completion
        super.init()
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        let bytes = error == nil ? photo.fileDataRepresentation() : nil
        lock.withLock {
            guard !finished else { return }
            data = bytes
            if bytes == nil { processingError = .photoProcessingFailed }
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings,
                     error: Error?) {
        let result: Result<Data, NativeCaptureError>? = lock.withLock {
            guard !finished else { return nil }
            finished = true
            if error != nil { return .failure(.photoProcessingFailed) }
            if let processingError { return .failure(processingError) }
            guard let data else { return .failure(.photoProcessingFailed) }
            self.data = nil
            return .success(data)
        }
        if let result { completion(result) }
    }

    func cancel() {
        let shouldFinish = lock.withLock {
            guard !finished else { return false }
            finished = true
            data = nil
            return true
        }
        if shouldFinish { completion(.failure(.cancelled)) }
    }
}
