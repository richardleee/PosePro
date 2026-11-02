import SwiftUI

struct MPCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: MPSpacing.m) {
            Text(title).font(MPTypography.heading)
            content
        }.padding(MPSpacing.l).frame(maxWidth: .infinity, alignment: .leading)
            .background(MPColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: MPRadius.card))
    }
}
