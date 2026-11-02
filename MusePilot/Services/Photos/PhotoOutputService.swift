import Foundation
import CoreImage
import ImageIO
import UniformTypeIdentifiers
@preconcurrency import Photos

struct PhotoAdjustments: Codable, Hashable, Sendable {
    var brightness: Double = 0
    var contrast: Double = 1
    var temperature: Double = 0

    var isOriginal: Bool { brightness == 0 && contrast == 1 && temperature == 0 }
    var outputVersion: String {
        "color-v1-\(brightness.bitPattern)-\(contrast.bitPattern)-\(temperature.bitPattern)"
    }
}

struct RenderedPhoto: Sendable {
    let data: Data
    let fileExtension: String
    let uniformTypeIdentifier: String
}

struct PhotoSaveReceipt: Sendable {
    /// Nil is possible if Photos confirms success without a readable placeholder.
    /// That is still a saved photo, and must never cause another system write.
    let localIdentifier: String?
    let savedAt: Date
}

enum PhotoOutputError: LocalizedError {
    case invalidImage, renderFailed, permissionDenied, previewOnly
    case writeFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidImage: "This photo could not be opened. The original capture is still retained."
        case .renderFailed: "The adjustment could not be prepared. Try again or choose Original."
        case .permissionDenied: "Allow PosePro to add photos in Settings, then try Save again. Your photo is still here."
        case .previewOnly: "Previews do not request permission or save to Photos."
        case .writeFailed(let message): "Photos did not confirm a save. \(message) Your photo is still here."
        }
    }
}

/// Core Image and all encoding stay on this actor, away from the main actor.
/// Only owned bytes cross the boundary; no mutable UIKit/Core Image object does.
private actor PhotoRenderWorker {
    private let context = CIContext(options: [.cacheIntermediates: false])

    func render(_ data: Data, adjustments: PhotoAdjustments) throws -> RenderedPhoto {
        try Task.checkCancellation()
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let sourceType = CGImageSourceGetType(source),
              CGImageSourceGetCount(source) > 0 else { throw PhotoOutputError.invalidImage }

        if adjustments.isOriginal {
            let type = UTType(sourceType as String)
            return RenderedPhoto(data: data, fileExtension: type?.preferredFilenameExtension ?? "jpg",
                                 uniformTypeIdentifier: sourceType as String)
        }

        guard var image = CIImage(data: data, options: [.applyOrientationProperty: true]) else {
            throw PhotoOutputError.invalidImage
        }
        image = image.applyingFilter("CIColorControls", parameters: [
            kCIInputBrightnessKey: adjustments.brightness,
            kCIInputContrastKey: adjustments.contrast,
            kCIInputSaturationKey: 1.0
        ])
        if adjustments.temperature != 0 {
            image = image.applyingFilter("CITemperatureAndTint", parameters: [
                "inputNeutral": CIVector(x: 6500, y: 0),
                "inputTargetNeutral": CIVector(x: CGFloat(6500 + adjustments.temperature * 2000), y: 0)
            ])
        }
        try Task.checkCancellation()
        guard let cgImage = context.createCGImage(image, from: image.extent),
              let buffer = CFDataCreateMutable(nil, 0),
              let destination = CGImageDestinationCreateWithData(buffer, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw PhotoOutputError.renderFailed
        }
        // The extent is the full oriented capture, with no resizing or overlays.
        // Adjusted output is high-quality JPEG, not advertised as lossless.
        CGImageDestinationAddImage(destination, cgImage, [
            kCGImageDestinationLossyCompressionQuality: 0.95
        ] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw PhotoOutputError.renderFailed }
        try Task.checkCancellation()
        return RenderedPhoto(data: buffer as Data, fileExtension: "jpg",
                             uniformTypeIdentifier: UTType.jpeg.identifier)
    }

    func temporaryShareFile(_ photo: RenderedPhoto) throws -> URL {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("PoseProShare", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent(UUID().uuidString).appendingPathExtension(photo.fileExtension)
        try photo.data.write(to: url, options: [.atomic, .completeFileProtection])
        return url
    }
}

/// PhotoKit invokes the change block and completion on framework queues.
/// This narrowly scoped box synchronizes only the resulting identifier string.
private final class PhotoIdentifierBox: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: String?
    func set(_ value: String?) { lock.lock(); defer { lock.unlock() }; stored = value }
    func get() -> String? { lock.lock(); defer { lock.unlock() }; return stored }
}

