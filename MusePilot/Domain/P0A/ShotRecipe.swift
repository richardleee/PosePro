import Foundation

enum RecipeScene: String, Codable, CaseIterable, Hashable, Identifiable, Sendable {
    case travel
    case outfit
    case everyday

    var id: String { rawValue }

    var title: String {
        switch self {
        case .travel: "Travel"
        case .outfit: "Outfit"
        case .everyday: "Everyday"
        }
    }

    var symbol: String {
        switch self {
        case .travel: "mountain.2"
        case .outfit: "tshirt"
        case .everyday: "cup.and.saucer"
        }
    }
}

enum ShotFraming: String, Codable, CaseIterable, Hashable, Identifiable, Sendable {
    case environment
    case halfBody
    case fullBody
    case detail
    case closeUp

    var id: String { rawValue }

    var title: String {
        switch self {
        case .environment: "Person and place"
        case .halfBody: "Half body"
        case .fullBody: "Full body"
        case .detail: "Detail"
        case .closeUp: "Close portrait"
        }
    }
}

struct ShotGoal: Codable, Hashable, Identifiable, Sendable {
    let id: String
    let title: String
    let framing: ShotFraming
    let cameraTip: String
    let subjectTip: String
    let lightTip: String
    let alternatives: [String]
}

/// Development content is intentionally separate from an approved, publishable content pack.
/// These references have no supplied G0 reproduction evidence or public sample photographs.
struct ShotRecipe: Codable, Hashable, Identifiable, Sendable {
    let id: String
    let version: Int
    let scene: RecipeScene
    let title: String
    let subtitle: String
    let symbol: String
    let goals: [ShotGoal]
    let contentStatus: String
    let publicEvidenceAvailable: Bool

    /// Remains false until a later content release supplies separately reviewed evidence.
    /// Do not infer publication approval from a development recipe being selectable.
    var isPublished: Bool { false }

