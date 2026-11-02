import SwiftUI

struct MPTopBar: View {
    let title: String
    var settingsAction: (() -> Void)? = nil
    var body: some View {
        HStack {
            Text(title).font(MPTypography.heading)
            Spacer()
            if let settingsAction {
                Button(action: settingsAction) { Image(systemName: "gearshape") }
                    .accessibilityLabel("Settings")
            }
        }.padding(.horizontal, MPSpacing.m)
    }
}
