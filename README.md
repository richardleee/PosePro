# PosePro AI Camera

The current product name is **PosePro AI Camera**. MusePilot is the previous product/project name and remains in the native source folders and scheme. The HTML prototype now uses PosePro branding; its old filenames are generated compatibility copies. FrameCoach is an older internal name and is also an unrelated App Store app. New product specifications use PosePro AI Camera.

This repository contains an interactive mobile HTML demo, an earlier web application, and an iPhone SwiftUI UX prototype. The latest requirements are [PosePro AI Camera PRD V2.2](PosePro_AI_Camera_PRD_V2.2.md): travel and everyday friend-assisted portraits, one subject and one photographer using the same phone, reproducible shot recipes, basic on-device guidance, and three permanently free recipes with complete capture/save/share. V2.2 removes launch ads and moves LiDAR out of the MVP; it replaces conflicting scope and entitlement requirements in [PRD V2.1](PosePro_AI_Camera_PRD_V2.1.md) and earlier specs. Limited real payments require native reliability, task effectiveness against the default camera, a demonstrated difference against a direct competitor, and delivered Pro content and store flows. Validation thresholds are proposed pilot gates, not measured results.

The HTML demo still implements the V2.1 camera-first flow and subsequent photography/model and UI discussions; it has not been migrated to V2.2. Native development now starts the V2.2 P0A flow: Camera / Templates / Me, AVFoundation still capture, local Apple Vision body observations, Core Image adjustments, PhotoKit add-only saving and a local metadata library. These are newly written integrations, not verified device results. Automatic guidance stays off by default; one explicit, unvalidated framing candidate is available only in Debug research settings. Written recipes are drafts awaiting G0 reproduction review. See the [P0A delivery and validation record](docs/P0A_IMPLEMENTATION.md). Xcode build, XCTest execution and real iPhone acceptance remain pending; no commercial readiness is claimed.

PosePro AI Camera combines pose and composition **guidance** with a camera and limited photographic color adjustments. Slogan: **Pro Portrait Guide, No Fake Retouch.** AI generation is limited to prebuilt reference assets in the production workflow; the app does not generate or reshape users' faces, bodies or photos. Source labels and Free/Pro access are independent. V2.2 requires real phone reproduction examples and includes no commercial ads or advertising SDKs.

## Photography guidance reference

- [Portrait Photography Rules V1.0](PosePro_Portrait_Photography_Rules_V1.0.md) — Chinese reference with 60 core rules, lighting and camera setup, six scene recipes, and conditions for turning advice into app prompts. V2.2 defines the current MVP; additional scenes and rules in this reference do not imply committed scope or implemented detection capabilities.

## iOS P0A development build

- Xcode project: `MusePilot.xcodeproj` (Xcode 16, Swift 6, iOS 17+, iPhone target)
- SwiftUI sources: `MusePilot/`
- Current source baseline: [PRD V2.2](PosePro_AI_Camera_PRD_V2.2.md); [implementation status, setup and acceptance steps](docs/P0A_IMPLEMENTATION.md).
- App display name: PosePro. Project, scheme, module and bundle identifier retain MusePilot for continuity. Earlier V1.6 feature files are retained as historical source and are unreachable from the new root.
- Open the `MusePilot` scheme on macOS with Xcode 16+. Use a real iPhone for capture/Vision/Photos acceptance; Simulator and all Previews can browse offline references without camera access. Windows cannot compile SwiftUI or run Previews.
- The shared scheme includes `MusePilotTests` with 21 XCTest cases. They have been added, not executed. Windows static project and Swift syntax checks passed for 44 Swift files; these do not substitute for Swift typechecking or iOS testing.

## Interactive mobile HTML demo

- Open [PosePro_Demo.html](PosePro_Demo.html) directly; it embeds all scripts, styles, icons and four AI sample portraits for offline use. [PosePro_Demo.zip](PosePro_Demo.zip) includes the standalone file and source. The former `MusePilot_Demo` names are compatibility copies.
- Source: [demo/index.html](demo/index.html); interaction details, browser limits and delivery status: [demo/README.md](demo/README.md).
- Camera / Templates / Me are the three tabs. Camera starts with a labeled sample; browser camera access is requested only after an explicit choice. Frame / Camera / Pose / Expression advice and pose references are manual, with pause and unknown states; they do not prevent manual capture.
- Photo results start with Original. Presets, strength and exposure/contrast/temperature are CSS/canvas visual examples, not production LUT processing. Records and favorites persist as metadata; photo bytes are not stored in localStorage. Download behavior depends on the browser.
- Three basic AI templates are Free; other AI templates demonstrate Pro access. Photographer-shot collections are honestly marked Coming soon. **$4.99/month, $34.99/year and 7-day trials on both plans** are simulated, with no real transaction or store eligibility check.
- No live Vision, MediaPipe, LLM, image generation, production LUT, LiDAR, native Photos or StoreKit is connected. The current HTML update has not undergone automated tests or real iPhone acceptance; older V1.6 QA files are historical evidence only and are excluded from the delivery ZIP.

## Stack

- `packages/web` — React + Vite, IndexedDB (`idb`)
- `packages/api` — Node.js / Express, tag matching engine, Stripe, share cards
- `packages/shared` — Free/Pro limits, 4 scene template library

## Run locally

```bash
cd E:\workspace\FramePhotoCoach
copy .env.example .env
npm install
npm run dev:api
npm run dev:web
```

- Web: http://localhost:5173
- API: http://localhost:8787

`USE_MEMORY_DB=true` (default) stores accounts in memory so you can try the demo without Postgres. Restarting the API clears accounts.

With Stripe keys unset, **Start trial** grants a local Pro trial so you can exercise share cards and extra profiles.

## Legacy web demo rules

| Rule | Implementation |
|------|----------------|
| Default local storage | IndexedDB; cloud sync checkbox default off + confirm modal |
| Cloud stores tags only | Sync payload is preference JSON, images rejected |
| Free: 1 solo profile, 1 plan/day, no share/sync | `effectiveLimits` |
| Pro: 5 solo + 2 couple, unlimited plans, share, sync | Trial counts as Pro |
| $4.99 / $34.99, 7-day trial | Checkout + demo fallback |
| No V2 | No Style Trainer, PDF, extra scene packs, AR |

## Postgres (optional)

```bash
docker compose up -d
# .env: USE_MEMORY_DB=false
```
