import SwiftUI

struct MPButton: View {
    enum Style: Equatable { case primary, secondary }
    let title: String
    var style: Style = .primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title).font(MPTypography.body.weight(.semibold))
                .frame(maxWidth: .infinity).padding(MPSpacing.m)
                .background(style == .primary ? MPColor.accent : MPColor.surface)
                .foregroundStyle(style == .primary ? MPColor.onAccent : MPColor.ink)
                .clipShape(RoundedRectangle(cornerRadius: MPRadius.button))
        }.buttonStyle(.plain)
    }
}
