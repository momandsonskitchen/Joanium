# Contributing to Joanium

Thanks for taking the time to contribute! Please read this before opening issues or PRs.

---

## Getting Started

```bash
git clone https://github.com/joanium/joanium.git
cd joanium/joanium
npm install
npm start
```

---

## Development Workflow

```bash
npm start          # run the app
npm run lint       # check for lint errors
npm run format     # auto-format code
npm run build      # build distributable
```

---

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Keep PRs focused — one feature or fix per PR
3. Run `npm run lint` and make sure it passes
4. Fill out the PR template fully
5. Link the related issue (e.g. `Fixes #123`)

---

## Reporting Bugs

Use the [bug report template](https://github.com/joanium/joanium/issues/new?template=bug_report.md).
Include steps to reproduce, expected vs actual behaviour, and your OS + Node version.

---

## Suggesting Features

Use the [feature request template](https://github.com/joanium/joanium/issues/new?template=feature_request.md).
Explain the problem it solves, not just what you want.

---

## Code Style

- Follow the existing code — ESM, single quotes, semis, 2-space indent
- Run `npm run format` before committing
- No dead code, no commented-out blocks

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add Gemini provider support
fix: resolve crash on empty chat history
chore: bump electron to 42.0.1
docs: update README setup steps
refactor: simplify package bootstrap logic
```

---

## License

By contributing, you agree your contributions will be licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).
