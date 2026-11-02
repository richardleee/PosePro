import SwiftUI
import Observation

struct ResultState { let plan: ShotPlan }
enum ResultAction { case keepTapped, favoriteTapped, retakeTapped, discardTapped }
@MainActor @Observable final class ResultViewModel {
    let state: ResultState
    private let router: NavigationCoordinator
    init(plan: ShotPlan, router: NavigationCoordinator) { state = .init(plan: plan); self.router = router }

    func send(_ action: ResultAction) {
        switch action {
        case .retakeTapped: router.push(.camera(state.plan))
        case .keepTapped, .favoriteTapped, .discardTapped: router.popToRoot()
        }
    }
    static var preview: ResultViewModel { .init(plan: ShotPlan(scene: .cafe, look: .natural), router: NavigationCoordinator()) }
}

struct ResultView: View {
    @State var viewModel: ResultViewModel
    var body: some View {
        VStack(spacing: MPSpacing.l) {
            Spacer()
            RoundedRectangle(cornerRadius: MPRadius.card)
                .fill(MPColor.surface)
                .overlay {
                    VStack(spacing: MPSpacing.m) {
                        Image(systemName: "photo").font(MPTypography.resultGlyph).foregroundStyle(MPColor.accent)
                        Text("Your photo preview").font(MPTypography.heading)
                        Text("Your photo is saved directly to System Photos.").font(MPTypography.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    }.padding(MPSpacing.xl)
                }
                .frame(height: 340)
            HStack(spacing: MPSpacing.s) {
                MPButton(title: "Retake", style: .secondary) { viewModel.send(.retakeTapped) }
                MPButton(title: "Keep") { viewModel.send(.keepTapped) }
            }
            HStack(spacing: MPSpacing.s) {
                MPButton(title: "Favorite", style: .secondary) { viewModel.send(.favoriteTapped) }
                MPButton(title: "Discard", style: .secondary) { viewModel.send(.discardTapped) }
            }
            Spacer()
        }
        .padding(MPSpacing.l).background(MPColor.background.ignoresSafeArea())
        .navigationTitle("Your result")
    }
}
#Preview { NavigationStack { ResultView(viewModel: .preview) } }
