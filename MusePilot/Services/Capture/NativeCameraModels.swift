import Foundation

enum NativeLens: String, CaseIterable, Identifiable, Sendable {
    case rear, front
    var id: String { rawValue }
    var title: String { self == .rear ? "Rear" : "Front" }
}

enum NativeCameraStatus: Equatable, Sendable {
    case idle
    case requesting
    case ready
    case denied
    case unavailable(String)
    case capturing
}

struct NativeBodyPoint: Equatable, Sendable {
    /// Normalized portrait preview coordinates: origin at the top left.
    let x: Double
    let y: Double
    let confidence: Double
}

struct NativeBodyObservation: Equatable, Sendable {
    let timestamp: Date
    /// Changes when analysis stops, restarts, or its camera context changes.
    let generation: UUID
    let bodyCount: Int
    let joints: [String: NativeBodyPoint]
    let reason: String?

    init(timestamp: Date = Date(), generation: UUID = UUID(), bodyCount: Int,
         joints: [String: NativeBodyPoint] = [:], reason: String? = nil) {
        self.timestamp = timestamp
        self.generation = generation
        self.bodyCount = bodyCount
        self.joints = joints
        self.reason = reason
    }
}

enum NativeCaptureError: LocalizedError, Sendable {
    case notReady
    case cancelled
    case unavailable(String)
    case photoProcessingFailed

    var errorDescription: String? {
        switch self {
        case .notReady: "The camera is not ready. Enable it and try again."
        case .cancelled: "This camera request was cancelled."
        case .unavailable(let message): message
        case .photoProcessingFailed: "The photo could not be processed. Please try again."
        }
    }
}
