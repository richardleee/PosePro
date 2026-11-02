import SwiftUI
import Observation

struct SessionState {
    var sessions: [SessionSummary] = []
    var isThumbnailNoticePresented = false
    var hasThumbnailAccess = false
}
enum SessionAction { case requestThumbnailAccess, thumbnailNoticeDismissed }
@MainActor @Observable final class SessionViewModel {
    var state = SessionState()
    func send(_ action: SessionAction) {
        switch action {
        case .requestThumbnailAccess:
            state.isThumbnailNoticePresented = false
            state.hasThumbnailAccess = true
        case .thumbnailNoticeDismissed: state.isThumbnailNoticePresented = false
        }
    }
    static var preview: SessionViewModel {
        let viewModel = SessionViewModel()
        viewModel.state.sessions = [SessionSummary(id: UUID(), scene: .cafe, look: .natural, date: .now, isFavorite: true)]
        viewModel.state.isThumbnailNoticePresented = true
        return viewModel
    }
}

struct SessionView: View {
    @State var viewModel: SessionViewModel
    var body: some View {
        VStack(alignment: .leading, spacing: MPSpacing.l) {
            VStack(alignment: .leading, spacing: MPSpacing.s) {
                Text("Your sessions").font(MPTypography.title)
                Text("A record of your plans and the photos you chose to keep.")
                    .font(MPTypography.body).foregroundStyle(.secondary)
            }
            Spacer()
            if viewModel.state.sessions.isEmpty {
                ContentUnavailableView(
                    "Your next portrait starts here",
                    systemImage: "square.stack",
                    description: Text("Keep a photo after coaching and its session will appear here. MusePilot never copies the photo into its own library.")
                )
            } else {
                ForEach(viewModel.state.sessions) { session in
                    HStack(spacing: MPSpacing.m) {
                        if viewModel.state.hasThumbnailAccess {
                            RoundedRectangle(cornerRadius: MPRadius.button)
                                .fill(MPColor.surface)
                                .overlay(Image(systemName: "photo").foregroundStyle(MPColor.accent))
                                .frame(width: 78, height: 88)
                        }
                        VStack(alignment: .leading, spacing: MPSpacing.s) {
                            Text(session.scene.rawValue).font(MPTypography.heading)
                            Text(session.look.rawValue).font(MPTypography.body)
                            Text(session.date.formatted(date: .abbreviated, time: .omitted))
                                .font(MPTypography.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if session.isFavorite { Image(systemName: "heart.fill").foregroundStyle(MPColor.accent).accessibilityLabel("Favorite") }
                    }
                    .padding(MPSpacing.m)
                    .background(MPColor.surface, in: RoundedRectangle(cornerRadius: MPRadius.card))
                }
            }
            Spacer()
            Text("Photos stay in System Photos. Session thumbnails use a private on-device reference.")
                .font(MPTypography.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .padding(MPSpacing.l).background(MPColor.background)
        .navigationTitle("Session")
        .sheet(isPresented: Binding(
            get: { viewModel.state.isThumbnailNoticePresented },
            set: { if !$0 { viewModel.send(.thumbnailNoticeDismissed) } }
        )) {
            ThumbnailPrivacyNotice {
                viewModel.send(.requestThumbnailAccess)
            }
            .presentationDetents([.medium]).presentationDragIndicator(.visible)
        }
    }
}

private struct ThumbnailPrivacyNotice: View {
    let continueAction: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: MPSpacing.l) {
            Image(systemName: "photo.on.rectangle.angled").font(MPTypography.privacyGlyph).foregroundStyle(MPColor.accent)
            Text("Show your saved photos here?").font(MPTypography.title)
            Text("MusePilot reads only the photos you saved after coaching so it can show session thumbnails. It never browses your library.")
                .font(MPTypography.body).foregroundStyle(.secondary)
            MPButton(title: "Continue") { continueAction() }
        }.padding(MPSpacing.xl).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(MPColor.background)
    }
}
#Preview { NavigationStack { SessionView(viewModel: .preview) } }
