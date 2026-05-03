# Onboarding Flow

## What was added
- A complete onboarding package in `Packages/Setup`.
- A dedicated chat home package in `Packages/Chat`.
- Shared native-style controls in `Packages/Shared`.
- Shared provider catalog and user data helpers in `Packages/Shared` so packages can reuse persisted state without importing from each other.
- Electron bootstrapping and package discovery so package entry points are discovered instead of hardcoded file imports.
- Local persistence in `Data/User.json` so onboarding resumes where the user left off.
- Chat-home persistence in `Data/Chat/Home.json` so saved prompt starters reappear in the sidebar recents list.
- Frameless setup window with no native title bar or in-flow chrome.
- Provider setup that uses icons from `Assets/Icons`, requires model selection, and then asks only for the matching API key or local endpoint.
- Returning users now launch directly into the chat package, and finishing onboarding switches to chat immediately without requiring an app restart.

## Setup package structure
- `Packages/Setup/Core`: provider catalog loading and onboarding state persistence.
- `Packages/Setup/UI`: preload bridge, renderer, styles, and onboarding state helpers.
- `Packages/Setup/I18n`: all user-facing copy for the onboarding and bridge workspace.

## Chat package structure
- `Packages/Chat/Core`: chat-home bootstrap payloads and recent prompt persistence.
- `Packages/Chat/UI`: preload bridge, renderer, and premium chat-home layout.
- `Packages/Chat/I18n`: all user-facing copy for the chat landing experience.

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
3. `Packages/Setup/Index.js` decides whether the app should open `Setup` or `Chat` based on onboarding completion.
4. `Packages/Electron/Index.js` creates the shell window and can switch packages at runtime through the shared navigation IPC.
5. `Packages/Shared/UserData/UserData.js` reads and writes `Data/User.json`.
6. `Packages/Shared/ProviderCatalog/ProviderCatalog.js` loads provider definitions from `Data/Models`.
7. `Packages/Setup/UI/SetupApp.js` renders onboarding, auto-saves draft progress through the preload bridge, and navigates into chat after completion.
8. `Packages/Chat/UI/ChatApp.js` renders the personalized chat home, hydrates recent prompts, and persists new prompt starters back into `Data/Chat/Home.json`.

## Notes
- All user-facing text in the onboarding flow comes from `Packages/Setup/I18n`.
- All user-facing text in the chat landing experience comes from `Packages/Chat/I18n`.
- The current chat package focuses on the launch experience: personalized greeting, model-ready composer, quick starts, and persistent recents.
