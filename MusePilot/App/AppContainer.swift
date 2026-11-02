import Foundation
import Observation

@MainActor
@Observable
final class AppContainer {
    let router = NavigationCoordinator()
    let styleService: StyleServiceProtocol
    let navigation: PoseProCoordinator
    let library: LocalLibraryStore
    let camera: NativeCameraService
    let photoOutput: PhotoOutputService
    let capture: CaptureViewModel

    init(styleService: StyleServiceProtocol = MockStyleService(), previewOnly: Bool = false) {
        self.styleService = styleService
        navigation = PoseProCoordinator()
        library = LocalLibraryStore(inMemory: previewOnly)
        camera = NativeCameraService(previewOnly: previewOnly)
        photoOutput = PhotoOutputService(previewOnly: previewOnly)
        capture = CaptureViewModel(camera: camera, library: library, output: photoOutput)
    }
}
