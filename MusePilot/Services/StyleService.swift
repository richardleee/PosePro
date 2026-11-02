import Foundation

protocol StyleServiceProtocol {
    func styleNames() -> [String]
    func reset()
}

struct MockStyleService: StyleServiceProtocol {
    func styleNames() -> [String] { ["Natural", "Editorial", "Candid"] }
    func reset() {}
}
