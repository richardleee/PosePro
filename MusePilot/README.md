# PosePro SwiftUI P0A Development Build

The app entry now uses [PRD V2.2](../PosePro_AI_Camera_PRD_V2.2.md): Camera / Templates / Me and one-phone friend-assisted portraits. Project/scheme/module remain MusePilot; the displayed app name is PosePro. Earlier V1.6 screens are retained as historical source but are unreachable from the current root.

Real AVFoundation capture, local Vision observations, Core Image adjustments, PhotoKit saving and a JSON metadata library are implemented in source. This is an unvalidated engineering build: Xcode typechecking, XCTest, device acceptance, G0 content reproduction and G1 guidance validation are pending. No purchase entry, StoreKit, advertising SDK, SwiftData or cloud inference is added. See [P0A implementation and acceptance](../docs/P0A_IMPLEMENTATION.md) for exact status.

## Open on macOS

Requires Xcode 16 and iOS 17 or later. Open `MusePilot.xcodeproj` and run the shared `MusePilot` scheme. Use a real iPhone for camera/Vision/Photos acceptance; in Simulator, references and metadata screens remain available without a camera. No camera authorization happens at cold start.

`project.yml` is also included for teams that use XcodeGen (`xcodegen generate`). A standard-library Python source/project synchronizer is included for Windows (`python scripts/sync_ios_project.py`, from repository root). Both configurations include the app, privacy manifest, test target and shared scheme. macOS/Xcode compilation and execution are still required.

## Structure

- `MusePilot/App` — single app entry, DI container, P0A tab root and coordinator
- `MusePilot/Core` — design tokens, shared components, navigation coordinator
- `MusePilot/Features/Capture`, `Photo`, `Templates`, `Me` and `Settings/NativeSettingsView.swift` — current screens and view models; View changes go through actions
- `MusePilot/Domain/P0A` — three reference drafts, nine goals and a research framing policy
- `MusePilot/Services/Capture`, `Photos`, `Library` — local camera/pose, photo pipeline and metadata storage
- `MusePilotTests` — 21 XCTest cases for content, metadata, guidance boundaries and photo lifecycle; not yet executed

All new page previews use memory-only services and never request permissions. Experimental framing is Debug-only, off by default, and requires a separately selected centered half-body target, rear camera, handheld support and photographer role. It is not a G1 pass or a calibrated camera-position feature.
