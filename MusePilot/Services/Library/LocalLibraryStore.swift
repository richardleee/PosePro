import Foundation
import Observation

/// Contains metadata and a system Photos identifier, never captured image bytes or landmarks.
struct SavedPhotoRecord: Codable, Hashable, Identifiable, Sendable {
    let id: UUID
    let captureID: UUID
    let outputVersion: String
    let photoLocalIdentifier: String
    let savedAt: Date
    let recipeID: String?
    let recipeVersion: Int?
    let goalID: String?
    let goalTitle: String?
    var favorite: Bool

    init(
        id: UUID = UUID(),
        captureID: UUID,
        outputVersion: String,
        photoLocalIdentifier: String,
        savedAt: Date = Date(),
        recipeID: String? = nil,
        recipeVersion: Int? = nil,
        goalID: String? = nil,
        goalTitle: String? = nil,
        favorite: Bool = false
    ) {
        self.id = id
        self.captureID = captureID
        self.outputVersion = outputVersion
        self.photoLocalIdentifier = photoLocalIdentifier
        self.savedAt = savedAt
        self.recipeID = recipeID
        self.recipeVersion = recipeVersion
        self.goalID = goalID
        self.goalTitle = goalTitle
        self.favorite = favorite
    }

    fileprivate var outputKey: String { "\(captureID.uuidString)/\(outputVersion)" }
}

enum LocalLibraryError: LocalizedError {
    case unavailable
    case unreadable
    case unsupportedVersion
    case invalidRecord
    case conflictingPhoto
    case recordNotFound

    var errorDescription: String? {
        switch self {
        case .unavailable:
            "Local records are unavailable. Photos already saved in Photos are unaffected."
        case .unreadable:
            "Local records could not be read. Retry loading, or explicitly clear local records to start again. Your Photos are unaffected."
        case .unsupportedVersion:
            "These local records use an unsupported version. They have not been overwritten."
        case .invalidRecord:
            "The local photo record is incomplete or duplicated. Your saved photo is unaffected."
        case .conflictingPhoto:
            "This capture already has a different saved photo reference. Check Photos before trying again."
        case .recordNotFound:
            "This local photo record is no longer available."
        }
    }
}

/// Main-actor serialization prevents concurrent metadata commits and makes append idempotent.
/// The photo pipeline must confirm PhotoKit success before calling markPhotoSaved or append.
@MainActor
@Observable
final class LocalLibraryStore {
    private(set) var records: [SavedPhotoRecord] = []
    private(set) var bookmarkedRecipeIDs: Set<String> = []
    private(set) var firstPhotoSavedAt: Date?
    private(set) var errorMessage: String?

    @ObservationIgnored private let inMemory: Bool
    @ObservationIgnored private let fileURL: URL?
    @ObservationIgnored private var ordinaryWritesAllowed = true

    private struct Snapshot: Codable {
        var schemaVersion = 1
        var records: [SavedPhotoRecord]
        var bookmarkedRecipeIDs: Set<String>
        var firstPhotoSavedAt: Date?
    }

    init(inMemory: Bool = false, directory: URL? = nil) {
        self.inMemory = inMemory
        if inMemory {
            self.fileURL = nil
        } else if let directory {
            self.fileURL = directory.appendingPathComponent("library-v1.json", isDirectory: false)
        } else {
            self.fileURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
                .first?
                .appendingPathComponent("PoseProP0A", isDirectory: true)
                .appendingPathComponent("library-v1.json", isDirectory: false)
        }
        reload()
    }

