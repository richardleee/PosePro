import XCTest
@testable import MusePilot

final class GuidancePolicyTests: XCTestCase {
    private func signals(count: Int = 1, x: Double? = 0.1, confidence: Double = 0.9,
                         age: Double = 0, supported: Bool = true, centered: Bool = true) -> GuidanceSignals {
        .init(bodyCount: count, shoulderMidX: x, shoulderConfidence: confidence, age: age, supportedRearHandheld: supported, centeredCompositionRequested: centered)
    }

    func testNoAutomaticRulesShipWithoutValidation() {
        XCTAssertTrue(GuidancePolicy.validatedAutomaticRules.isEmpty)
        XCTAssertEqual(GuidancePolicy.suggestion(signals: signals(), researchEnabled: false, paused: false,
                                                 skipped: false, reference: "Keep the place").kind, .reference)
    }

    func testPausedAndSkippedNeverIssueDynamicAdvice() {
        for (paused, skipped) in [(true, false), (false, true), (true, true)] {
            let result = GuidancePolicy.suggestion(signals: signals(), researchEnabled: true, paused: paused,
                                                   skipped: skipped, reference: "Written reference")
            XCTAssertEqual(result.kind, .reference)
            XCTAssertEqual(result.message, "Written reference")
        }
    }

    func testInvalidEvidenceWithdrawsConclusion() {
        let invalid: [GuidanceSignals] = [
            signals(count: 0), signals(count: 2), signals(x: nil), signals(x: .nan),
            signals(x: -0.1), signals(confidence: 0.1), signals(age: 2), signals(age: -1)
        ]
        for input in invalid {
            let result = GuidancePolicy.suggestion(signals: input, researchEnabled: true, paused: false,
                                                   skipped: false, reference: "Reference")
            XCTAssertEqual(result.kind, .unavailable)
        }
    }

    func testUnsupportedModeStaysReferenceOnly() {
        let result = GuidancePolicy.suggestion(signals: signals(supported: false), researchEnabled: true,
                                               paused: false, skipped: false, reference: "Reference")
        XCTAssertEqual(result.kind, .reference)
        XCTAssertEqual(GuidancePolicy.suggestion(signals: signals(centered: false), researchEnabled: true,
                                                 paused: false, skipped: false, reference: "Keep the place").kind, .reference)
    }

    func testResearchSuggestionIsExplicitlyAddressedAndNeverScoresPhoto() {
        let result = GuidancePolicy.suggestion(signals: signals(), researchEnabled: true, paused: false,
                                               skipped: false, reference: "Reference")
        XCTAssertEqual(result.kind, .research)
        XCTAssertTrue(result.message.hasPrefix("Photographer:"))
        XCTAssertEqual(GuidancePolicy.suggestion(signals: signals(x: 0.5), researchEnabled: true,
                                                 paused: false, skipped: false, reference: "Reference").kind, .reference)
    }
}
