# Changelog

All notable changes to **CS E-Bid Analyzer** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-06-30

First packaged milestone of the Electron rewrite of the legacy MFC **전자입찰 누적카운트** tool. Delivers Master/Code management, STEP2/3 analysis, Statistics, Research Lab, and Windows NSIS packaging.

See [docs/RELEASE-1.0.0-SIGNOFF.md](docs/RELEASE-1.0.0-SIGNOFF.md) for gate audit and accepted deferrals (P0-13 legacy catalog, NSIS manual QA, Prediction/CodeValue PO sign-off).

### Added

#### Application

- **Master (B01)** — CRUD, validation, grid/list UI, CSV·Excel import/export, bulk toolbar import (00–99).
- **Code (B02)** — CRUD, search, CSV·Excel import/export.
- **Code Value (L01)** — per-page code-count analysis UI; pattern stats with **legacy-unverified** banner.
- **Reverse Engineering (B03)** — STEP1–6 panels, grouping/frequency views (client-side).
- **Analysis (B05)** — Load/Analyze, STEP2/3 results, CodeValue stats, prediction panel (heuristic), batch analysis modal, history panel, raw JSON view, JSON export.
- **Statistics (B06)** — frequency, low/high ratio, distribution; real engine aggregation; history export; chart visualization.
- **Research Lab (B04)** — experiments, hypotheses, verifications, screenshots; Test Suite runner; catalog import (JSON/CSV); suite result export (CSV/Excel/Markdown); Research Dashboard MVP.
- **Settings (B07)** — theme, auto-refresh (active feature grids), DB backup/restore, app health check, packaging verify, keyboard shortcut help, optional analysis Web Worker.
- **Admin bulk import** — toolbar modals for Master 00–99 and Code (TXT/CSV/XLSX).
- **Program Info** — version and runtime metadata modal.
- **Menu Edit (P2-04)** — sidebar nav reorder via drag-and-drop (v1.0 scope).

#### Architecture & IPC

- Electron Main + React renderer (Vite, TypeScript, Zustand, Prisma/SQLite).
- Route-level code splitting; main chunk ~70 KB gzip.
- **`analysis:run`** — Main-process analysis pipeline via shared `runAnalysisPipeline`.
- **`analysis:runRegressionSuite`**, **`analysis:runFullSuite`**, **`analysis:healthCheck`** — suite/health IPC for Research and Settings.
- Structured error codes (**31**): `VAL_*`, `DB_*`, `IPC_*` with `formatAppErrors` → StatusBar.
- Promise-based **`ConfirmDialog`** (replaces all `window.confirm` in `src/`).
- Analysis history / statistics DB persistence with user-visible failure notification (`notifyPersistenceFailure`).
- Research DB incremental schema migration (no drop/recreate on upgrade).
- Renderer repository pattern: `Store/Service → repositories/ → electronService`.
- File logger, native save dialogs, DB path bootstrap for dev and packaged builds.

#### Verification & Research infrastructure (Phase 1)

- [RE-PLAYBOOK.md](docs/RE-PLAYBOOK.md) — legacy observation → Verification workflow.
- Test catalog import pipeline (JSON/CSV, duplicate policy, `_catalog` metadata).
- Master 00–99 **DRAFT** skeleton fixtures (100 rows) for future `SRC-LEGACY` fill-in.
- `npm run catalog:import`, `catalog:diagnose` — combined suite diagnostics (**43/43 @ 100%** on current DB).
- `npm run regression:gate` — built-in STEP2/3 regression gate (**18/18 @ 100%**, threshold ≥ 95%) in `build:check`.
- CodeValue / Prediction **SRC-BUILTIN** suites (12 cases each @ 100%); UI banners state legacy unverified status.
- Research Outputs **Policy B** (Draft proposal auto-fill).

#### i18n (Phase 4)

- `messages.ts` ko/en for Master, Code, Analysis, Research, CodeValue, RE, Statistics, Settings, Admin import, layout chrome, errors.
- Target **≥90%** UI string coverage per DoD.

#### Testing (Phase 3–5)

