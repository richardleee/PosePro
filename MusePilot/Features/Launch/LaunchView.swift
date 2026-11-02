import SwiftUI
import Observation

struct LaunchState {
    var scene: SceneType = .cafe
    var look: LookType = .natural
    var mode: ShootMode = .inFrame
    var currentPlan: ShotPlan { ShotPlan(scene: scene, look: look, mode: mode) }
}

enum LaunchAction {
    case selectScene(SceneType)
    case selectLook(LookType)
    case selectMode(ShootMode)
    case startTapped
    case reviewPlanTapped
    case settingsTapped
}

@MainActor @Observable final class LaunchViewModel {
    var state = LaunchState()
    private let router: NavigationCoordinator
    init(router: NavigationCoordinator) { self.router = router }

    func send(_ action: LaunchAction) {
        switch action {
        case .selectScene(let scene):
            guard scene.isProOnly == false else { router.push(.purchase); return }
            state.scene = scene
        case .selectLook(let look):
            guard look == .natural else { router.push(.purchase); return }
            state.look = look
        case .selectMode(let mode): state.mode = mode
        case .startTapped: router.push(.cameraPrivacy(state.currentPlan))
        case .reviewPlanTapped: router.push(.shotPlan(state.currentPlan))
        case .settingsTapped: router.push(.settings)
        }
    }

    static var preview: LaunchViewModel { .init(router: NavigationCoordinator()) }
}

