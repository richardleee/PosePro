@preconcurrency import AVFoundation
import SwiftUI
import UIKit

/// A portrait, aspect-fit live preview. It never requests authorization or starts
/// the session. Aspect fit avoids hiding pixels that the rule engine can observe.
@MainActor
struct NativeCameraPreview: UIViewRepresentable {
    let service: NativeCameraService

    func makeUIView(context: Context) -> NativePreviewSurface {
        let view = NativePreviewSurface()
        view.isAccessibilityElement = false
        view.previewLayer.videoGravity = .resizeAspect
        return view
    }

    func updateUIView(_ view: NativePreviewSurface, context: Context) {
        let session = service.previewSource?.session
        if view.previewLayer.session !== session { view.previewLayer.session = session }
        if let connection = view.previewLayer.connection {
            if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
            if connection.isVideoMirroringSupported {
                connection.automaticallyAdjustsVideoMirroring = false
                connection.isVideoMirrored = service.lens == .front
            }
        }
    }

    static func dismantleUIView(_ view: NativePreviewSurface, coordinator: ()) {
        view.previewLayer.session = nil
    }
}

final class NativePreviewSurface: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}
