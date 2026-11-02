import SwiftUI
import Observation

struct ShotPlanState { var plan: ShotPlan }
enum ShotPlanAction { case selectMode(ShootMode), startTapped }

@MainActor @Observable final class ShotPlanViewModel {
    var state: ShotPlanState
    private let router: NavigationCoordinator
    init(plan: ShotPlan, router: NavigationCoordinator) { state = .init(plan: plan); self.router = router }

    func send(_ action: ShotPlanAction) {
        switch action {
        case .selectMode(let mode): state.plan = ShotPlan(scene: state.plan.scene, look: state.plan.look, mode: mode)
        case .startTapped: router.push(.cameraPrivacy(state.plan))
        }
    }
    static var preview: ShotPlanViewModel { .init(plan: ShotPlan(scene: .cafe, look: .natural), router: NavigationCoordinator()) }
}

struct ShotPlanView: View {
    @State var viewModel: ShotPlanViewModel
    var body: some View {
        let plan = viewModel.state.plan
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.l) {
                Text("Your shot plan").font(MPTypography.title)
                HStack { MPBadge(title: plan.scene.rawValue); MPBadge(title: plan.look.rawValue) }
                MPCard(title: "Who is holding the phone?") {
                    ForEach(ShootMode.allCases) { mode in
                        Button { viewModel.send(.selectMode(mode)) } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: MPSpacing.xs) {
                                    Text(mode.rawValue).font(MPTypography.body.weight(.semibold))
                                    Text(mode.subtitle).font(MPTypography.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if plan.mode == mode { Image(systemName: "checkmark.circle.fill").foregroundStyle(MPColor.accent) }
                            }.padding(MPSpacing.s)
                        }.buttonStyle(.plain).foregroundStyle(MPColor.ink)
                    }
                }
                MPCard(title: "You") { Text(plan.framing); ForEach(plan.actions, id: \.self) { Text("• \($0)") } }
                MPCard(title: "Phone") { Text("\(plan.cameraHeight) · \(plan.distance) distance · \(plan.orientation)") }
                MPCard(title: "Avoid") { ForEach(plan.avoid, id: \.self) { Text($0) } }
                MPButton(title: "Start coaching") { viewModel.send(.startTapped) }
            }.padding(MPSpacing.l)
        }.background(MPColor.background).navigationTitle("Shot Plan")
    }
}
#Preview { NavigationStack { ShotPlanView(viewModel: .preview) } }
