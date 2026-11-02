import Foundation

enum Route: Hashable {
    case shotPlan(ShotPlan)
    case camera(ShotPlan)
    case cameraPrivacy(ShotPlan)
    case result(ShotPlan)
    case settings
    case privacy
    case purchase
}