    func reload() {
        guard !inMemory else { return }
        guard let fileURL else {
            ordinaryWritesAllowed = false
            errorMessage = LocalLibraryError.unavailable.localizedDescription
            return
        }

        do {
            let data: Data
            do {
                data = try Data(contentsOf: fileURL)
            } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
                records = []
                bookmarkedRecipeIDs = []
                // Preserve a known save from this process even if the record file was never written.
                ordinaryWritesAllowed = true
                errorMessage = nil
                return
            }
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let snapshot = try decoder.decode(Snapshot.self, from: data)
            guard snapshot.schemaVersion == 1 else { throw LocalLibraryError.unsupportedVersion }
            try validate(snapshot)
            records = snapshot.records.sorted { $0.savedAt > $1.savedAt }
            bookmarkedRecipeIDs = snapshot.bookmarkedRecipeIDs
            if let savedAt = snapshot.firstPhotoSavedAt {
                firstPhotoSavedAt = min(firstPhotoSavedAt ?? savedAt, savedAt)
            }
            ordinaryWritesAllowed = true
            errorMessage = nil
        } catch {
            // Preserve current memory and the unreadable file; never silently overwrite either.
            ordinaryWritesAllowed = false
            errorMessage = (error as? LocalLibraryError ?? .unreadable).localizedDescription
        }
    }

    /// Does not imply consent to diagnostics, task satisfaction or any cloud event.
    /// A known system save remains true in memory if recording it on disk fails.
    func markPhotoSaved(at date: Date) {
        guard firstPhotoSavedAt == nil || date < firstPhotoSavedAt! else { return }
        firstPhotoSavedAt = date
        do {
            try persist(currentSnapshot())
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func append(_ record: SavedPhotoRecord) throws {
        if firstPhotoSavedAt == nil || record.savedAt < firstPhotoSavedAt! {
            firstPhotoSavedAt = record.savedAt
        }
        do {
            if let existing = records.first(where: { $0.outputKey == record.outputKey }) {
                guard existing.photoLocalIdentifier == record.photoLocalIdentifier else {
                    throw LocalLibraryError.conflictingPhoto
                }
                // Duplicate completion or retry: do not overwrite an existing favorite or row ID.
                errorMessage = nil
                return
            }
            var snapshot = currentSnapshot()
            snapshot.records.append(record)
            snapshot.records.sort { $0.savedAt > $1.savedAt }
            try validate(snapshot)
            try persist(snapshot)
            records = snapshot.records
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    func toggleBookmark(_ recipeID: String) {
        guard !recipeID.isEmpty else { return }
        var snapshot = currentSnapshot()
        if snapshot.bookmarkedRecipeIDs.contains(recipeID) {
            snapshot.bookmarkedRecipeIDs.remove(recipeID)
        } else {
            snapshot.bookmarkedRecipeIDs.insert(recipeID)
        }
        do {
            try persist(snapshot)
            bookmarkedRecipeIDs = snapshot.bookmarkedRecipeIDs
            errorMessage = nil
        } catch {
            // Do not show a successful bookmark when persistence failed.
            errorMessage = error.localizedDescription
        }
    }

    func setFavorite(recordID: UUID, isFavorite: Bool) throws {
        do {
            var snapshot = currentSnapshot()
            guard let index = snapshot.records.firstIndex(where: { $0.id == recordID }) else {
                throw LocalLibraryError.recordNotFound
            }
            snapshot.records[index].favorite = isFavorite
            try persist(snapshot)
            records = snapshot.records
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Call only after explicit user confirmation. This also recovers an unreadable metadata file.
    /// It neither deletes system Photos nor changes permissions, subscriptions or consent.
    func clear() throws {
        let empty = Snapshot(records: [], bookmarkedRecipeIDs: [], firstPhotoSavedAt: nil)
        do {
            try persist(empty, allowRecovery: true)
            records = []
            bookmarkedRecipeIDs = []
            firstPhotoSavedAt = nil
            ordinaryWritesAllowed = true
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    func dismissError() { errorMessage = nil }

    private func currentSnapshot() -> Snapshot {
        Snapshot(
            records: records,
            bookmarkedRecipeIDs: bookmarkedRecipeIDs,
            firstPhotoSavedAt: firstPhotoSavedAt
        )
    }

    private func validate(_ snapshot: Snapshot) throws {
        guard Set(snapshot.records.map(\.id)).count == snapshot.records.count,
              Set(snapshot.records.map(\.outputKey)).count == snapshot.records.count,
              snapshot.records.allSatisfy({ !$0.outputVersion.isEmpty && !$0.photoLocalIdentifier.isEmpty }),
              snapshot.bookmarkedRecipeIDs.allSatisfy({ !$0.isEmpty }) else {
            throw LocalLibraryError.invalidRecord
        }
    }

    private func persist(_ snapshot: Snapshot, allowRecovery: Bool = false) throws {
        guard ordinaryWritesAllowed || allowRecovery else { throw LocalLibraryError.unreadable }
        guard !inMemory else { return }
        guard let fileURL else { throw LocalLibraryError.unavailable }

        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        #if os(iOS)
        try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: directory.path
        )
        #endif
        try excludeFromBackup(directory)

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(snapshot)
        #if os(iOS)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try data.write(to: fileURL, options: .atomic)
        #endif
        // Atomic replacement creates a new file, so apply the exclusion after every write too.
        try excludeFromBackup(fileURL)
    }

    private func excludeFromBackup(_ url: URL) throws {
        var mutableURL = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try mutableURL.setResourceValues(values)
    }
}
