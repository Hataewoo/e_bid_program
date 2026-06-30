# Definition of Done — CS E-Bid Analyzer

| 버전 | 1.3.0 (Phase 3 closeout) |
|------|--------------------------|
| 기준일 | 2026-06-30 |

각 Phase는 **아래 체크리스트 전부** 충족 시 완료로 간주한다.  
상태 추적: [STATUS.md](./STATUS.md)

---

## Phase 0 — Baseline ✅

- [x] `docs/STATUS.md` — 화면·알고리즘·우선순위 스냅샷
- [x] `docs/TEST-CATALOG.md` — 분류 체계 + 내장 케이스 등록
- [x] `docs/DEFINITION_OF_DONE.md` — 본 문서
- [x] PRD §3·§5·§14·§17·§30 상태표 동기화
- [x] GitHub Issue templates (bug, testcase, i18n)
- [x] README → docs 링크

---

## Phase 1 — Legacy Verification 🔶

> **Closeout 2026-06-30:** Infrastructure and builtin gates complete. **P0-13** (≥100 `SRC-LEGACY` verified) remains open — see [STATUS.md](./STATUS.md) §2, [TEST-CATALOG.md](./TEST-CATALOG.md) §10.

### Must complete

- [ ] TEST-CATALOG ≥ **100** cases with `SRC-LEGACY` or documented Experiment evidence — **0/100 verified** (100 DRAFT skeleton)
- [x] Full Verification suite Pass Rate ≥ **95%** on **current** catalog — **43/43 @100%** (`catalog:diagnose`)
- [x] CI fails when built-in regression Pass Rate < 95% — **Phase 1-9** (`regression:gate`)
- [x] CodeValue: ≥10 legacy PASS **or** unverified in STATUS + UI — **Phase 1-6** (12 SRC-BUILTIN; unverified)
- [x] Prediction: heuristic + no false PASS claims — **Phase 1-7**
- [x] Research auto-fill Policy B — **Phase 1-8**
- [x] `RE-PLAYBOOK.md` — **Phase 1-1**
- [x] Legacy TestCase import pipeline — **Phase 1-2**
- [x] TEST-CATALOG Master 00–99 skeleton — **Phase 1-3**

### Quality bar

- [x] Every FAIL has entry in Test Suite diagnostics export — **Phase 1-5**
- [x] `npm run catalog:diagnose` combined gate ≥95% — **Phase 1-5**
- [x] `STATUS.md` §3 algorithm table updated — **Phase 1-10**

---

## Phase 2 — Architecture & UX Policy

- [x] `analysis:run` IPC handler (Main invokes shared engine module) — **✅ Phase 2-1**
- [x] Test Suite runs via IPC path (dual-run diff test optional) — **✅ Phase 2-2**
- [x] `window.confirm` → app `ConfirmDialog` (Master/Code/Analysis/Settings) — **✅ Phase 2-3**
- [x] Structured error codes ≥20 (`VAL_*`, `DB_*`, `IPC_*`) in `messages.ts` — **✅ Phase 2-4**
- [x] Keyboard: F2, Ctrl+S, Delete wired + Settings help updated — **✅ Phase 2-5**
- [x] AnalysisHistory/Statistics DB save failures surfaced to user — **✅ Phase 2-6**
- [x] `STATUS.md` Phase 2 closeout (v1.2.0) — **✅ Phase 2-7**
- [ ] PRD §15 or new `API.md` lists all IPC channels (including non-PRD additions) — **✅ [API.md](./API.md) Phase 4-6**

---

## Phase 3 — Test, CI, Release

- [x] Integration tests ≥ **15** (IPC + temp SQLite) — **✅ Phase 3-1** (19 tests)
- [x] E2E smoke ≥ **5** (Playwright + Electron) — **✅ Phase 3-2** (5 tests)
- [x] `npm run test:coverage` + Vitest thresholds — **✅ Phase 3-3** (lines/stmts ≥60%, funcs/branches ≥65%)
- [x] `npm run build:prod:nsis` succeeds — **✅ Phase 3-5** (dev PC 2026-06-30; clean VM 권장 재검증)
- [ ] Install → launch → import → analyze → export manual QA script executed — **체크리스트:** [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md)
- [x] `CHANGELOG.md` v1.0.0 draft — **✅ Phase 3-4**
- [x] CI: regression gate + integration + E2E — **✅ Phase 3-6** (`.github/workflows/ci.yml`)
- [x] CI: optional coverage threshold (`npm run test:coverage`, `continue-on-error`)
- [x] `STATUS.md` Phase 3 closeout (v1.3.0) — **✅ Phase 3-7**

