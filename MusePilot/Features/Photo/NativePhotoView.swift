import SwiftUI
import UIKit

struct NativePhotoView: View {
    @State var viewModel: NativePhotoViewModel
    let onRetake: () -> Void
    let onDone: () -> Void
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var pendingExit: ExitAction?

    private enum ExitAction: Equatable { case retake, done }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.l) {
                status
                photo
                if let goal = viewModel.goal {
                    Text(goal.title).font(MPTypography.heading)
                }
                adjustments
                if let message = viewModel.state.errorMessage {
                    VStack(alignment: .leading, spacing: MPSpacing.s) {
                        Label(message, systemImage: "exclamationmark.circle")
                            .font(MPTypography.body)
                        if viewModel.state.needsSettings {
                            Button("Open Settings") {
                                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                            }
                        }
                        if viewModel.state.phase == .recordFailed && viewModel.canRetryRecord {
                            Button("Retry history only") { viewModel.send(.retryRecord) }
                        }
                        if !viewModel.state.previewMatchesAdjustments && !viewModel.state.isPreparingPreview {
                            Button("Retry preview") { viewModel.send(.retryPreview) }
                        }
                    }
                    .padding(MPSpacing.m)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MPColor.surface, in: RoundedRectangle(cornerRadius: MPRadius.button))
                    .accessibilityElement(children: .contain)
                }
                HStack(spacing: MPSpacing.m) {
                    Button { viewModel.send(.toggleFavorite) } label: {
                        Label(viewModel.state.isFavorite ? "Favorited" : "Favorite",
                              systemImage: viewModel.state.isFavorite ? "heart.fill" : "heart")
                            .frame(minHeight: MPSpacing.xl + MPSpacing.m)
                    }
                    .disabled(!viewModel.canFavorite)
                    Spacer(minLength: 0)
                    Button { viewModel.send(.share) } label: {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .frame(minHeight: MPSpacing.xl + MPSpacing.m)
                    }
                    .disabled(!viewModel.canShare)
                }
                Text("Adjustments change color only. References and guidance are never included in your photo.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
            .padding(MPSpacing.l)
        }
        .background(MPColor.background.ignoresSafeArea())
        .foregroundStyle(MPColor.ink)
        .navigationTitle("Your photo")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Retake") { requestExit(.retake) }.disabled(viewModel.isBusy)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Done") { requestExit(.done) }.disabled(viewModel.isBusy)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: MPSpacing.s) {
                if viewModel.saved {
                    MPButton(title: "Done") { requestExit(.done) }
                } else {
                    MPButton(title: saveTitle) { viewModel.send(.save) }
                        .disabled(!viewModel.canSave)
                }
                if viewModel.isBusy {
                    HStack(spacing: MPSpacing.s) {
                        ProgressView()
                        Text(viewModel.state.phase == .saving ? "Waiting for Photos to confirm. Keep this page open." :
                             viewModel.state.phase == .authorizing ? "Waiting for Photos permission…" : "Preparing your photo…")
                            .font(MPTypography.caption)
                    }
                    if viewModel.state.phase == .rendering || viewModel.state.phase == .authorizing {
                        Button("Cancel save") { viewModel.send(.cancelWork) }
                            .frame(minHeight: MPSpacing.xl + MPSpacing.m)
                    }
                }
            }
            .padding(MPSpacing.m).background(.regularMaterial)
        }
        .interactiveDismissDisabled(!viewModel.saved || viewModel.isBusy)
        .confirmationDialog("Discard this unsaved photo?", isPresented: Binding(
            get: { pendingExit != nil }, set: { if !$0 { pendingExit = nil } }
        ), titleVisibility: .visible) {
            Button("Discard photo", role: .destructive) {
                let action = pendingExit
                pendingExit = nil
                viewModel.send(.cancelWork)
                if action == .retake { onRetake() } else { onDone() }
            }
            Button("Keep editing", role: .cancel) { pendingExit = nil }
        } message: {
            Text("This photo is only in this session. Save it to Photos before leaving if you want to keep it.")
        }
        .sheet(isPresented: Binding(
            get: { viewModel.state.shareURL != nil },
            set: { if !$0 { viewModel.send(.dismissShare) } }
        ), onDismiss: { viewModel.send(.dismissShare) }) {
            if let url = viewModel.state.shareURL {
                NativePhotoShareSheet(url: url)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { viewModel.send(.cancelWork) }
        }
        .onDisappear { viewModel.send(.cancelWork) }
    }

    private var status: some View {
        VStack(alignment: .leading, spacing: MPSpacing.s) {
            Label(viewModel.saved ? "Saved to Photos" : "Not saved yet",
                  systemImage: viewModel.saved ? "checkmark.circle" : "photo")
                .font(MPTypography.body.weight(.semibold))
            if !viewModel.saved {
                Text("Keep the photo you like. You can save it for free.")
                    .font(MPTypography.body).foregroundStyle(.secondary)
            } else if viewModel.state.phase == .recordFailed {
                Text("Your photo is safe in Photos. History needs attention below.")
                    .font(MPTypography.body).foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var photo: some View {
        Group {
            if let image = UIImage(data: viewModel.state.previewData) {
                Image(uiImage: image).resizable().scaledToFit()
                    .accessibilityLabel("Captured photo with your selected color adjustments")
            } else {
                ContentUnavailableView("Photo unavailable", systemImage: "photo",
                                       description: Text("Return to Camera to take another photo."))
            }
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: MPRadius.card))
        .overlay(alignment: .topTrailing) {
            if viewModel.state.isPreparingPreview {
                ProgressView().padding(MPSpacing.m).background(.regularMaterial, in: Capsule())
                    .padding(MPSpacing.s).accessibilityLabel("Updating preview")
            }
        }
    }

    private var adjustments: some View {
        VStack(alignment: .leading, spacing: MPSpacing.m) {
            HStack {
                Text(viewModel.state.adjustments.isOriginal ? "Original" : "Color adjustments")
                    .font(MPTypography.heading)
                Spacer(minLength: 0)
                Button("Reset") { viewModel.send(.reset) }
                    .disabled(!viewModel.canEdit || viewModel.state.adjustments.isOriginal)
                    .frame(minHeight: MPSpacing.xl + MPSpacing.m)
            }
            adjustment("Brightness", value: viewModel.state.adjustments.brightness, range: -0.3...0.3) {
                viewModel.send(.brightness($0))
            }
            adjustment("Contrast", value: viewModel.state.adjustments.contrast, range: 0.7...1.3) {
                viewModel.send(.contrast($0))
            }
            adjustment("Warmth", value: viewModel.state.adjustments.temperature, range: -1...1) {
                viewModel.send(.temperature($0))
            }
            if viewModel.saved {
                Text("These are the saved photo’s settings. Take another photo to make a new version.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
        }
        .disabled(!viewModel.canEdit)
    }

    private func adjustment(_ title: String, value: Double, range: ClosedRange<Double>, set: @escaping (Double) -> Void) -> some View {
        VStack(alignment: .leading, spacing: MPSpacing.xs) {
            Text(title).font(MPTypography.body)
            Slider(value: Binding(get: { value }, set: set), in: range)
                .accessibilityLabel(title)
                .frame(minHeight: MPSpacing.xl + MPSpacing.m)
        }
    }

    private var saveTitle: String {
        switch viewModel.state.phase {
        case .rendering: "Preparing…"
        case .authorizing: "Waiting for permission…"
        case .saving: "Saving…"
        case .saveFailed: "Try Save again"
        default: "Save to Photos"
        }
    }

    private func requestExit(_ action: ExitAction) {
        guard !viewModel.isBusy else { return }
        if viewModel.saved {
            viewModel.send(.cancelWork)
            if action == .retake { onRetake() } else { onDone() }
        } else {
            pendingExit = action
        }
    }
}

private struct NativePhotoShareSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

#Preview {
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 240, height: 320))
    let data = renderer.pngData { context in
        UIColor.secondarySystemBackground.setFill()
        context.fill(CGRect(x: 0, y: 0, width: 240, height: 320))
    }
    NavigationStack {
        NativePhotoView(viewModel: NativePhotoViewModel(
            data: data, recipe: nil, goal: nil,
            library: LocalLibraryStore(inMemory: true), output: PhotoOutputService(previewOnly: true)
        ), onRetake: {}, onDone: {})
    }
}
