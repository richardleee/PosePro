import SwiftUI

@main
@MainActor
struct MusePilotApp: App {
    @State private var container = AppContainer()

    var body: some Scene {
        WindowGroup {
            PoseProRootView(container: container)
                .tint(MPColor.accent)
        }
    }
}

