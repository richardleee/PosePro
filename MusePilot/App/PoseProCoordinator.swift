import Foundation
import Observation

enum PoseProTab: String, CaseIterable, Identifiable {
    case camera, templates, me
    var id: String { rawValue }
}

enum PoseProRoute: Hashable {
    case recipe(String)
    case privacy
    case settings
}

@MainActor @Observable
final class PoseProCoordinator {
    private(set) var tab: PoseProTab = .camera
    var templatePath: [PoseProRoute] = []
    var mePath: [PoseProRoute] = []

    func select(_ tab: PoseProTab) { self.tab = tab }
    func push(_ route: PoseProRoute, in tab: PoseProTab) {
        self.tab = tab
        switch tab {
        case .templates: templatePath.append(route)
        case .me: mePath.append(route)
        case .camera: break
        }
    }
    func popToRoot(in tab: PoseProTab) {
        switch tab {
        case .templates: templatePath.removeAll()
        case .me: mePath.removeAll()
        case .camera: break
        }
    }
}
