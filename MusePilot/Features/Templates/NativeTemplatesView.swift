import SwiftUI
import Observation

struct TemplatesState {
    var scene: RecipeScene?
    var bookmarksOnly = false
}

enum TemplatesAction {
    case scene(RecipeScene?), bookmarksOnly(Bool), bookmark(String), open(String)
}

@MainActor @Observable
final class NativeTemplatesViewModel {
    private(set) var state = TemplatesState()
    let library: LocalLibraryStore
    private let navigation: PoseProCoordinator

    init(library: LocalLibraryStore, navigation: PoseProCoordinator) {
        self.library = library
        self.navigation = navigation
    }

    var recipes: [ShotRecipe] {
        ShotRecipe.starterRecipes.filter {
            (state.scene == nil || $0.scene == state.scene) &&
            (!state.bookmarksOnly || library.bookmarkedRecipeIDs.contains($0.id))
        }
    }

    func send(_ action: TemplatesAction) {
        switch action {
        case .scene(let scene): state.scene = scene
        case .bookmarksOnly(let value): state.bookmarksOnly = value
        case .bookmark(let id): library.toggleBookmark(id)
        case .open(let id): navigation.push(.recipe(id), in: .templates)
        }
    }

    static var preview: NativeTemplatesViewModel {
        .init(library: LocalLibraryStore(inMemory: true), navigation: PoseProCoordinator())
    }
}

struct NativeTemplatesView: View {
    @State var viewModel: NativeTemplatesViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.l) {
                VStack(alignment: .leading, spacing: MPSpacing.s) {
                    Text("A simple plan for your next photo.").font(MPTypography.title)
                    Text("Three free references. Choose the place, then the view.")
                        .font(MPTypography.body).foregroundStyle(.secondary)
                }
                Picker("Scene", selection: Binding(get: { viewModel.state.scene }, set: { viewModel.send(.scene($0)) })) {
                    Text("All").tag(RecipeScene?.none)
                    ForEach(RecipeScene.allCases) { Text($0.title).tag(Optional($0)) }
                }.pickerStyle(.segmented)
                Toggle("Bookmarked only", isOn: Binding(get: { viewModel.state.bookmarksOnly }, set: { viewModel.send(.bookmarksOnly($0)) }))

                if viewModel.recipes.isEmpty {
                    ContentUnavailableView("No bookmarks here yet", systemImage: "bookmark", description: Text("Turn off the filter to browse all three references."))
                    MPButton(title: "Show all references", style: .secondary) {
                        viewModel.send(.bookmarksOnly(false))
                        viewModel.send(.scene(nil))
                    }
                }
                ForEach(viewModel.recipes) { recipe in
                    VStack(alignment: .leading, spacing: MPSpacing.m) {
                        HStack(alignment: .top) {
                            Image(systemName: recipe.symbol).font(MPTypography.heading).foregroundStyle(MPColor.accent).accessibilityHidden(true)
                            Spacer()
                            Text("FREE · 3 VIEWS").font(MPTypography.eyebrow).foregroundStyle(MPColor.accent)
                            Button { viewModel.send(.bookmark(recipe.id)) } label: {
                                Image(systemName: viewModel.library.bookmarkedRecipeIDs.contains(recipe.id) ? "bookmark.fill" : "bookmark")
                                    .frame(minWidth: MPSpacing.touchTarget, minHeight: MPSpacing.touchTarget)
                            }.accessibilityLabel("\(viewModel.library.bookmarkedRecipeIDs.contains(recipe.id) ? "Remove bookmark for" : "Bookmark") \(recipe.title)")
                        }
                        Button { viewModel.send(.open(recipe.id)) } label: {
                            VStack(alignment: .leading, spacing: MPSpacing.s) {
                                Text(recipe.title).font(MPTypography.heading)
                                Text(recipe.subtitle).font(MPTypography.body).foregroundStyle(.secondary)
                                Label("See the three views", systemImage: "arrow.right").font(MPTypography.body.weight(.semibold)).foregroundStyle(MPColor.accent)
                            }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                        }.buttonStyle(.plain).foregroundStyle(MPColor.ink)
                        Text("Written reference · real phone examples pending review")
                            .font(MPTypography.caption).foregroundStyle(.secondary)
                    }.padding(MPSpacing.l).background(MPColor.elevated, in: RoundedRectangle(cornerRadius: MPRadius.card))
                }
                if let error = viewModel.library.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle").foregroundStyle(MPColor.error)
                }
            }.padding(MPSpacing.m)
        }
        .background(MPColor.background)
        .navigationTitle("Templates")
    }
}

struct NativeRecipeDetailView: View {
    let recipe: ShotRecipe
    let library: LocalLibraryStore
    let apply: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.l) {
                Image(systemName: recipe.symbol).font(MPTypography.cameraGlyph).foregroundStyle(MPColor.accent).accessibilityHidden(true)
                Text(recipe.title).font(MPTypography.title)
                Text(recipe.subtitle).font(MPTypography.body)
                Label("Free to use, save and repeat", systemImage: "checkmark.circle")
                ForEach(Array(recipe.goals.enumerated()), id: \.element.id) { index, goal in
                    VStack(alignment: .leading, spacing: MPSpacing.s) {
                        Text("\(index + 1). \(goal.title)").font(MPTypography.heading)
                        Text(goal.cameraTip).font(MPTypography.body)
                        Text(goal.lightTip).font(MPTypography.body).foregroundStyle(.secondary)
                        if let alternative = goal.alternatives.first {
                            Text("Alternative: \(alternative)").font(MPTypography.caption)
                        }
                    }.frame(maxWidth: .infinity, alignment: .leading)
                        .padding(MPSpacing.m).background(MPColor.surface, in: RoundedRectangle(cornerRadius: MPRadius.button))
                }
                Text("These are written references awaiting real phone reproduction review. No photographer-shot sample or measured camera position is claimed.")
                    .font(MPTypography.caption).foregroundStyle(.secondary)
                Button {
                    library.toggleBookmark(recipe.id)
                } label: {
                    Label(library.bookmarkedRecipeIDs.contains(recipe.id) ? "Bookmarked" : "Bookmark reference", systemImage: library.bookmarkedRecipeIDs.contains(recipe.id) ? "bookmark.fill" : "bookmark")
                }.frame(minHeight: MPSpacing.touchTarget)
                if let error = library.errorMessage { Text(error).foregroundStyle(MPColor.error) }
            }.padding(MPSpacing.l)
        }
        .background(MPColor.background)
        .navigationTitle("Your three views").navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            MPButton(title: "Use this reference", action: apply)
                .padding(MPSpacing.m).background(.regularMaterial)
        }
    }
}

#Preview("Templates") { NavigationStack { NativeTemplatesView(viewModel: .preview) } }
#Preview("Recipe") { NavigationStack { NativeRecipeDetailView(recipe: ShotRecipe.starterRecipes[0], library: LocalLibraryStore(inMemory: true), apply: {}) } }
