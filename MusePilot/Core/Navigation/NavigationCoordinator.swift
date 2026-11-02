import Foundation
import Observation

@MainActor
@Observable
final class NavigationCoordinator {
    var path: [Route] = []

    func push(_ route: Route) { path.append(route) }
    func pop() { guard !path.isEmpty else { return }; path.removeLast() }
    func popToRoot() { path.removeAll() }
}