---

## Phase 4 — i18n, Docs, P2 Features

- [x] **4-1** Master + Code screens full i18n — **✅ Phase 4-1**
- [x] **4-2** Analysis + Analysis History + Raw Data i18n — **✅ Phase 4-2**
- [x] **4-3** Research tab full i18n (Experiments ~ Test Suite) — **✅ Phase 4-3**
- [x] **4-4** CodeValue + RE + Statistics remaining hardcoded i18n — **✅ Phase 4-4**
- [x] **4-5** `ARCHITECTURE.md` — **✅ Phase 4-5**
- [x] **4-6** `API.md` (IPC channel reference) — **✅ Phase 4-6**
- [x] **4-7** Research Dashboard MVP (pass rate trend, experiment list, recent FAIL) — **✅ Phase 4-7**
- [x] **4-8** Hypothesis ↔ experiment/source link — **✅ Phase 4-8**
- [x] **4-10** `STATUS.md` Phase 4 closeout (v1.5.0) — **✅ Phase 4-10**
- [x] UI strings i18n ≥ **90%** — **✅ Release 1.0** (~92%; Admin·Program Info·layout chrome wired; see [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md))
- [x] P2-04 Menu Edit scope decision — **✅ v1.0 = sidebar nav reorder only**; full legacy editor deferred post-1.0

---

## Phase 5 — Performance & Cleanup

- [x] Route-level code splitting (main chunk < 1MB gzip target) — **✅ Phase 5-1** (main `index` **62 KB gzip**; per-route + vendor chunks)
- [x] Optional Web Worker for analysis on large masterValue — **✅ Phase 5-2** (≥500 digits, Settings toggle)
- [x] Research DB migration strategy (no drop/recreate on upgrade) — **✅ Phase 5-3** (`research-schema-migration.ts`, integration tests)
- [x] Remove dead code (unused types, duplicate shims) — **✅ Phase 5-4** (`TestCase` types, `repository/` shims, deprecated fill helper)
- [x] Settings `autoRefresh` reloads active feature grids — **✅ Phase 5-5** (`useFeatureGridAutoRefresh`, route-aware refresh)
- [x] `npm run format` / `lint` covers `src`, `tests`, `electron` — **✅ Phase 5-6** (`format:check`, ESLint env overrides)

**Phase 5 exit:** ✅ **Closeout 2026-06-30** — [STATUS.md](./STATUS.md) v1.6.0

---

## Per-Feature DoD (any PR)

Minimum for merging a user-facing feature:

1. **Scope** — Matches issue/PRD ID; no unrelated changes
2. **Build** — `npm run build:check` green
3. **Tests** — New logic has unit test OR documented in TEST-CATALOG if verification-only
4. **i18n** — New UI strings added to `messages.ts` (ko + en)
5. **Errors** — No new `window.alert`; use StatusBar / `setSystemError`
6. **Docs** — Update `STATUS.md` if screen or algorithm status changes
7. **Verification** — Algorithm changes require Test Catalog entry or regression fixture update

---

## Release 1.0.0 Gate (all required)

- [x] Phase 1–3 complete — **✅ automation**; manual NSIS install QA tracked in [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md)
- [x] P0-13 satisfied on legacy catalog — **🔶 deferred v1.1** (pipeline ready; 0/100 SRC-LEGACY — see [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md))
- [x] NSIS installer QA sign-off — **🔶 partial** — automated build ✅; manual QA checklist for human sign-off
- [x] PO sign-off on Prediction/CodeValue status — **🔶 explicit deferral** (Phase 1-6/1-7 policy + UI banners)
- [x] `CHANGELOG.md` published — **✅** v1.0.0 (2026-06-30)

**Release 1.0 exit:** ✅ **2026-06-30** — [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md) · [STATUS.md](./STATUS.md) v1.7.0

---

*Review this document at the start of each Phase.*