@MainActor
protocol PhotoOutputProviding: AnyObject {
    func render(_ data: Data, adjustments: PhotoAdjustments) async throws -> RenderedPhoto
    func authorizeSaving() async throws
    func save(_ photo: RenderedPhoto, captureID: UUID, outputVersion: String,
              submissionAllowed: @escaping @MainActor @Sendable () -> Bool) async throws -> PhotoSaveReceipt
    func shareFile(_ photo: RenderedPhoto) async throws -> URL
    func removeShareFile(_ url: URL)
}

@MainActor
final class PhotoOutputService: PhotoOutputProviding {
    private let worker = PhotoRenderWorker()
    private let previewOnly: Bool
    private var pending: [String: Task<PhotoSaveReceipt, Error>] = [:]
    private var completed: [String: PhotoSaveReceipt] = [:]

    init(previewOnly: Bool = false) { self.previewOnly = previewOnly }

    func render(_ data: Data, adjustments: PhotoAdjustments) async throws -> RenderedPhoto {
        try await worker.render(data, adjustments: adjustments)
    }

    func authorizeSaving() async throws {
        guard !previewOnly else { throw PhotoOutputError.previewOnly }
        try Task.checkCancellation()
        let authorization = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        try Task.checkCancellation()
        guard authorization == .authorized || authorization == .limited else {
            throw PhotoOutputError.permissionDenied
        }
    }

    func save(_ photo: RenderedPhoto, captureID: UUID, outputVersion: String,
              submissionAllowed: @escaping @MainActor @Sendable () -> Bool) async throws -> PhotoSaveReceipt {
        guard !previewOnly else { throw PhotoOutputError.previewOnly }
        let key = "\(captureID.uuidString):\(outputVersion)"
        if let receipt = completed[key] { return receipt }
        if let task = pending[key] { return try await task.value }

        // Concurrent callers share the same task. A known failure removes it so
        // the user can retry. A confirmed success remains cached for this process.
        let task = Task { @MainActor in
            // This stage never asks permission. Intent remains cancellable until
            // the final synchronous main-actor callback accepts the submission.
            let authorization = PHPhotoLibrary.authorizationStatus(for: .addOnly)
            guard authorization == .authorized || authorization == .limited else {
                throw PhotoOutputError.permissionDenied
            }
            guard submissionAllowed() else { throw CancellationError() }
            return try await Self.writeToPhotos(photo)
        }
        pending[key] = task
        do {
            let receipt = try await task.value
            completed[key] = receipt
            pending[key] = nil
            return receipt
        } catch {
            pending[key] = nil
            throw error
        }
    }

    private static func writeToPhotos(_ photo: RenderedPhoto) async throws -> PhotoSaveReceipt {
        let identifier = PhotoIdentifierBox()
        return try await withCheckedThrowingContinuation { continuation in
            PHPhotoLibrary.shared().performChanges {
                let request = PHAssetCreationRequest.forAsset()
                let options = PHAssetResourceCreationOptions()
                options.uniformTypeIdentifier = photo.uniformTypeIdentifier
                request.addResource(with: .photo, data: photo.data, options: options)
                identifier.set(request.placeholderForCreatedAsset?.localIdentifier)
            } completionHandler: { success, error in
                if success {
                    continuation.resume(returning: PhotoSaveReceipt(localIdentifier: identifier.get(), savedAt: Date()))
                } else {
                    continuation.resume(throwing: PhotoOutputError.writeFailed(error?.localizedDescription ?? "Please try again."))
                }
            }
        }
    }

    func shareFile(_ photo: RenderedPhoto) async throws -> URL {
        guard !previewOnly else { throw PhotoOutputError.previewOnly }
        return try await worker.temporaryShareFile(photo)
    }

    func removeShareFile(_ url: URL) {
        // Only this service's random, temporary share files may be removed.
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("PoseProShare", isDirectory: true)
        guard url.deletingLastPathComponent().standardizedFileURL == folder.standardizedFileURL else { return }
        try? FileManager.default.removeItem(at: url)
    }
}
