import SwiftUI
import Observation

struct CameraState {
    var plan: ShotPlan
    var isPaused = false
    var voiceEnabled = false
    var wireframeEnabled = false
    var isCountdownVisible = false
    var isSaveNoticePresented = false
}

enum CameraAction { case closeTapped, selectMode(ShootMode), pauseTapped, voiceToggled, wireframeToggled, shutterTapped, saveNoticeConfirmed, saveNoticeDismissed, cancelCountdown, captureConfirmed }

@MainActor @Observable final class CameraViewModel {
    var state: CameraState
    private let router: NavigationCoordinator
    init(plan: ShotPlan, router: NavigationCoordinator) { state = .init(plan: plan); self.router = router }

    func send(_ action: CameraAction) {
        switch action {
        case .closeTapped: router.popToRoot()
        case .selectMode(let mode): state.plan = ShotPlan(scene: state.plan.scene, look: state.plan.look, mode: mode)
        case .pauseTapped: state.isPaused.toggle()
        case .voiceToggled: state.voiceEnabled.toggle()
        case .wireframeToggled: state.wireframeEnabled.toggle()
        case .shutterTapped: state.isSaveNoticePresented = true
        case .saveNoticeConfirmed:
            state.isSaveNoticePresented = false
            state.isCountdownVisible = true
        case .saveNoticeDismissed: state.isSaveNoticePresented = false
        case .cancelCountdown: state.isCountdownVisible = false
        case .captureConfirmed:
            state.isCountdownVisible = false
            router.push(.result(state.plan))
        }
    }
    static var preview: CameraViewModel { .init(plan: ShotPlan(scene: .cafe, look: .natural), router: NavigationCoordinator()) }
}

struct CameraView: View {
    @State var viewModel: CameraViewModel

