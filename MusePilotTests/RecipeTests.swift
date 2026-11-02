import XCTest
@testable import MusePilot

final class RecipeTests: XCTestCase {
    func testStarterCatalogHasThreeScenesAndNineUniqueGoals() {
        let recipes = ShotRecipe.starterRecipes
        XCTAssertEqual(recipes.count, 3)
        XCTAssertEqual(Set(recipes.map(\.scene)), Set(RecipeScene.allCases))
        XCTAssertEqual(Set(recipes.map(\.id)).count, recipes.count)

        let goals = recipes.flatMap(\.goals)
        XCTAssertEqual(goals.count, 9)
        XCTAssertEqual(Set(goals.map(\.id)).count, goals.count)
        for recipe in recipes {
            XCTAssertEqual(recipe.goals.count, 3, "\(recipe.id) must contain three goals")
        }
    }

    func testDraftCatalogDoesNotClaimPublicationOrRealReproductionEvidence() {
        for recipe in ShotRecipe.starterRecipes {
            XCTAssertFalse(recipe.isPublished, "\(recipe.id) has not passed the content gate")
            XCTAssertFalse(recipe.publicEvidenceAvailable, "No real sample assets have been supplied")
            XCTAssertTrue(recipe.contentStatus.localizedCaseInsensitiveContains("draft"))
            XCTAssertTrue(recipe.contentStatus.contains("G0"))
        }
    }

    func testSubjectTipsDoNotAskThePhotographerToPose() {
        for goal in ShotRecipe.starterRecipes.flatMap(\.goals) {
            let subjectTip = goal.subjectTip.lowercased()
            XCTAssertFalse(subjectTip.contains("ask your friend"), goal.id)
            XCTAssertFalse(subjectTip.contains("invite your friend"), goal.id)
            XCTAssertFalse(subjectTip.contains("their shoulders"), goal.id)
            XCTAssertFalse(subjectTip.contains("their hands"), goal.id)
            XCTAssertFalse(subjectTip.isEmpty, goal.id)
        }
    }

    func testEachGoalSeparatesPhotographerAdviceAndComfortableAlternatives() {
        for goal in ShotRecipe.starterRecipes.flatMap(\.goals) {
            XCTAssertTrue(goal.cameraTip.hasPrefix("Photographer:"), goal.id)
            XCTAssertFalse(goal.lightTip.isEmpty, goal.id)
            XCTAssertFalse(goal.alternatives.isEmpty, goal.id)
            XCTAssertTrue(goal.alternatives.allSatisfy { !$0.isEmpty }, goal.id)
        }
    }
}
