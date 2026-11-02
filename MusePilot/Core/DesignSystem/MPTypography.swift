import SwiftUI

enum MPTypography {
    static let title = Font.system(.largeTitle, design: .serif).weight(.regular)
    static let heading = Font.system(.title2, design: .serif).weight(.medium)
    static let eyebrow = Font.caption.weight(.semibold)
    static let body = Font.body
    static let caption = Font.caption
    static let countdown = Font.system(size: 112, weight: .light, design: .serif)
    static let cameraGlyph = Font.system(size: 76, weight: .ultraLight)
    static let privacyGlyph = Font.system(size: 30)
    static let resultGlyph = Font.system(size: 44, weight: .ultraLight)
}
