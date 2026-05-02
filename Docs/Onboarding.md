# Onboarding Flow

## What was added
- A complete onboarding package in `Packages/Setup`.
- Shared native-style controls in `Packages/Shared`.
- Electron bootstrapping and package discovery so package entry points are discovered instead of hardcoded file imports.
- Local persistence in `Data/User.json` so onboarding resumes where the user left off.
- Frameless setup window with no native title bar or in-flow chrome.
- Provider setup that uses icons from `Assets/Icons`, requires model selection, and then asks only for the matching API key or local endpoint.

## Setup package structure
- `Packages/Setup/Core`: provider catalog loading and onboarding state persistence.
- `Packages/Setup/UI`: preload bridge, renderer, styles, and onboarding state helpers.
- `Packages/Setup/I18n`: all user-facing copy for the onboarding and bridge workspace.

## Shared controls used by setup
- `Button`
- `Checkbox`
- `InputBox`
- `DropDown`
- `ApiKeyInput`
- `ProviderScroller`
- `TagSelector`
- `Modal`

## Data flow
1. `App.js` calls `Packages/Index.js`.
2. `Packages/Boot/Index.js` discovers package entry points.
3. `Packages/Electron/Index.js` creates the shell window.
4. `Packages/Setup/Core/SetupState.js` reads and writes `Data/User.json`.
5. `Packages/Setup/Core/ProviderCatalog.js` loads provider definitions from `Data/Models`.
6. `Packages/Setup/UI/SetupApp.js` renders the onboarding flow, auto-saves draft progress through the preload bridge, and validates provider model plus credential setup together.

## Notes
- All user-facing text in the onboarding flow comes from `Packages/Setup/I18n`.
- Returning users skip the setup flow and land in a workspace bridge screen until the dedicated chat package is connected.