struct LaunchView: View {
    @State var viewModel: LaunchViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.l) {
                MPTopBar(title: "MusePilot") { viewModel.send(.settingsTapped) }
                    .padding(.horizontal, -MPSpacing.m)

                VStack(alignment: .leading, spacing: MPSpacing.s) {
                    Text("POSE GUIDANCE YOU CAN FOLLOW")
                        .font(MPTypography.eyebrow).tracking(1.2).foregroundStyle(MPColor.accent)
                    Text("Know how to stand,\nwhere the phone goes,\nand what to avoid.")
                        .font(MPTypography.title).lineSpacing(MPSpacing.xs).fixedSize(horizontal: false, vertical: true)
                    Text("Thoughtful guidance for a photo that feels like you.")
                        .font(MPTypography.body).foregroundStyle(.secondary)
                }

                scenePicker
                lookPicker
                modePicker
                planPreview
            }
            .padding(.horizontal, MPSpacing.l)
            .padding(.top, MPSpacing.s)
            .padding(.bottom, MPSpacing.m)
        }
        .background(MPColor.background.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: MPSpacing.s) {
                MPButton(title: "Start coaching") { viewModel.send(.startTapped) }
                Text("Your plan is ready before the camera opens.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
            .padding(.horizontal, MPSpacing.l).padding(.top, MPSpacing.s).padding(.bottom, MPSpacing.s)
            .background(.regularMaterial)
        }
        .navigationTitle("").navigationBarHidden(true)
    }

    private var scenePicker: some View {
        VStack(alignment: .leading, spacing: MPSpacing.s) {
            sectionHeading("01", "Choose a scene")
            VStack(alignment: .leading, spacing: MPSpacing.s) {
                Text("WEEKLY PHOTOS").font(MPTypography.eyebrow).tracking(0.8).foregroundStyle(.secondary)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: MPSpacing.s) {
                    ForEach(SceneType.allCases.filter { !$0.isProfile }) { scene in
                        ChoiceTile(title: scene.rawValue, subtitle: "Natural · Free", selected: viewModel.state.scene == scene, locked: false) {
                            viewModel.send(.selectScene(scene))
                        }
                    }
                }
                Text("PROFILE PHOTO · WINDOW LIGHT").font(MPTypography.eyebrow).tracking(0.8).foregroundStyle(.secondary)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: MPSpacing.s) {
                    ForEach(SceneType.allCases.filter(\.isProfile)) { scene in
                        ChoiceTile(title: scene.rawValue, subtitle: "Pro portrait plan", selected: viewModel.state.scene == scene, locked: scene.isProOnly) {
                            viewModel.send(.selectScene(scene))
                        }
                    }
                }
            }
        }
    }

    private var lookPicker: some View {
        VStack(alignment: .leading, spacing: MPSpacing.s) {
            sectionHeading("02", "Choose your look")
            ForEach(LookType.allCases) { look in
                let selected = viewModel.state.look == look
                let free = look == .natural
                Button { viewModel.send(.selectLook(look)) } label: {
                    HStack(spacing: MPSpacing.m) {
                        VStack(alignment: .leading, spacing: MPSpacing.xs) {
                            HStack(spacing: MPSpacing.s) {
                                Text(look.rawValue).font(MPTypography.body.weight(.semibold))
                                if !free { MPBadge(title: "PRO") }
                            }
                            Text(lookDescription(look)).font(MPTypography.caption).foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: !free ? "lock.fill" : selected ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(selected ? MPColor.accent : Color.secondary)
                    }
                    .padding(MPSpacing.m)
                    .background(selected ? MPColor.surface : MPColor.elevated, in: RoundedRectangle(cornerRadius: MPRadius.card))
                    .overlay(RoundedRectangle(cornerRadius: MPRadius.card).stroke(selected ? MPColor.accent : MPColor.outline.opacity(0.45), lineWidth: selected ? 1.5 : 0.75))
                    .contentShape(RoundedRectangle(cornerRadius: MPRadius.card))
                }
                .buttonStyle(.plain).foregroundStyle(MPColor.ink)
                .accessibilityHint(free ? "Select Natural" : "Unlock this look with MusePilot Pro")
            }
        }
    }

    private var modePicker: some View {
        VStack(alignment: .leading, spacing: MPSpacing.s) {
            sectionHeading("03", "Who is holding the phone?")
            HStack(spacing: MPSpacing.s) {
                ForEach(ShootMode.allCases) { mode in
                    Button { viewModel.send(.selectMode(mode)) } label: {
                        VStack(alignment: .leading, spacing: MPSpacing.xs) {
                            Text(mode.rawValue).font(MPTypography.body.weight(.semibold))
                            Text(mode.subtitle).font(.system(.caption2)).foregroundStyle(.secondary).lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(MPSpacing.m)
                        .background(viewModel.state.mode == mode ? MPColor.surface : MPColor.elevated, in: RoundedRectangle(cornerRadius: MPRadius.button))
                        .overlay(RoundedRectangle(cornerRadius: MPRadius.button).stroke(viewModel.state.mode == mode ? MPColor.accent : MPColor.outline.opacity(0.45), lineWidth: viewModel.state.mode == mode ? 1.5 : 0.75))
                    }
                    .buttonStyle(.plain).foregroundStyle(MPColor.ink)
                }
            }
        }
    }

    private var planPreview: some View {
        let plan = viewModel.state.currentPlan
        return VStack(alignment: .leading, spacing: MPSpacing.m) {
            HStack {
                VStack(alignment: .leading, spacing: MPSpacing.xs) {
                    Text("YOUR SHOT PLAN").font(MPTypography.eyebrow).tracking(1)
                    Text("\(plan.scene.rawValue) · \(plan.look.rawValue)").font(MPTypography.heading)
                }
                Spacer()
                Image(systemName: "viewfinder").font(.title2).foregroundStyle(MPColor.accent)
            }
            Divider()
            Label(plan.framing, systemImage: "person.crop.rectangle")
            Label("\(plan.cameraHeight) · \(plan.distance) · \(plan.orientation)", systemImage: "iphone.gen3")
            Text("TRY  ·  Turn slightly · Relax your shoulders")
                .font(MPTypography.caption).foregroundStyle(.secondary)
            Text("AVOID  ·  Low angle · Wide-angle on face")
                .font(MPTypography.caption).foregroundStyle(.secondary)
            Button { viewModel.send(.reviewPlanTapped) } label: {
                Label("Review full plan", systemImage: "arrow.up.right")
                    .font(MPTypography.caption.weight(.semibold)).foregroundStyle(MPColor.accent)
            }.buttonStyle(.plain)
        }
        .font(MPTypography.body)
        .padding(MPSpacing.l)
        .background(MPColor.surface, in: RoundedRectangle(cornerRadius: MPRadius.card))
    }

    private func sectionHeading(_ number: String, _ title: String) -> some View {
        HStack(spacing: MPSpacing.s) {
            Text(number).font(MPTypography.eyebrow).foregroundStyle(MPColor.accent)
            Text(title).font(MPTypography.heading)
        }
    }

    private func lookDescription(_ look: LookType) -> String {
        return switch look {
        case .natural: "Relaxed and everyday"
        case .editorial: "Still, like an editorial"
        case .candid: "As if you haven't noticed the camera"
        }
    }
}

private struct ChoiceTile: View {
    let title: String
    let subtitle: String
    let selected: Bool
    let locked: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: MPSpacing.s) {
                HStack {
                    Text(title).font(MPTypography.body.weight(.semibold))
                    Spacer(minLength: MPSpacing.xs)
                    if locked { Image(systemName: "lock.fill").font(MPTypography.caption) }
                    else if selected { Image(systemName: "checkmark.circle.fill").foregroundStyle(MPColor.accent) }
                }
                Text(locked ? "PRO · \(subtitle)" : subtitle)
                    .font(.system(.caption2)).foregroundStyle(.secondary).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 58, alignment: .leading).padding(MPSpacing.m)
            .background(selected ? MPColor.surface : MPColor.elevated, in: RoundedRectangle(cornerRadius: MPRadius.button))
            .overlay(RoundedRectangle(cornerRadius: MPRadius.button).stroke(selected ? MPColor.accent : MPColor.outline.opacity(0.45), lineWidth: selected ? 1.5 : 0.75))
        }
        .buttonStyle(.plain).foregroundStyle(MPColor.ink)
        .accessibilityHint(locked ? "Unlock this scene with MusePilot Pro" : "Select \(title)")
    }
}

#Preview { NavigationStack { LaunchView(viewModel: .preview) } }