- **148** unit + integration tests (`npm run test`).
- **21** IPC + temp SQLite integration tests (`tests/integration/`).
- **5** E2E smoke tests — Playwright `_electron` + Vitest (`npm run test:e2e`): launch, import, analyze, export, health check.
- **`npm run test:coverage`** — Vitest v8 coverage on `src/shared` + `electron` with thresholds (lines/stmts ≥ 60%, funcs/branches ≥ 65%).
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — lint, format:check, unit, integration, regression gate, build, E2E; optional coverage.

#### Build & packaging

- `npm run build:check` — lint, test, `regression:gate`, production build.
- `npm run build:prod` / `build:prod:nsis` — electron-builder NSIS (Windows x64).
- `npm run build:prod:portable` — portable artifact.
- `prepare:packaging`, `build:verify-packaging` scripts.
- [INSTALL-QA-CHECKLIST.md](docs/INSTALL-QA-CHECKLIST.md) for manual NSIS QA.

#### Keyboard shortcuts (Phase 2-5)

- **Alt+1–8** — sidebar navigation.
- **Ctrl+Shift+I** — bulk import.
- **F2 / Ctrl+S / Delete** — new / save / delete on Master, Code, CodeValue (skipped when focus in inputs or ConfirmDialog open).

### Changed

- Analysis execution moved from renderer-only to **Main IPC** (`analysis:run`) with shared engine module.
- Test Suite and health check run through Main IPC (aligned with PRD §14).
- DB save failures for analysis history/statistics now surface in StatusBar and analysis log (no silent `Promise.allSettled` swallow).
- Settings `autoRefresh` reloads active feature grids on interval.
- `lint` / `format` / `format:check` cover `src`, `tests`, and `electron`.
- `docs/STATUS.md` through Phase 5 closeout; `ARCHITECTURE.md`, `API.md` published.

### Fixed

- Master bulk import and validation edge cases covered by unit/integration tests.
- `persistAnalysisToDb` rejection path wired so store `.catch()` handlers run on history/statistics failures.
- Duplicate `masterNo` validation on **create** path (save upserts by `masterNo` by design).
- Research DB upgrade preserves data via incremental migration.

### Security

- Renderer: `contextIsolation`, no `nodeIntegration`; preload bridge for IPC.
- Packaged app: Prisma query engine and `.node` binaries outside asar where required.

### Documentation

- PRD, STATUS, TEST-CATALOG, DEFINITION_OF_DONE, RESEARCH_WORKSPACE, RE-PLAYBOOK, ARCHITECTURE, API, RELEASE-1.0.0-SIGNOFF.
- Phase 1–5 deliverable tracking in STATUS.
- **Release 1.0 doc sync:** PRD v1.0.0 · STATUS v1.7.0 · TEST-CATALOG v1.2.0 · README · cross-linked test counts (**148**), NSIS build, i18n ~92%, deferrals.

### Known limitations (v1.0.0)

| Area | Status |
|------|--------|
| **P0-13** Legacy TestCase catalog | **Deferred v1.1** — 0/100 `SRC-LEGACY` verified; 100 DRAFT skeleton only |
| **Prediction** | Heuristic; not legacy-verified (explicit deferral) |
| **CodeValue stats** | Implemented; **legacy unverified** (12 builtin @ 100%) |
| **NSIS installer** | **Setup EXE builds** (`build:prod:nsis`); manual install QA — [INSTALL-QA-CHECKLIST.md](docs/INSTALL-QA-CHECKLIST.md) |
| **E2E** | 5 smoke tests only; not in `build:check` |
| **Menu Edit (L02)** | Sidebar reorder only; full legacy editor deferred |
| **macOS / Linux** | Not supported |

### Upgrade notes

- **Database:** Dev uses `prisma/dev.db`; packaged app copies template to `%APPDATA%` on first launch. Research schema migrates incrementally on upgrade.
- **Settings** persist in localStorage (`csebid-settings-v1`).
- **From legacy MFC:** Use bulk import (TXT/CSV/XLSX) or Research catalog import; see [RE-PLAYBOOK.md](docs/RE-PLAYBOOK.md).

---

## [Unreleased]

### Planned (v1.1+)

- Final doc-driven items: P0-13 legacy catalog import when user JSON available.
- NSIS release QA on clean Windows VM (formal QA sign-off).
- Full legacy Menu Edit editor.
- macOS / Linux packaging (if scoped).

---

[1.0.0]: https://github.com/Hataewoo/e_bid_program/releases/tag/v1.0.0
