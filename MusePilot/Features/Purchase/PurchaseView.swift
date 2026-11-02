import SwiftUI
import Observation

enum SubscriptionOption: String, CaseIterable, Identifiable {
    case annual = "Yearly"
    case weekly = "Weekly"
    var id: String { rawValue }
}
struct PurchaseState { var selected: SubscriptionOption = .annual }
enum PurchaseAction { case select(SubscriptionOption), startTrialTapped, restoreTapped, privacyTapped }
@MainActor @Observable final class PurchaseViewModel {
    var state = PurchaseState()
    private let router: NavigationCoordinator
    init(router: NavigationCoordinator) { self.router = router }
    func send(_ action: PurchaseAction) {
        switch action {
        case .select(let option): state.selected = option
        case .startTrialTapped: router.pop()
        case .restoreTapped: break
        case .privacyTapped: router.push(.privacy)
        }
    }
    static var preview: PurchaseViewModel { .init(router: NavigationCoordinator()) }
}

struct PurchaseView: View {
    @State var viewModel: PurchaseViewModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MPSpacing.l) {
                HStack {
                    Spacer()
                    Button { viewModel.send(.restoreTapped) } label: {
                        Text("Restore").font(MPTypography.caption.weight(.medium)).foregroundStyle(MPColor.accent)
                    }
                }
                Text("Your best portraits\nstart with a plan.")
                    .font(MPTypography.title).fixedSize(horizontal: false, vertical: true)
                Text("Get studio-quality solo portraits without hiring a $200 photographer.")
                    .font(MPTypography.body).foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: MPSpacing.m) {
                    benefit("All Editorial and Candid looks", icon: "sparkles")
                    benefit("Dating and Professional portrait plans", icon: "person.crop.rectangle")
                    benefit("Unlimited shooting plans", icon: "infinity")
                    benefit("Self-shoot and friend-assisted coaching", icon: "person.2")
                    benefit("Private, on-device pose guidance", icon: "lock.shield")
                }
                .padding(MPSpacing.l)
                .background(MPColor.surface, in: RoundedRectangle(cornerRadius: MPRadius.card))

                ForEach(SubscriptionOption.allCases) { option in
                    optionCard(option)
                }

                MPButton(title: viewModel.state.selected == .annual ? "Start 3-day Free Trial" : "Continue with Weekly") { viewModel.send(.startTrialTapped) }
                Text("No photo uploads. Cancel any time in your Apple account settings.")
                    .font(MPTypography.caption).foregroundStyle(.secondary).multilineTextAlignment(.center).frame(maxWidth: .infinity)
                HStack {
                    Button("Terms") { }
                    Spacer()
                    Button("Privacy") { viewModel.send(.privacyTapped) }
                }.font(MPTypography.caption).foregroundStyle(MPColor.accent)
            }.padding(MPSpacing.l)
        }
        .background(MPColor.background.ignoresSafeArea())
        .navigationTitle("MusePilot Pro")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func benefit(_ title: String, icon: String) -> some View {
        Label(title, systemImage: icon).font(MPTypography.body)
    }

    private func optionCard(_ option: SubscriptionOption) -> some View {
        let selected = viewModel.state.selected == option
        let title = option == .annual ? "$29.99 / year" : "$4.99 / week"
        let detail = option == .annual ? "3-day free trial, then billed yearly" : "Billed weekly"
        return Button { viewModel.send(.select(option)) } label: {
            HStack(spacing: MPSpacing.m) {
                Image(systemName: selected ? "largecircle.fill.circle" : "circle")
                    .foregroundStyle(selected ? MPColor.accent : Color.secondary)
                VStack(alignment: .leading, spacing: MPSpacing.xs) {
                    Text(title).font(MPTypography.body.weight(.semibold)).foregroundStyle(MPColor.ink)
                    Text(detail).font(MPTypography.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }.padding(MPSpacing.m)
                .background(selected ? MPColor.surface : MPColor.elevated, in: RoundedRectangle(cornerRadius: MPRadius.button))
                .overlay(RoundedRectangle(cornerRadius: MPRadius.button).stroke(selected ? MPColor.accent : MPColor.outline.opacity(0.5), lineWidth: selected ? 1.5 : 0.75))
        }.buttonStyle(.plain)
    }
}
#Preview { NavigationStack { PurchaseView(viewModel: .preview) } }
