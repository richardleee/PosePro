import SwiftUI
import Observation

struct StyleState { var savedLooks: [String] = [] }
enum StyleAction { case resetTapped }
@MainActor @Observable final class StyleViewModel {
    var state = StyleState()
    private let styleService: StyleServiceProtocol
    init(styleService: StyleServiceProtocol) { self.styleService = styleService }
    func send(_ action: StyleAction) {
        if case .resetTapped = action { styleService.reset(); state.savedLooks.removeAll() }
    }
    static var preview: StyleViewModel { .init(styleService: MockStyleService()) }
}

struct StyleView: View {
    @State var viewModel: StyleViewModel
    var body: some View {
        VStack(alignment: .leading, spacing: MPSpacing.l) {
            VStack(alignment: .leading, spacing: MPSpacing.s) {
                Text("Your style").font(MPTypography.title)
                Text("Review the style preferences you have saved on this iPhone.")
                    .font(MPTypography.body).foregroundStyle(.secondary)
            }
            if viewModel.state.savedLooks.isEmpty {
                Spacer()
                ContentUnavailableView("Your saved looks will appear here", systemImage: "sparkles",
                                       description: Text("Saved style preferences will appear here when available."))
                Spacer()
            } else {
                ForEach(viewModel.state.savedLooks, id: \.self) { look in
                    MPCard(title: look) { Text("Saved on this iPhone").font(MPTypography.caption).foregroundStyle(.secondary) }
                }
                MPButton(title: "Reset style", style: .secondary) { viewModel.send(.resetTapped) }
                Spacer()
            }
            Label("Your style preferences stay on this device.", systemImage: "lock.shield")
                .font(MPTypography.caption).foregroundStyle(.secondary)
        }
        .padding(MPSpacing.l).background(MPColor.background)
        .navigationTitle("Style")
    }
}
#Preview { NavigationStack { StyleView(viewModel: .preview) } }
