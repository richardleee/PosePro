@preconcurrency import AVFoundation
import Foundation
import ImageIO
@preconcurrency import Vision

/// Only this serial sample-buffer delegate runs Vision. Pixels/points never leave
/// the process. The lock protects context invalidation from UI/session queues;
/// request execution and throttling are confined to the analysis delegate queue.
final class NativePoseFrameProcessor: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, @unchecked Sendable {
    private struct Context: Equatable {
        var generation = UUID()
        var intent: UUID?
        var enabled = false
        var portraitBuffers = false
    }

    private let lock = NSLock()
    private var context = Context()
    private let continuation: AsyncStream<NativeCaptureEvent>.Continuation
    private var lastAnalysisTime: TimeInterval = 0
    private let minimumInterval: TimeInterval = 0.25

    var generation: UUID { lock.withLock { context.generation } }

    init(continuation: AsyncStream<NativeCaptureEvent>.Continuation) {
        self.continuation = continuation
        super.init()
    }

    func setEnabled(_ enabled: Bool) {
        lock.withLock {
            context.enabled = enabled
            context.generation = UUID()
        }
    }

    func setContext(intent: UUID, portraitBuffers: Bool) {
        lock.withLock {
            context.intent = intent
            context.portraitBuffers = portraitBuffers
            context.generation = UUID()
        }
    }

    func invalidateContext() {
        lock.withLock {
            context.intent = nil
            context.generation = UUID()
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {
        let current = lock.withLock { context }
        guard current.enabled, let intent = current.intent else { return }
        let time = ProcessInfo.processInfo.systemUptime
        guard time - lastAnalysisTime >= minimumInterval else { return }
        lastAnalysisTime = time

        guard current.portraitBuffers else {
            publish(bodyCount: 0, joints: [:], reason: "This camera transform has not been verified. Use the reference.",
                    current: current, intent: intent)
            return
        }

        autoreleasepool {
            do {
                let request = VNDetectHumanBodyPoseRequest()
                request.revision = VNDetectHumanBodyPoseRequestRevision1
                // AVFoundation already rotated the physical buffer into portrait
                // and mirrored front-camera buffers to match the preview.
                let handler = VNImageRequestHandler(cmSampleBuffer: sampleBuffer, orientation: .up)
                try handler.perform([request])
                let observations = request.results ?? []
                guard observations.count == 1, let person = observations.first else {
                    publish(bodyCount: observations.count, joints: [:],
                            reason: observations.isEmpty ? "No single person can be observed. You can still take a photo."
                                : "More than one person is visible. Use the reference and take a photo when ready.",
                            current: current, intent: intent)
                    return
                }
                let points = try person.recognizedPoints(.all)
                var mapped: [String: NativeBodyPoint] = [:]
                for (name, joint) in Self.jointNames {
                    guard let point = points[joint], point.confidence > 0,
                          point.location.x.isFinite, point.location.y.isFinite else { continue }
                    mapped[name] = NativeBodyPoint(
                        x: Double(point.location.x), y: 1 - Double(point.location.y),
                        confidence: Double(point.confidence))
                }
                publish(bodyCount: 1, joints: mapped,
                        reason: mapped.isEmpty ? "Body landmarks are not clear. Use the reference." : nil,
                        current: current, intent: intent)
            } catch {
                publish(bodyCount: 0, joints: [:], reason: "Guidance cannot observe this frame. Manual capture is available.",
                        current: current, intent: intent)
            }
        }
    }

    private func publish(bodyCount: Int, joints: [String: NativeBodyPoint], reason: String?,
                         current: Context, intent: UUID) {
        // A completed request cannot publish after pause, stop, or a lens change.
        guard lock.withLock({ context == current && context.enabled }) else { return }
        continuation.yield(.observation(NativeBodyObservation(
            generation: current.generation, bodyCount: bodyCount, joints: joints, reason: reason), intent: intent))
    }

    private static let jointNames: [(String, VNHumanBodyPoseObservation.JointName)] = [
        ("nose", .nose), ("neck", .neck), ("root", .root),
        ("leftShoulder", .leftShoulder), ("rightShoulder", .rightShoulder),
        ("leftElbow", .leftElbow), ("rightElbow", .rightElbow),
        ("leftWrist", .leftWrist), ("rightWrist", .rightWrist),
        ("leftHip", .leftHip), ("rightHip", .rightHip),
        ("leftKnee", .leftKnee), ("rightKnee", .rightKnee),
        ("leftAnkle", .leftAnkle), ("rightAnkle", .rightAnkle)
    ]
}
