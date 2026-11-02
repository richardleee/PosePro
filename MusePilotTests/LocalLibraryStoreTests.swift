import Foundation
import XCTest
@testable import MusePilot

final class LocalLibraryStoreTests: XCTestCase {
    @MainActor
    func testRepeatedCaptureOutputKeepsOneRowAndOriginalFavorite() async throws {
        let store = LocalLibraryStore(inMemory: true)
        let captureID = UUID()
        let first = makeRecord(captureID: captureID, favorite: true)
        try store.append(first)

        // A repeated completion may construct a fresh row ID; the capture/output identity wins.
        let repeated = makeRecord(captureID: captureID, favorite: false)
        try store.append(repeated)

        XCTAssertEqual(store.records.count, 1)
        XCTAssertEqual(store.records.first?.id, first.id)
        XCTAssertEqual(store.records.first?.favorite, true)
        XCTAssertEqual(store.firstPhotoSavedAt, first.savedAt)
    }

    @MainActor
    func testSameCaptureOutputCannotReplaceItsSystemPhotoReference() async throws {
        let store = LocalLibraryStore(inMemory: true)
        let captureID = UUID()
        let first = makeRecord(captureID: captureID, photoIdentifier: "photos/first")
        try store.append(first)

        let conflicting = makeRecord(captureID: captureID, photoIdentifier: "photos/second")
        XCTAssertThrowsError(try store.append(conflicting)) { error in
            guard let libraryError = error as? LocalLibraryError,
                  case .conflictingPhoto = libraryError else {
                return XCTFail("Expected a conflicting system photo reference, received \(error)")
            }
        }

        XCTAssertEqual(store.records, [first])
        XCTAssertNotNil(store.errorMessage)
    }

    @MainActor
    func testKnownSystemSaveRemainsTrueWhenMetadataCannotBeWritten() async throws {
        let directory = try makeTemporaryDirectory()
        defer { try? FileManager.default.removeItem(at: directory) }

        // A regular file in the directory position is a deterministic filesystem failure.
        let blockedDirectory = directory.appendingPathComponent("blocked", isDirectory: false)
        let sentinel = Data("not a directory".utf8)
        try sentinel.write(to: blockedDirectory)
        let store = LocalLibraryStore(directory: blockedDirectory)
        let record = makeRecord()

        // This call represents the caller's already-confirmed PhotoKit result, not a fake save.
        store.markPhotoSaved(at: record.savedAt)
        XCTAssertThrowsError(try store.append(record))

        XCTAssertEqual(store.firstPhotoSavedAt, record.savedAt)
        XCTAssertTrue(store.records.isEmpty)
        XCTAssertNotNil(store.errorMessage)
        XCTAssertEqual(try Data(contentsOf: blockedDirectory), sentinel)
    }

    @MainActor
    func testCorruptLibraryRefusesOverwriteAndExplicitClearRecovers() async throws {
        let directory = try makeTemporaryDirectory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let file = directory.appendingPathComponent("library-v1.json")
        let corruptBytes = Data("{\"schemaVersion\":1,broken".utf8)
        try corruptBytes.write(to: file)
        let store = LocalLibraryStore(directory: directory)

        XCTAssertNotNil(store.errorMessage)
        XCTAssertTrue(store.records.isEmpty)
        store.toggleBookmark("travel-place")
        XCTAssertFalse(store.bookmarkedRecipeIDs.contains("travel-place"))
        XCTAssertThrowsError(try store.append(makeRecord()))
        XCTAssertEqual(try Data(contentsOf: file), corruptBytes)

        // Clearing is an explicit user action; ordinary saves and bookmarks cannot do this.
        try store.clear()
        XCTAssertNil(store.errorMessage)
        XCTAssertNil(store.firstPhotoSavedAt)
        let newRecord = makeRecord()
        try store.append(newRecord)
        let reloaded = LocalLibraryStore(directory: directory)
        XCTAssertNil(reloaded.errorMessage)
        XCTAssertEqual(reloaded.records, [newRecord])
    }

    @MainActor
    func testPersistenceContainsOnlyMetadataAndSystemPhotoReference() async throws {
        let directory = try makeTemporaryDirectory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = LocalLibraryStore(directory: directory)
        let record = makeRecord()
        try store.append(record)
        store.toggleBookmark("travel-place")

        let file = directory.appendingPathComponent("library-v1.json")
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any]
        )
        XCTAssertEqual(
            Set(object.keys),
            Set(["schemaVersion", "records", "bookmarkedRecipeIDs", "firstPhotoSavedAt"])
        )
        let rows = try XCTUnwrap(object["records"] as? [[String: Any]])
        let row = try XCTUnwrap(rows.first)
        XCTAssertEqual(
            Set(row.keys),
            Set([
                "id", "captureID", "outputVersion", "photoLocalIdentifier", "savedAt",
                "recipeID", "recipeVersion", "goalID", "goalTitle", "favorite"
            ])
        )
        XCTAssertEqual(row["photoLocalIdentifier"] as? String, record.photoLocalIdentifier)
        let files = try FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )
        XCTAssertEqual(files.map(\.lastPathComponent), ["library-v1.json"])

        let reloaded = LocalLibraryStore(directory: directory)
        XCTAssertEqual(reloaded.records, [record])
        XCTAssertEqual(reloaded.bookmarkedRecipeIDs, ["travel-place"])
        XCTAssertEqual(reloaded.firstPhotoSavedAt, record.savedAt)
    }

    @MainActor
    func testExplicitClearAffectsOnlyThisLibraryAndResetsLocalActivation() async throws {
        let directory = try makeTemporaryDirectory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let outsideLibraryFile = directory.appendingPathComponent("keep-this-file.txt")
        let sentinel = Data("unrelated content".utf8)
        try sentinel.write(to: outsideLibraryFile)
        let store = LocalLibraryStore(directory: directory)
        try store.append(makeRecord())
        store.toggleBookmark("outfit-everyday")

        try store.clear()

        XCTAssertTrue(store.records.isEmpty)
        XCTAssertTrue(store.bookmarkedRecipeIDs.isEmpty)
        XCTAssertNil(store.firstPhotoSavedAt)
        XCTAssertEqual(try Data(contentsOf: outsideLibraryFile), sentinel)
        let reloaded = LocalLibraryStore(directory: directory)
        XCTAssertTrue(reloaded.records.isEmpty)
        XCTAssertNil(reloaded.firstPhotoSavedAt)
    }

    private func makeRecord(
        captureID: UUID = UUID(),
        photoIdentifier: String = "photos/test-reference",
        favorite: Bool = false
    ) -> SavedPhotoRecord {
        SavedPhotoRecord(
            captureID: captureID,
            outputVersion: "original-v1",
            photoLocalIdentifier: photoIdentifier,
            savedAt: Date(timeIntervalSince1970: 1_700_000_000),
            recipeID: "travel-place",
            recipeVersion: 1,
            goalID: "travel-environment",
            goalTitle: "Person and place",
            favorite: favorite
        )
    }

    private func makeTemporaryDirectory() throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("PoseProLibraryTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }
}
