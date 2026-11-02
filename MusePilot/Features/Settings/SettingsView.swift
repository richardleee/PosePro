import SwiftUI
import Observation

struct SettingsState { var isDeleteConfirmationPresented = false }
enum SettingsAction { case privacyTapped, purchaseTapped, deleteTapped, deleteConfirmed }
@MainActor @Observable final class SettingsViewModel {
    var state = SettingsState()
    private let router: NavigationCoordinator
    init(router: NavigationCoordinator) { self.router = router }
    func send(_ action: SettingsAction) {
        switch action {
        case .privacyTapped: router.push(.privacy)
        case .purchaseTapped: router.push(.purchase)
        case .deleteTapped: state.isDeleteConfirmationPresented = true
        case .deleteConfirmed: state.isDeleteConfirmationPresented = false
        }
    }
    static var preview: SettingsViewModel { .init(router: NavigationCoordinator()) }
}

struct SettingsView: View {
    @State var viewModel: SettingsViewModel
    var body: some View {
        List {
            Section {
                NavigationRow(title: "Privacy", subtitle: "On-device processing and photo access", icon: "hand.raised") {
                    viewModel.send(.privacyTapped)
                }
                NavigationRow(title: "MusePilot Pro", subtitle: "Plans, billing and restore purchases", icon: "sparkles") {
                    viewModel.send(.purchaseTapped)
                }
            }
            Section("Your data") {
                Button(role: .destructive) { viewModel.send(.deleteTapped) } label: {
                    Label("Delete local sessions and style", systemImage: "trash")
                }
            }
            Section {
                Text("Photos stay in System Photos. MusePilot stores a local reference for session thumbnails, not a copy of the image.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
            }
        }
        .scrollContentBackground(.hidden).background(MPColor.background)
        .navigationTitle("Settings")
        .confirmationDialog("Delete local data?", isPresented: Binding(
            get: { viewModel.state.isDeleteConfirmationPresented },
            set: { if !$0 { viewModel.send(.deleteConfirmed) } }
        ), titleVisibility: .visible) {
            Button("Delete sessions and style", role: .destructive) { viewModel.send(.deleteConfirmed) }
            Button("Cancel", role: .cancel) { viewModel.send(.deleteConfirmed) }
        } message: {
            Text("This removes your sessions, style preferences and photo references from this iPhone. Photos in System Photos will not be deleted.")
        }
    }
}

private struct NavigationRow: View {
    let title: String
    let subtitle: String
    let icon: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: MPSpacing.m) {
                Image(systemName: icon).foregroundStyle(MPColor.accent).frame(width: MPSpacing.l)
                VStack(alignment: .leading, spacing: MPSpacing.xs) {
                    Text(title).foregroundStyle(MPColor.ink)
                    Text(subtitle).font(MPTypography.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").font(MPTypography.caption).foregroundStyle(.tertiary)
            }.padding(.vertical, MPSpacing.xs)
        }.buttonStyle(.plain)
    }
}
#Preview { NavigationStack { SettingsView(viewModel: .preview) } }
