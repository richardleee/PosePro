import Foundation

/// A research candidate, never a claim that a user's pose or photo is correct.
struct GuidanceSuggestion: Equatable, Sendable {
    enum Kind: Equatable, Sendable { case reference, unavailable, research }
    let kind: Kind
    let title: String
    let message: String
}

struct GuidanceSignals: Sendable {
    let bodyCount: Int
    let shoulderMidX: Double?
    let shoulderConfidence: Double
    let age: TimeInterval
    let supportedRearHandheld: Bool
    let centeredCompositionRequested: Bool
}

struct GuidancePolicy {
    /// G1 is not complete. Production never enables experimental automatic rules.
    static let validatedAutomaticRules: Set<String> = []
    static let candidateRuleVersion = "subject-position-research-0.1"

    static func suggestion(
        signals: GuidanceSignals,
        researchEnabled: Bool,
        paused: Bool,
        skipped: Bool,
        reference: String
    ) -> GuidanceSuggestion {
        if paused {
            return .init(kind: .reference, title: "Guidance paused", message: reference)
        }
        guard researchEnabled, !skipped else {
            return .init(kind: .reference, title: "For the photographer", message: reference)
        }
        guard signals.supportedRearHandheld, signals.centeredCompositionRequested else {
            return .init(kind: .reference, title: "Reference guide", message: reference)
        }
        guard signals.age >= 0, signals.age < 1.5, signals.bodyCount == 1,
              signals.shoulderConfidence >= 0.65,
              let x = signals.shoulderMidX, x.isFinite, (0...1).contains(x) else {
            return .init(kind: .unavailable, title: "Can't judge this frame", message: "Keep using the reference, or take the photo whenever you like.")
        }
        // Deliberately describes position in the image, not ambiguous physical left/right.
        if x < 0.32 || x > 0.68 {
            return .init(kind: .research, title: "Research hint · framing", message: "Photographer: bring the person closer to the middle of the picture, if that suits your chosen view.")
        }
        return .init(kind: .reference, title: "Your choice", message: reference)
    }
}
