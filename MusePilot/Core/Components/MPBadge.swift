import SwiftUI

struct MPBadge: View {
    let title: String
    var body: some View {
        Text(title).font(MPTypography.caption.weight(.medium))
            .padding(.horizontal, MPSpacing.s).padding(.vertical, MPSpacing.xs)
            .background(MPColor.surface, in: Capsule())
    }
}
