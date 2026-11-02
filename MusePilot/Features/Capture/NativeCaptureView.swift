import SwiftUI
import UIKit

struct NativeCaptureView: View {
    @State var viewModel: CaptureViewModel
    let openSettings: () -> Void
    @State private var toolsPresented = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.m) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: MPSpacing.xs) {
                        Text("A photo worth keeping.").font(MPTypography.heading)
                        Text("Choose your view. Hand the phone to a friend.")
                            .font(MPTypography.caption).foregroundStyle(.secondary)
                    }
                    Spacer(minLength: MPSpacing.s)
                    Button(action: openSettings) { Image(systemName: "slider.horizontal.3").frame(minWidth: MPSpacing.touchTarget, minHeight: MPSpacing.touchTarget) }
                        .accessibilityLabel("Settings")
                }

                Picker("Scene", selection: Binding(get: { viewModel.state.recipe.scene }, set: { scene in
                    if let recipe = ShotRecipe.starterRecipes.first(where: { $0.scene == scene }) { viewModel.send(.chooseRecipe(recipe)) }
                })) {
                    ForEach(RecipeScene.allCases) { scene in Text(scene.title).tag(scene) }
                }.pickerStyle(.segmented)

                HStack {
                    VStack(alignment: .leading, spacing: MPSpacing.xs) {
                        Text(viewModel.state.goal.title).font(MPTypography.body.weight(.semibold))
                        Text("View \(viewModel.state.goalIndex + 1) of 3 · Free reference")
                            .font(MPTypography.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Menu {
                        ForEach(Array(viewModel.state.recipe.goals.enumerated()), id: \.element.id) { index, goal in
                            Button(goal.title) { viewModel.send(.chooseGoal(index)) }
                        }
                    } label: { Label("View", systemImage: "chevron.down").frame(minHeight: MPSpacing.touchTarget) }
                }

                viewfinder
                instruction

                DisclosureGroup(isExpanded: Binding(get: { viewModel.state.referenceExpanded }, set: { viewModel.send(.reference($0)) })) {
                    VStack(alignment: .leading, spacing: MPSpacing.s) {
                        Label(viewModel.state.goal.subjectTip, systemImage: "person")
                        Label(viewModel.state.goal.lightTip, systemImage: "sun.max")
                        if let alternative = viewModel.state.goal.alternatives.first {
                            Text("Try instead: \(alternative)").foregroundStyle(.secondary)
                        }
                        Text("Written reference · real phone examples pending review")
                            .font(MPTypography.caption).foregroundStyle(.secondary)
                    }.font(MPTypography.body).padding(.top, MPSpacing.s)
                } label: { Text("Before you hand over the phone").font(MPTypography.body.weight(.medium)) }

                if let error = viewModel.state.error {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .font(MPTypography.body).foregroundStyle(MPColor.error)
                        .accessibilityAddTraits(.updatesFrequently)
                    Button("Dismiss message") { viewModel.send(.clearError) }
                }
                if let warning = viewModel.camera.lastError, viewModel.camera.status == .ready {
                    Label(warning, systemImage: "exclamationmark.triangle").font(MPTypography.body).foregroundStyle(MPColor.warning)
                }
            }
            .padding(MPSpacing.m)
        }
        .background(MPColor.background)
        .navigationTitle("PosePro")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom, spacing: 0) { captureControls }
        .sheet(isPresented: $toolsPresented) { tools }
        .fullScreenCover(isPresented: Binding(get: { viewModel.state.photo != nil }, set: { if !$0 { viewModel.send(.photoDismissed) } })) {
            if let photo = viewModel.state.photo {
                NavigationStack {
                    NativePhotoView(viewModel: photo, onRetake: { viewModel.send(.photoDismissed) }, onDone: { viewModel.send(.photoDismissed) })
                }
            }
        }
        .onDisappear { viewModel.send(.stop) }
        .onChange(of: viewModel.camera.status) { _, status in
            if case .unavailable = status { viewModel.send(.hardwareInterrupted) }
        }
    }

    private var viewfinder: some View {
        ZStack {
            MPColor.cameraPreview
            if viewModel.camera.status == .ready || viewModel.camera.status == .capturing {
                NativeCameraPreview(service: viewModel.camera)
                if viewModel.state.grid { CompositionGrid().stroke(MPColor.cameraText.opacity(0.35), lineWidth: 1).allowsHitTesting(false) }
            } else {
                VStack(spacing: MPSpacing.m) {
                    Image(systemName: "camera").font(MPTypography.cameraGlyph).accessibilityHidden(true)
                    Text(cameraMessage).font(MPTypography.body).multilineTextAlignment(.center)
                    if viewModel.camera.status == .requesting {
                        ProgressView().tint(MPColor.cameraText)
                    } else if viewModel.camera.status == .denied {
                        Button("Open Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                        }.buttonStyle(.borderedProminent)
                    } else {
                        Button("Enable camera") { viewModel.send(.start) }.buttonStyle(.borderedProminent)
                    }
                }.foregroundStyle(MPColor.cameraText).padding(MPSpacing.l)
            }
            if let countdown = viewModel.state.countdown {
                VStack {
                    Text(countdown.formatted()).font(MPTypography.countdown)
                    Button("Cancel timer") { viewModel.send(.cancelCountdown) }.buttonStyle(.borderedProminent)
                }.foregroundStyle(MPColor.cameraText)
            }
        }
        .aspectRatio(3.0 / 4.0, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: MPRadius.card))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Camera viewfinder")
    }

    private var instruction: some View {
        VStack(alignment: .leading, spacing: MPSpacing.s) {
            HStack {
                Image(systemName: viewModel.state.paused ? "pause.circle" : "viewfinder").accessibilityHidden(true)
                Text(viewModel.state.suggestion.title).font(MPTypography.caption.weight(.semibold))
                Spacer()
                Button(viewModel.state.paused ? "Resume" : "Pause") { viewModel.send(.togglePause) }
                    .frame(minHeight: MPSpacing.touchTarget)
            }
            Text(viewModel.state.suggestion.message).font(MPTypography.body.weight(.medium)).fixedSize(horizontal: false, vertical: true)
            if !viewModel.state.paused && !viewModel.state.skipped {
                Button("Skip guidance for this view") { viewModel.send(.skip) }.font(MPTypography.caption)
            }
        }
        .padding(MPSpacing.m).background(MPColor.surface, in: RoundedRectangle(cornerRadius: MPRadius.button))
    }

    private var captureControls: some View {
        HStack(spacing: MPSpacing.l) {
            Button { toolsPresented = true } label: { Label("Tools", systemImage: "slider.horizontal.3").labelStyle(.iconOnly).frame(minWidth: MPSpacing.touchTarget, minHeight: MPSpacing.touchTarget) }
                .accessibilityLabel("Camera tools")
            Spacer(minLength: 0)
            Button { viewModel.send(.shutter) } label: {
                ZStack {
                    Circle().stroke(MPColor.ink, lineWidth: 2).frame(width: MPSpacing.shutter, height: MPSpacing.shutter)
                    Circle().fill(MPColor.ink).frame(width: MPSpacing.shutterInner, height: MPSpacing.shutterInner)
                    if viewModel.camera.status == .capturing { ProgressView().tint(MPColor.onAccent) }
                }
            }
            .disabled(!viewModel.canCapture)
            .opacity(viewModel.canCapture ? 1 : 0.4)
            .accessibilityLabel(viewModel.state.timer ? "Take photo with three second timer" : "Take photo")
            Spacer(minLength: 0)
            Button { viewModel.send(.switchLens) } label: { Image(systemName: "arrow.triangle.2.circlepath.camera").frame(minWidth: MPSpacing.touchTarget, minHeight: MPSpacing.touchTarget) }
                .disabled(viewModel.camera.status == .requesting || viewModel.camera.status == .capturing)
                .accessibilityLabel("Switch to \(viewModel.camera.lens == .rear ? "front" : "rear") camera")
        }
        .padding(.horizontal, MPSpacing.l).padding(.vertical, MPSpacing.s)
        .background(.regularMaterial)
    }

    private var tools: some View {
        NavigationStack {
            Form {
                Section("The phone") {
                    Picker("Who are you?", selection: Binding(get: { viewModel.state.recipient }, set: { viewModel.send(.recipient($0)) })) {
                        ForEach(CaptureRecipient.allCases) { Text($0.rawValue).tag($0) }
                    }
                    Picker("Support", selection: Binding(get: { viewModel.state.support }, set: { viewModel.send(.support($0)) })) {
                        ForEach(CaptureSupport.allCases) { Text($0.rawValue).tag($0) }
                    }
                    Text("Changing your role keeps the selected lens.").font(MPTypography.caption)
                }
                Section("Capture") {
                    Toggle("Grid", isOn: Binding(get: { viewModel.state.grid }, set: { viewModel.send(.grid($0)) }))
                    Toggle("3 second timer", isOn: Binding(get: { viewModel.state.timer }, set: { viewModel.send(.timer($0)) }))
                    Toggle("Flash", isOn: Binding(get: { viewModel.state.flash && viewModel.camera.supportsFlash }, set: { viewModel.send(.flash($0)) }))
                        .disabled(!viewModel.camera.supportsFlash)
                }
                if viewModel.state.researchEnabled {
                    Section("Your composition") {
                        Toggle("Aim for a centered portrait", isOn: Binding(get: { viewModel.state.centeredComposition }, set: { viewModel.send(.centered($0)) }))
                        Text("Optional research target for rear handheld half-body views. Other compositions keep written references.").font(MPTypography.caption)
                    }
                }
            }
            .navigationTitle("Camera tools").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { toolsPresented = false } } }
        }.presentationDetents([.medium, .large])
    }

    private var cameraMessage: String {
        switch viewModel.camera.status {
        case .idle: "Choose your view, then enable the camera."
        case .requesting: "Getting the camera ready…"
        case .denied: "Camera access is off. You can still browse the written references."
        case .unavailable(let message): message
        case .ready, .capturing: ""
        }
    }
}

private struct CompositionGrid: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            for fraction in [1.0 / 3.0, 2.0 / 3.0] {
                path.move(to: CGPoint(x: rect.width * fraction, y: 0))
                path.addLine(to: CGPoint(x: rect.width * fraction, y: rect.height))
                path.move(to: CGPoint(x: 0, y: rect.height * fraction))
                path.addLine(to: CGPoint(x: rect.width, y: rect.height * fraction))
            }
        }
    }
}

#Preview { NavigationStack { NativeCaptureView(viewModel: .preview, openSettings: {}) } }
