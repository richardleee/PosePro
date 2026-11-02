import SwiftUI
import Observation

struct PrivacyState { }
enum PrivacyAction { case dismiss }
@MainActor @Observable final class PrivacyViewModel {
    var state = PrivacyState()
    private let router: NavigationCoordinator
    init(router: NavigationCoordinator) { self.router = router }
    func send(_ action: PrivacyAction) { router.pop() }
    static var preview: PrivacyViewModel { .init(router: NavigationCoordinator()) }
}

struct PrivacyView: View {
    @State var viewModel: PrivacyViewModel
    var body: some View {
        List {
            Section {
                Label("Processed on this iPhone", systemImage: "iphone")
                    .font(MPTypography.heading)
                Text("Video frames, pose landmarks and face-feature data are processed in memory on your device. They are never uploaded to MusePilot servers.")
                    .foregroundStyle(.secondary)
            }
            Section("Your photos") {
                Text("Finished photos are saved directly to System Photos. MusePilot does not keep image copies in its app storage or on a server.")
                Text("Session thumbnails use a Photos reference. If you decline thumbnail access, your session still shows its scene, look and date.")
            }
            Section("Your controls") {
                Text("Text guidance is always visible. Voice and pose outline start off and can be turned on at any time.")
                Text("Pause stops all pose guidance until you resume.")
            }
        }
        .scrollContentBackground(.hidden).background(MPColor.background)
        .navigationTitle("Privacy")
    }
}
#Preview { NavigationStack { PrivacyView(viewModel: .preview) } }

struct CameraPrivacyState { let plan: ShotPlan }
enum CameraPrivacyAction { case continueTapped }
@MainActor @Observable final class CameraPrivacyViewModel {
    let state: CameraPrivacyState
    private let router: NavigationCoordinator
    init(plan: ShotPlan, router: NavigationCoordinator) { state = .init(plan: plan); self.router = router }
    func send(_ action: CameraPrivacyAction) {
        if case .continueTapped = action { router.push(.camera(state.plan)) }
    }
    static var preview: CameraPrivacyViewModel {
        .init(plan: ShotPlan(scene: .cafe, look: .natural), router: NavigationCoordinator())
    }
}
struct CameraPrivacyView: View {
    @State var viewModel: CameraPrivacyViewModel
    var body: some View {
        VStack(alignment: .leading, spacing: MPSpacing.l) {
            Spacer()
            Image(systemName: "lock.shield").font(MPTypography.privacyGlyph).foregroundStyle(MPColor.accent)
            Text("Your camera stays on your device.").font(MPTypography.title)
            Text("Video frames and pose landmarks are processed in memory on this iPhone. MusePilot never uploads them.")
                .font(MPTypography.body).foregroundStyle(.secondary)
            MPCard(title: "Your plan is ready") {
                Text("\(viewModel.state.plan.scene.rawValue) · \(viewModel.state.plan.look.rawValue) · \(viewModel.state.plan.mode.rawValue)")
            }
            MPButton(title: "Continue") { viewModel.send(.continueTapped) }
            Text("You can still read your plan if you don't allow camera access.")
                .font(MPTypography.caption).foregroundStyle(.secondary)
            Spacer()
        }.padding(MPSpacing.xl).background(MPColor.background).navigationTitle("Camera privacy")
    }
}
#Preview { NavigationStack { CameraPrivacyView(viewModel: .preview) } }
