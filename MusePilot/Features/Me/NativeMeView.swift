import SwiftUI
import Observation

struct MeState { var favoritesOnly = false; var error: String? }
enum MeAction { case favoritesOnly(Bool), favorite(UUID, Bool), settings, dismissError }

@MainActor @Observable
final class NativeMeViewModel {
    private(set) var state = MeState()
    let library: LocalLibraryStore
    private let navigation: PoseProCoordinator

    init(library: LocalLibraryStore, navigation: PoseProCoordinator) {
        self.library = library
        self.navigation = navigation
    }

    var records: [SavedPhotoRecord] { library.records.filter { !state.favoritesOnly || $0.favorite } }

    func send(_ action: MeAction) {
        switch action {
        case .favoritesOnly(let value): state.favoritesOnly = value
        case .favorite(let id, let value):
            do { try library.setFavorite(recordID: id, isFavorite: value); state.error = nil }
            catch { state.error = error.localizedDescription }
        case .settings: navigation.push(.settings, in: .me)
        case .dismissError: state.error = nil; library.dismissError()
        }
    }

    static var preview: NativeMeViewModel {
        .init(library: LocalLibraryStore(inMemory: true), navigation: PoseProCoordinator())
    }
}

struct NativeMeView: View {
    @State var viewModel: NativeMeViewModel
    let apply: (ShotRecipe) -> Void

    var body: some View {
        List {
            Section {
                Text("Your moments, on your phone.").font(MPTypography.heading)
                Text("Photos are saved to Photos. This list keeps only their references and the views you tried.")
                    .font(MPTypography.body).foregroundStyle(.secondary)
            }
            if let error = viewModel.state.error ?? viewModel.library.errorMessage {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle").foregroundStyle(MPColor.error)
                    Button("Dismiss message") { viewModel.send(.dismissError) }
                }
            }
            Section("Bookmarked references") {
                let recipes = ShotRecipe.starterRecipes.filter { viewModel.library.bookmarkedRecipeIDs.contains($0.id) }
                if recipes.isEmpty {
                    Text("Bookmark a reference in Templates to find it here.").foregroundStyle(.secondary)
                }
                ForEach(recipes) { recipe in
                    Button { apply(recipe) } label: { Label(recipe.title, systemImage: recipe.symbol) }
                }
            }
            Section("Saved moments") {
                Toggle("Favorites only", isOn: Binding(get: { viewModel.state.favoritesOnly }, set: { viewModel.send(.favoritesOnly($0)) }))
                if viewModel.records.isEmpty {
                    ContentUnavailableView(viewModel.state.favoritesOnly ? "No favorites yet" : "Your first photo starts here", systemImage: viewModel.state.favoritesOnly ? "heart" : "photo", description: Text("Save a photo to Photos and its reference will appear here."))
                }
                ForEach(viewModel.records) { record in
                    VStack(alignment: .leading, spacing: MPSpacing.s) {
                        HStack(alignment: .top) {
                            Image(systemName: "photo").font(MPTypography.heading).foregroundStyle(.secondary).accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: MPSpacing.xs) {
                                Text(record.goalTitle ?? "Photo").font(MPTypography.body.weight(.semibold))
                                Text(record.savedAt, format: .dateTime.month().day().hour().minute()).font(MPTypography.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button { viewModel.send(.favorite(record.id, !record.favorite)) } label: {
                                Image(systemName: record.favorite ? "heart.fill" : "heart").frame(minWidth: MPSpacing.touchTarget, minHeight: MPSpacing.touchTarget)
                            }.buttonStyle(.borderless).accessibilityLabel(record.favorite ? "Remove photo favorite" : "Favorite photo")
                        }
                        Text("Open Photos to view the saved image. No library-reading permission is needed here.")
                            .font(MPTypography.caption).foregroundStyle(.secondary)
                        if let recipe = ShotRecipe.starterRecipes.first(where: { $0.id == record.recipeID }) {
                            Button("Use this reference again") { apply(recipe) }.buttonStyle(.borderless)
                        } else if record.recipeID != nil {
                            Text("This reference is no longer available.").font(MPTypography.caption)
                        }
                    }.padding(.vertical, MPSpacing.s)
                }
            }
        }
        .scrollContentBackground(.hidden).background(MPColor.background)
        .navigationTitle("Me")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { viewModel.send(.settings) } label: { Label("Settings", systemImage: "gearshape") } } }
    }
}

#Preview { NavigationStack { NativeMeView(viewModel: .preview, apply: { _ in }) } }
