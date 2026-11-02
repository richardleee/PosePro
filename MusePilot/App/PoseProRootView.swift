import SwiftUI

struct PoseProRootView: View {
    @Bindable var container: AppContainer
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        @Bindable var navigation = container.navigation
        TabView(selection: Binding(get: { navigation.tab }, set: { navigation.select($0) })) {
            NavigationStack {
                NativeCaptureView(viewModel: container.capture) {
                    navigation.push(.settings, in: .me)
                }
            }
            .tabItem { Label("Camera", systemImage: "camera") }
            .tag(PoseProTab.camera)

            NavigationStack(path: $navigation.templatePath) {
                NativeTemplatesView(viewModel: .init(library: container.library, navigation: navigation))
                    .navigationDestination(for: PoseProRoute.self) { route in destination(route) }
            }
            .tabItem { Label("Templates", systemImage: "rectangle.on.rectangle") }
            .tag(PoseProTab.templates)

            NavigationStack(path: $navigation.mePath) {
                NativeMeView(viewModel: .init(library: container.library, navigation: navigation), apply: apply)
                    .navigationDestination(for: PoseProRoute.self) { route in destination(route) }
            }
            .tabItem { Label("Me", systemImage: "person.crop.circle") }
            .tag(PoseProTab.me)
        }
        .onChange(of: navigation.tab) { _, tab in
            if tab != .camera { container.capture.send(.stop) }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { container.capture.send(.stop) }
            // System permission dialogs may be temporarily inactive. They must
            // not cancel the explicit camera request that presented them.
            // Returning never reopens the camera; the user chooses Enable camera.
        }
    }

    @ViewBuilder private func destination(_ route: PoseProRoute) -> some View {
        switch route {
        case .recipe(let id):
            if let recipe = ShotRecipe.starterRecipes.first(where: { $0.id == id }) {
                NativeRecipeDetailView(recipe: recipe, library: container.library) { apply(recipe) }
            } else {
                ContentUnavailableView("Recipe unavailable", systemImage: "rectangle.slash", description: Text("Choose another reference in Templates."))
            }
        case .privacy: NativePrivacyView()
        case .settings:
            NativeSettingsView(library: container.library, capture: container.capture, navigation: container.navigation)
        }
    }

    private func apply(_ recipe: ShotRecipe) {
        container.capture.send(.chooseRecipe(recipe))
        container.navigation.popToRoot(in: .templates)
        container.navigation.select(.camera)
    }
}

#Preview { PoseProRootView(container: AppContainer(previewOnly: true)) }
