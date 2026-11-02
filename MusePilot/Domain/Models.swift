import Foundation

enum SceneType: String, CaseIterable, Hashable, Identifiable {
    case cafe = "Cafe", outfit = "Outfit", travel = "Travel", dating = "Dating", professional = "Professional"
    var id: String { rawValue }

    var isProfile: Bool { self == .dating || self == .professional }
    var isProOnly: Bool { self == .dating || self == .professional }
    var framing: String { self == .dating || self == .professional ? "Close-up portrait" : "Half-body portrait" }
}

enum ShootMode: String, CaseIterable, Hashable, Identifiable {
    case inFrame = "I'm in Frame"
    case shooting = "I'm Shooting"
    var id: String { rawValue }
    var subtitle: String {
        return switch self {
        case .inFrame: "Self-shoot · mirrored front camera"
        case .shooting: "Helping someone · rear camera"
        }
    }
}

enum LookType: String, CaseIterable, Hashable, Identifiable {
    case natural = "Natural", editorial = "Editorial", candid = "Candid"
    var id: String { rawValue }
}

struct ShotPlan: Hashable, Identifiable {
    let id: UUID
    let scene: SceneType
    let look: LookType
    let mode: ShootMode
    let framing: String
    let cameraHeight: String
    let distance: String
    let orientation: String
    let actions: [String]
    let avoid: [String]

    init(id: UUID = UUID(), scene: SceneType, look: LookType, mode: ShootMode = .inFrame) {
        self.id = id
        self.scene = scene
        self.look = look
        self.mode = mode
        self.framing = scene.framing
        self.cameraHeight = scene == .dating || scene == .professional ? "Eye level" : "Eye level or slightly above"
        self.distance = scene == .dating || scene == .professional ? "Close" : "Medium"
        self.orientation = "Portrait"
        self.actions = ["Turn your body slightly", "Relax your shoulders", "Let one hand do something"]
        self.avoid = ["Low angle", "Wide-angle on face"]
    }
}

struct SessionSummary: Identifiable {
    let id: UUID
    let scene: SceneType
    let look: LookType
    let date: Date
    var isFavorite: Bool
}