    var body: some View {
        VStack(spacing: MPSpacing.m) {
            HStack {
                Button { viewModel.send(.closeTapped) } label: { Image(systemName: "xmark").font(.body.weight(.semibold)) }
                    .accessibilityLabel("Close camera coaching")
                Spacer()
                Text("COACHING MODE").font(MPTypography.eyebrow).foregroundStyle(.secondary)
                Spacer()
                Button { viewModel.send(.pauseTapped) } label: {
                    Label(viewModel.state.isPaused ? "Resume" : "Pause", systemImage: viewModel.state.isPaused ? "play.fill" : "pause.fill")
                        .font(MPTypography.caption.weight(.semibold))
                }
            }
            .padding(.horizontal, MPSpacing.m).padding(.top, MPSpacing.s)
            .foregroundStyle(MPColor.ink)

            Picker("Shooting mode", selection: Binding(
                get: { viewModel.state.plan.mode },
                set: { viewModel.send(.selectMode($0)) }
            )) {
                ForEach(ShootMode.allCases) { mode in Text(mode.rawValue).tag(mode) }
            }
            .pickerStyle(.segmented).padding(.horizontal, MPSpacing.m)
            Text(viewModel.state.plan.mode.subtitle)
                .font(MPTypography.caption).foregroundStyle(.secondary)

            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: MPRadius.card).fill(MPColor.cameraPreview)
                VStack(spacing: MPSpacing.m) {
                    Image(systemName: "person.crop.rectangle").font(MPTypography.cameraGlyph)
                        .foregroundStyle(MPColor.cameraText.opacity(0.8))
                    Text("CAMERA PREVIEW").font(MPTypography.eyebrow).tracking(1.2)
                        .foregroundStyle(MPColor.cameraText.opacity(0.75))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                instructionBanner
                    .padding(MPSpacing.m)
            }
            .overlay(RoundedRectangle(cornerRadius: MPRadius.card).stroke(MPColor.outline.opacity(0.35), lineWidth: 1))
            .padding(.horizontal, MPSpacing.m)

            HStack(spacing: MPSpacing.l) {
                ToggleControl(title: "Voice", icon: "speaker.wave.2", isOn: viewModel.state.voiceEnabled) { viewModel.send(.voiceToggled) }
                ToggleControl(title: "Outline", icon: "figure.stand", isOn: viewModel.state.wireframeEnabled) { viewModel.send(.wireframeToggled) }
            }
            .padding(.horizontal, MPSpacing.xl)

            Button { viewModel.send(.shutterTapped) } label: {
                ZStack {
                    Circle().stroke(MPColor.ink, lineWidth: 2).frame(width: 72, height: 72)
                    Circle().fill(MPColor.ink).frame(width: 58, height: 58)
                }
            }
            .accessibilityLabel("Take photo")
            .padding(.bottom, MPSpacing.s)
        }
        .padding(.vertical, MPSpacing.s)
        .background(MPColor.background.ignoresSafeArea())
        .navigationBarHidden(true)
        .sheet(isPresented: Binding(
            get: { viewModel.state.isSaveNoticePresented },
            set: { if !$0 { viewModel.send(.saveNoticeDismissed) } }
        )) {
            PhotoSaveNotice { viewModel.send(.saveNoticeConfirmed) }
                .presentationDetents([.medium]).presentationDragIndicator(.visible)
        }
        .fullScreenCover(isPresented: Binding(
            get: { viewModel.state.isCountdownVisible },
            set: { if !$0 { viewModel.send(.cancelCountdown) } }
        )) {
            CountdownPreview {
                viewModel.send(.cancelCountdown)
            } capture: {
                viewModel.send(.captureConfirmed)
            }
        }
    }

    private var instructionBanner: some View {
        VStack(alignment: .leading, spacing: MPSpacing.s) {
            Text(viewModel.state.isPaused ? "PAUSED" : "YOUR NEXT STEP")
                .font(MPTypography.eyebrow).tracking(1).foregroundStyle(MPColor.cameraText.opacity(0.72))
            if !viewModel.state.isPaused {
                Text(instruction).font(MPTypography.heading).foregroundStyle(MPColor.cameraText)
            }
            if viewModel.state.isPaused {
                Text("Paused. Resume when you're ready.").font(MPTypography.caption).foregroundStyle(MPColor.cameraText.opacity(0.75))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(MPSpacing.m)
        .background(MPColor.cameraOverlay.opacity(0.82), in: RoundedRectangle(cornerRadius: MPRadius.button))
    }

    private var instruction: String {
        return switch viewModel.state.plan.mode {
        case .inFrame: "Turn your shoulders slightly left."
        case .shooting: "Ask them to turn slightly left."
        }
    }
}

private struct PhotoSaveNotice: View {
    let continueAction: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: MPSpacing.l) {
            Image(systemName: "photo.badge.arrow.down").font(MPTypography.privacyGlyph).foregroundStyle(MPColor.accent)
            Text("Your photo stays yours.").font(MPTypography.title)
            Text("MusePilot saves photos directly to your System Photos. We don't store copies on our servers.")
                .font(MPTypography.body).foregroundStyle(.secondary)
            MPButton(title: "Continue") { continueAction() }
        }.padding(MPSpacing.xl).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(MPColor.background)
    }
}

private struct ToggleControl: View {
    let title: String
    let icon: String
    let isOn: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(MPTypography.caption.weight(.medium))
                .padding(.horizontal, MPSpacing.m).padding(.vertical, MPSpacing.s)
                .background(isOn ? MPColor.surface : MPColor.elevated, in: Capsule())
                .overlay(Capsule().stroke(MPColor.outline.opacity(0.5), lineWidth: 0.75))
        }.buttonStyle(.plain).foregroundStyle(MPColor.ink)
    }
}

private struct CountdownPreview: View {
    let cancel: () -> Void
    let capture: () -> Void
    var body: some View {
        VStack(spacing: MPSpacing.l) {
            Text("3").font(MPTypography.countdown)
            Text("Hold still. You can cancel any time.").font(MPTypography.body)
            MPButton(title: "Cancel countdown", style: .secondary) { cancel() }
            MPButton(title: "Capture preview") { capture() }
        }
        .padding(MPSpacing.xl).frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MPColor.background.ignoresSafeArea())
    }
}

#Preview { NavigationStack { CameraView(viewModel: .preview) } }
