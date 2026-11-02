import SwiftUI
import Observation
import UIKit

struct NativeSettingsState { var confirmClear = false; var error: String? }
enum NativeSettingsAction { case requestClear, cancelClear, confirmClear, reload, privacy }

@MainActor @Observable
final class NativeSettingsViewModel {
    private(set) var state = NativeSettingsState()
    let library: LocalLibraryStore
    private let navigation: PoseProCoordinator

    init(library: LocalLibraryStore, navigation: PoseProCoordinator) {
        self.library = library
        self.navigation = navigation
    }

    func send(_ action: NativeSettingsAction) {
        switch action {
        case .requestClear: state.confirmClear = true
        case .cancelClear: state.confirmClear = false
        case .confirmClear:
            state.confirmClear = false
            do { try library.clear(); state.error = nil }
            catch { state.error = error.localizedDescription }
        case .reload: library.reload(); state.error = library.errorMessage
        case .privacy: navigation.push(.privacy, in: .me)
        }
    }
}

struct NativeSettingsView: View {
    @State private var viewModel: NativeSettingsViewModel
    let capture: CaptureViewModel

    init(library: LocalLibraryStore, capture: CaptureViewModel, navigation: PoseProCoordinator) {
        _viewModel = State(initialValue: NativeSettingsViewModel(library: library, navigation: navigation))
        self.capture = capture
    }

    var body: some View {
        Form {
            Section("Access and privacy") {
                Button("Camera and Photos permissions") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }
                Button("Privacy and local data") { viewModel.send(.privacy) }
                Text("Camera access is requested when you enable it. Add-only Photos access is requested when you save.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
            Section("Local records") {
                Button("Reload local records") { viewModel.send(.reload) }
                Button("Clear local records and bookmarks", role: .destructive) { viewModel.send(.requestClear) }
                Text("Clearing this list does not delete pictures in Photos or change system permissions.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
                if let error = viewModel.state.error ?? viewModel.library.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle").foregroundStyle(MPColor.error)
                }
            }
            #if DEBUG
            Section("Research build") {
                Toggle("Experimental framing observations", isOn: Binding(get: { capture.state.researchEnabled }, set: { capture.send(.research($0)) }))
                Text("Unvalidated candidate. Rear handheld half-body only; no quality score or calibrated position. Turn off to use written references. No frames or landmarks are stored or uploaded.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
            #endif
            Section {
                Text("PosePro · P0A development build").font(MPTypography.caption)
                Text("Written references await G0 reproduction review. Automatic rules await G1 device validation. No purchases or ads.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
        }
        .scrollContentBackground(.hidden).background(MPColor.background)
        .navigationTitle("Settings")
        .confirmationDialog("Clear local records?", isPresented: Binding(get: { viewModel.state.confirmClear }, set: { if !$0 { viewModel.send(.cancelClear) } }), titleVisibility: .visible) {
            Button("Clear records and bookmarks", role: .destructive) { viewModel.send(.confirmClear) }
            Button("Cancel", role: .cancel) { viewModel.send(.cancelClear) }
        } message: { Text("Photos in your system library remain. This also resets the local first-save marker; it does not enable any data collection.") }
    }
}

struct NativePrivacyView: View {
    var body: some View {
        List {
            Section("On this iPhone") {
                Text("Camera frames and body landmarks are processed in memory. PosePro does not upload them, use them for training, or keep them in local history.")
                Text("Pause stops experimental pose analysis. Leaving Camera or moving the app to the background stops camera capture. You choose when to enable it again.")
            }
            Section("Your photos") {
                Text("Photos are written to the system library only when you save. System iCloud settings control whether your Photos library syncs.")
                Text("Unsaved photos stay in the current app process. Closing the app can lose them. Sharing is your choice; temporary share files are removed afterwards.")
            }
            Section("Local records") {
                Text("History contains dates, recipe versions, favorites and system photo references, not image bytes. No account, advertising SDK or session recording is included.")
                Text("No photo-library reading permission is needed for the text-only history. Research recording and public photo examples require separate agreements.")
            }
        }
        .scrollContentBackground(.hidden).background(MPColor.background)
        .navigationTitle("Privacy")
    }
}

#Preview("Settings") { NavigationStack { NativeSettingsView(library: LocalLibraryStore(inMemory: true), capture: .preview, navigation: PoseProCoordinator()) } }
#Preview("Privacy") { NavigationStack { NativePrivacyView() } }