    static let starterRecipes: [ShotRecipe] = [
        ShotRecipe(
            id: "travel-place",
            version: 1,
            scene: .travel,
            title: "You and the place",
            subtitle: "Keep the place you came for in the photo.",
            symbol: "mountain.2",
            goals: [
                ShotGoal(
                    id: "travel-environment",
                    title: "Person and place",
                    framing: .environment,
                    cameraTip: "Photographer: keep the person and the part of the place they want to remember in view.",
                    subjectTip: "Settle into a comfortable stance. Looking at the camera is optional.",
                    lightTip: "Check the face together. If the light feels harsh, look for nearby shade without losing the view.",
                    alternatives: ["Stay still rather than walking for the camera.", "Include a seat or support if that is more comfortable."]
                ),
                ShotGoal(
                    id: "travel-half-body",
                    title: "A closer moment",
                    framing: .halfBody,
                    cameraTip: "Photographer: choose a closer frame while keeping one useful clue to the location.",
                    subjectTip: "Rest your hands comfortably or hold something you already have.",
                    lightTip: "Ask whether the direction of the light feels comfortable. Avoid asking anyone to face glaring sun.",
                    alternatives: ["Keep a wider frame if moving closer is awkward.", "Hands can remain outside a half-body frame."]
                ),
                ShotGoal(
                    id: "travel-look-around",
                    title: "Notice the view",
                    framing: .environment,
                    cameraTip: "Photographer: leave room around the view your friend is looking at, if that suits their goal.",
                    subjectTip: "Look at something you actually notice. You can keep your head still instead.",
                    lightTip: "Check the preview together before changing position; the app has not measured the best light.",
                    alternatives: ["Look toward the camera if that feels more natural.", "Skip a turn that feels uncomfortable."]
                )
            ],
            contentStatus: "Reference draft · G0 review and real phone examples pending",
            publicEvidenceAvailable: false
        ),
        ShotRecipe(
            id: "outfit-everyday",
            version: 1,
            scene: .outfit,
            title: "Today's outfit",
            subtitle: "Record the clothes and the way you wear them.",
            symbol: "tshirt",
            goals: [
                ShotGoal(
                    id: "outfit-full-body",
                    title: "The whole outfit",
                    framing: .fullBody,
                    cameraTip: "Photographer: include the full outfit, with a little room above the head and below the shoes when they are visible.",
                    subjectTip: "Choose a comfortable standing or seated position. Your body shape does not need correcting.",
                    lightTip: "Check that important fabric details remain visible. Try nearby even light if they are hard to see.",
                    alternatives: ["Use a seated full-outfit frame.", "Choose a closer goal if the space cannot fit the whole outfit."]
                ),
                ShotGoal(
                    id: "outfit-detail",
                    title: "One detail you like",
                    framing: .detail,
                    cameraTip: "Photographer: ask which clothing detail matters and frame that detail deliberately.",
                    subjectTip: "Show a sleeve, bag, texture or accessory, if you like. Keep your hands comfortable.",
                    lightTip: "Check that the detail is readable in the preview; a different angle may avoid a bright reflection.",
                    alternatives: ["Photograph the detail without a face in the frame.", "Keep both hands at rest if showing the detail feels awkward."]
                ),
                ShotGoal(
                    id: "outfit-small-action",
                    title: "A comfortable small action",
                    framing: .halfBody,
                    cameraTip: "Photographer: keep the chosen part of the outfit visible and let the action stay small.",
                    subjectTip: "Adjust a cuff, hold a bag, or simply pause. Choose what feels like you.",
                    lightTip: "Keep the same comfortable light if it is working; changing the pose does not require changing location.",
                    alternatives: ["Rest a hand naturally instead of adjusting clothing.", "Skip movement and take a quiet portrait."]
                )
            ],
            contentStatus: "Reference draft · G0 review and real phone examples pending",
            publicEvidenceAvailable: false
        ),
        ShotRecipe(
            id: "everyday-window",
            version: 1,
            scene: .everyday,
            title: "A quiet everyday moment",
            subtitle: "A café or window-side portrait, kept simple.",
            symbol: "cup.and.saucer",
            goals: [
                ShotGoal(
                    id: "everyday-environment",
                    title: "A little of the setting",
                    framing: .halfBody,
                    cameraTip: "Photographer: include the person and a little of the table or setting they want to remember.",
                    subjectTip: "Settle into a comfortable seat. Your shoulders and hands can stay at rest.",
                    lightTip: "A window is only a starting idea. Check the face and background together before deciding where to sit.",
                    alternatives: ["Use available indoor light if the window is too bright.", "Choose a standing portrait if seating is uncomfortable."]
                ),
                ShotGoal(
                    id: "everyday-hands",
                    title: "Hands and something familiar",
                    framing: .detail,
                    cameraTip: "Photographer: frame a comfortable interaction with a cup, book or another object already there.",
                    subjectTip: "Hold the object as you normally would. You do not need a prop or a precise finger arrangement.",
                    lightTip: "Check for glare on the object. Move the framing slightly if needed, without asking your friend to strain.",
                    alternatives: ["Keep hands resting beside the object.", "Skip the object and choose the quiet portrait goal."]
                ),
                ShotGoal(
                    id: "everyday-close-portrait",
                    title: "A quiet close portrait",
                    framing: .closeUp,
                    cameraTip: "Photographer: start with a comfortable closer frame and check together that it matches the intended portrait.",
                    subjectTip: "Look wherever feels comfortable. A smile is optional.",
                    lightTip: "If the face is hard to see, check the direction of the available light together; this is a reference, not a measured diagnosis.",
                    alternatives: ["Keep a wider frame rather than moving uncomfortably close.", "Let your friend look away or pause between photographs."]
                )
            ],
            contentStatus: "Reference draft · G0 review and real phone examples pending",
            publicEvidenceAvailable: false
        )
    ]
}
