import SwiftUI
import UIKit

enum MPColor {
    static let ink = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? .white : UIColor(red: 0.16, green: 0.17, blue: 0.15, alpha: 1) })
    static let accent = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.88, green: 0.70, blue: 0.52, alpha: 1) : UIColor(red: 0.48, green: 0.29, blue: 0.18, alpha: 1) })
    static let onAccent = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.12, green: 0.12, blue: 0.11, alpha: 1) : .white })
    static let surface = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor.secondarySystemBackground : UIColor(red: 0.95, green: 0.94, blue: 0.91, alpha: 1) })
    static let background = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor.systemBackground : UIColor(red: 0.985, green: 0.98, blue: 0.96, alpha: 1) })
    static let elevated = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor.tertiarySystemBackground : .white })
    static let outline = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor.separator : UIColor(red: 0.84, green: 0.82, blue: 0.77, alpha: 1) })
    static let success = Color(uiColor: .systemGreen)
    static let warning = Color(uiColor: .systemOrange)
    static let error = Color(uiColor: .systemRed)
    static let cameraPreview = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.12, green: 0.13, blue: 0.13, alpha: 1) : UIColor(red: 0.22, green: 0.24, blue: 0.23, alpha: 1) })
    static let cameraText = Color(uiColor: .white)
    static let cameraOverlay = Color(uiColor: .black)
}
