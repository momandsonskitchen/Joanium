## Design language

* All buttons should have rounded corners (20px).
* Should follow material 3 expressive design.
* I need a clean and very premium looking UI.
* Should match the current app design language.
* Setup/onboarding controls use the shared Bubbly UI entry point:
  `Packages/Shared/Bubbly/Index.js` and `Packages/Shared/Bubbly/Bubbly.css`. Add or
  re-export setup-facing shared controls there instead of creating one-off inputs,
  dropdowns, buttons, selectors, or loaders inside `Packages/Setup`.
* Material 3 Expressive — rounded corners (20px on buttons), clean, premium
* Feels like a macOS native app — no browser chrome, no tooltips, no visible DOM artifacts
* No visible HTML — users should never know it's a web page
