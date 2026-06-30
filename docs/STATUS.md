# CS E-Bid Analyzer — Implementation Status

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.7.0 (Release 1.0 closeout) |
| **기준일** | 2026-06-30 |
| **Phase** | **Release 1.0.0 ✅** — Phase 5 closeout + DoD gate audit |
| **빌드 게이트** | `npm run build:check` — lint (`src`·`tests`·`electron`) + **148 tests** + **`regression:gate` (≥95%)** + build |
| **CI 게이트** | `.github/workflows/ci.yml` — lint · **format:check** · unit · integration · regression · build · **E2E** (+ optional coverage) |
| **상태 기준** | ✅ Done · 🔶 Partial · ❌ Missing · ⚠️ Risk (동작하나 레거시 미검증) |

> **Single source of truth:** 구현·검증 상태는 본 문서를 기준으로 판단한다.  
> Phase 1 closeout: 2026-06-30 · Phase 2 closeout: 2026-06-30 · Phase 3 closeout: 2026-06-30 · Phase 4 closeout: 2026-06-30 · Phase 5 closeout: 2026-06-30 · **Release 1.0.0: 2026-06-30** ([RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md)).

---

## 1. Executive Summary

| 영역 | 요약 |
|------|------|
| **Phase 1 (Legacy verify)** | Playbook·import·skeleton·진단·CI gate·CodeValue/Prediction/Research 정책 **완료**. **SRC-LEGACY ≥100 verified** — **미충족** (skeleton 100 DRAFT) |
| **Phase 2 (IPC/UX)** | `analysis:run`·Test Suite/Health IPC, `ConfirmDialog`, **31** structured error codes, CRUD shortcuts, DB persist 실패 알림 **완료**. **[API.md](./API.md) IPC 레퍼런스 ✅** |
| **Phase 3 (Test/Release)** | Integration **21** + E2E **5** + coverage thresholds + NSIS Setup 빌드 + CI workflow + **CHANGELOG 1.0.0 published** ✅. **수동 install QA** · clean VM 재검증 잔여 |
| **Phase 4 (i18n/Docs/P2)** | **4-1~4-10 ✅** — 전 화면 i18n(핵심), `ARCHITECTURE.md`, `API.md`, Research Dashboard, Hypothesis link, Statistics charts. **DoD ✅** — i18n ≥90% · P2-04 sidebar reorder only |
| **Phase 5 (Performance & Cleanup)** | **✅ Closeout** — main bundle **~70 KB gzip** (5-1), Web Worker (5-2), Research DB incremental migration (5-3), renderer `repositories/` + dead code (5-4), Settings autoRefresh → grids (5-5), lint/format → `tests`·`electron` (5-6) |
| **Release 1.0.0** | **✅ Gate closeout** — CHANGELOG published · Admin/Program Info/layout i18n · [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md). **Deferrals:** P0-13 → v1.1 · NSIS manual QA · PO Prediction/CodeValue |
| **스캐폴딩·CRUD** | Master, Code, RE, Research Lab — 프로덕션 수준 |
| **Analysis / Statistics** | STEP2/3·통계 built-in regression **100%**. Analysis **Main IPC** + optional **Web Worker** (≥500 digits). History/Statistics DB 실패 시 StatusBar 알림. CodeValue/Prediction **휴리스틱·레거시 미검증** |
| **검증 게이트** | `regression:gate` 18/18 @100% · `catalog:diagnose` combined **43/43 @100%** (현재 DB 기준) |
| **P1 (Excel, NSIS prep, Backup, Logger)** | 대부분 구현. Keyboard shortcuts **완료**. NSIS **Setup 빌드 ✅** · **수동 QA 체크리스트** 제공 |
| **P2** | Batch Analysis ✅ · Research Dashboard ✅ · Hypothesis ↔ Source ✅ · Chart Visualization ✅. **Menu Edit 🔶** · Auto screenshot ❌ |
| **테스트** | Vitest **148** (유닛 **127** + 통합 **21**) + E2E **5**; Feature tests **13** (`tests/features/`); Hooks **11**; CI **7 gates** (lint · format · unit · integration · regression · build · e2e) |
| **i18n** | **~92%** — Master·Code·Analysis·Research·CodeValue·RE·Statistics·Settings·Admin·Program Info·layout chrome ✅. **잔여:** locale label `"한국어"`, file-parser error lines |
| **문서** | PRD, STATUS, TEST-CATALOG, DoD, **CHANGELOG (1.0.0)**, INSTALL-QA-CHECKLIST, RE-PLAYBOOK, **ARCHITECTURE.md**, **API.md**, **RELEASE-1.0.0-SIGNOFF** |

---

## 2. Phase 1 Deliverables (1-1 … 1-10)

| Step | Deliverable | Status |
|------|-------------|--------|
| 1-1 | [RE-PLAYBOOK.md](./RE-PLAYBOOK.md) — 레거시 관측 → Verification | ✅ |
| 1-2 | Catalog import JSON/CSV, duplicate policy, `_catalog` metadata | ✅ |
| 1-3 | Master 00–99 skeleton (100 DRAFT) + fixtures | ✅ |
| 1-4 | User legacy JSON import → suite | ⏸️ **blocked** (user data 대기) |
| 1-5 | FAIL 진단 + STEP2/3/Statistics engine · combined ≥95% | ✅ 43/43 @100% |
| 1-6 | CodeValue — legacy unverified, 12 SRC-BUILTIN @100%, UI banner | ✅ |
| 1-7 | Prediction — heuristic, 12 SRC-BUILTIN @100%, UI banner | ✅ |
| 1-8 | Research Outputs Policy B (Draft 제안) | ✅ |
| 1-9 | CI `regression:gate` ≥95% in `build:check` | ✅ |
| 1-10 | STATUS + TEST-CATALOG closeout | ✅ (본 갱신) |

**Phase 1 exit (Release P0-13):** ❌ — `SRC-LEGACY` verified cases **0/100**; synthetic/builtin suites only.

---

## 2b. Phase 2 Deliverables (2-1 … 2-6)

| Step | Deliverable | Status |
|------|-------------|--------|
| 2-1 | `analysis:run` IPC — Main `runAnalysisPipeline` | ✅ |
| 2-2 | `analysis:runRegressionSuite` / `runFullSuite` / `healthCheck` IPC + dual-run test | ✅ |
| 2-3 | `ConfirmDialog` — `window.confirm` 제거 (Master/Code/Analysis/Settings) | ✅ |
| 2-4 | Structured error codes **31** (`VAL_*`, `DB_*`, `IPC_*`) + `formatAppErrors` | ✅ |
| 2-5 | Keyboard F2 / Ctrl+S / Delete (Master, Code, CodeValue) + Settings help | ✅ |
| 2-6 | AnalysisHistory / Statistics DB persist — 실패 시 StatusBar·로그 알림 | ✅ |

**Phase 2 exit (DoD):** ✅ — 2-1~2-6 완료 · [API.md](./API.md) (**Phase 4-6**).

---

## 2c. Phase 3 Deliverables (3-1 … 3-7)

| Step | Deliverable | Status |
|------|-------------|--------|
| 3-1 | IPC + temp SQLite integration tests ≥15 | ✅ **21 tests** (`tests/integration/`) |
| 3-2 | E2E smoke ≥5 (Playwright + Electron) | ✅ **5 tests** (`tests/e2e/`, `npm run test:e2e`) |
| 3-3 | `test:coverage` + Vitest thresholds | ✅ **≥60% lines/stmts, ≥65% funcs/branches** (`src/shared`, `electron`) |
| 3-4 | `CHANGELOG.md` v1.0.0 published | ✅ [CHANGELOG.md](../CHANGELOG.md) |
| 3-5 | `build:prod:nsis` + install QA checklist | ✅ build OK · [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) |
| 3-6 | CI — integration + E2E + regression gate | ✅ [.github/workflows/ci.yml](../.github/workflows/ci.yml) |
| 3-7 | `STATUS.md` Phase 3 closeout (v1.3.0) | ✅ (본 갱신) |

**Phase 3 exit (DoD):** ✅ — 자동화·문서 **7항목 완료** + CHANGELOG published. **잔여:** [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) §4 수동 실행·서명, clean VM NSIS 재검증.

---

## 2d. Phase 4 Deliverables (4-1 … 4-10)

| Step | Deliverable | Status |
|------|-------------|--------|
| 4-1 | Master + Code screens full i18n (`messages.ts` ko/en, stores `translate()`) | ✅ |
| 4-2 | Analysis + Analysis History + Raw Data i18n | ✅ |
| 4-3 | Research tab full i18n (Experiments ~ Test Suite) | ✅ |
| 4-4 | CodeValue + RE + Statistics remaining hardcoded i18n | ✅ |
| 4-5 | `ARCHITECTURE.md` — process boundaries, modules, data flow | ✅ |
| 4-6 | `API.md` — full IPC channel reference (51 invoke + 2 events) | ✅ |
| 4-7 | Research Dashboard MVP (pass rate trend, experiment list, recent FAIL) | ✅ |
| 4-8 | Hypothesis ↔ experiment/source link (`sourceField`, cross-tab navigation) | ✅ |
| 4-9 | Statistics chart visualization (Distribution, Low/High stacked, Frequency bars) | ✅ |
| 4-10 | `STATUS.md` Phase 4 closeout (v1.5.0) | ✅ |

**Phase 4 exit (DoD):** ✅ — **4-1~4-10 + i18n ≥90% + P2-04 scope** (sidebar reorder only). See Release 1.0 signoff.

---

## 2e. Phase 5 Deliverables (5-1 … 5-6)

| Step | Deliverable | Status |
|------|-------------|--------|
| 5-1 | Route-level code splitting (`React.lazy` pages, `Suspense`, vendor chunks) | ✅ |
| 5-2 | Web Worker analysis for large `masterValue` (Settings toggle, ≥500 digits) | ✅ |
| 5-3 | Research DB incremental migration (`research-schema-migration.ts`, legacy v1→v2 preserve) | ✅ |
| 5-4 | Dead code cleanup + renderer `repositories/` 패턴 통일 (Research/Master/Code/Statistics) | ✅ |
| 5-5 | Settings `autoRefresh` → active route feature grid reload (`useFeatureGridAutoRefresh`) | ✅ |
| 5-6 | `lint` / `format` / `format:check` → `src` + `tests` + `electron` | ✅ |
| 5-7 | `STATUS.md` Phase 5 / Release 1.0 closeout | ✅ v1.7.0 |

**Phase 5 exit (DoD):** ✅ — **5-1~5-6 완료** ([DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) §Phase 5). Superseded by **v1.7.0** Release 1.0 closeout.

**Phase 5 outcomes (요약):**

| Area | Before | After (5-x) |
|------|--------|-------------|
| Main bundle | **1.68 MB / 476 KB gzip** (monolith) | **`index` ~246 KB / ~70 KB gzip** + per-route chunks (5-1) |
| Large `masterValue` analysis | Main/UI thread | Web Worker ≥500 digits, Settings toggle (5-2) |
| Research DB upgrade | drop/recreate → **data loss** | Incremental v1→v2 migration + integration tests (5-3) |
| Renderer data layer | Mixed `repository/` shims + direct IPC | Unified `repositories/` + Research repo (5-4) |
| Settings autoRefresh | DB status only | Active route grids reload, dirty/saving skip (5-5) |
| Lint / format scope | `src` only | `src` · `tests` · `electron` + CI `format:check` (5-6) |

**Bundle (production build, 2026-06-30, post–5-1):**

| Chunk | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index` (app shell + shared hooks) | ~246 KB | **~70 KB** | was single **1.68 MB / 476 KB** before 5-1 |
| `react-vendor` | ~287 KB | ~92 KB | react + react-dom + react-router |
| `ag-grid` | ~952 KB | ~265 KB | loaded with grid routes only |
| `xlsx` | ~430 KB | ~143 KB | on-demand (Code export etc.) |
| Per-route pages | 7–67 KB each | 2–17 KB | Master, Code, Analysis, Research, Statistics, … |
| `analysis.worker.ts` | — | — | Large masterValue STEP2/3 engine (≥500 digits) |

---

## 3. Screen Status (B01–B07 + Legacy)

| ID | Route | Feature Path | UI | Backend/Engine | i18n | Overall |
|----|-------|--------------|-----|----------------|------|---------|
| B01 MASTER | `/master` | `features/master/` | ✅ | ✅ IPC + Prisma | ✅ | ✅ |
| B02 CODE | `/code` | `features/code/` | ✅ | ✅ | ✅ | ✅ |
| B03 RE | `/reverse-engineering` | `features/reverse-engineering/` | ✅ | ✅ (client) | ✅ | ✅ |
| B04 Research | `/research` | `features/research/` | ✅ | ✅ Test Suite via IPC | ✅ | ✅ |
| B05 Analysis | `/analysis` | `features/analysis/` | ✅ | ✅ **analysis:run IPC** + persist notify | ✅ | ✅ |
| B06 Statistics | `/statistics` | `features/statistics/` | ✅ | ✅ real engine + **charts** | ✅ | ✅ |
| B07 Settings | `/settings` | `features/settings/` | ✅ | ✅ backup/health IPC · **autoRefresh grids** | 🔶 | ✅ |
| L01 Code Value | `/code-value` | `features/codeValue/` | ✅ | ⚠️ pattern stats | ✅ | 🔶 |
| L02 Menu Edit | — | sidebar reorder only | 🔶 | — | 🔶 | 🔶 |
| L03 Program Info | modal | `components/layout/ProgramInfoModal` | ✅ | ✅ | 🔶 | ✅ |
| Admin Import | toolbar | `features/admin/` | ✅ | ✅ bulk IPC | 🔶 | ✅ |

**Route note:** PRD `algorithm-research` → 코드 `research` + redirect (`src/app/router.tsx`).

---

## 4. Algorithm Verification Status

| Algorithm | Implementation | Verification | Pass Rate | Notes |
|-----------|----------------|----------------|-----------|-------|
| Digit parse / normalize | `dataParser.ts` | ✅ unit tests | — | |
| STEP2 (low 0–4) | `analysisEngine.ts` | ✅ regression + CI gate | **100%** (18 checks) | `engine-regression-cases.json` |
| STEP3 (high 5–9) | `analysisEngine.ts` | ✅ regression | **100%** | |
| Statistics summary | `statisticsEngine.ts` | ✅ regression | **100%** | Korean format string |
| Low/High patterns | `analysisEngine.ts` | 🔶 partial | subset in regression | |
| CodeValue stats | `buildCodeValueStats` | ⚠️ **unverified** | 12 builtin @100% | UI banner; 0 SRC-LEGACY |
| Prediction | `predictionEngine.ts` | ⚠️ **heuristic** | 12 builtin @100% | UI banner; 0 SRC-LEGACY |
| Batch 00–99 | `batchAnalysis.ts` | 🔶 | unit smoke | |
| RE grouping / frequency | `reverse-engineering/services/` | 🔶 | shared `digitSequence` | |

**P0-13 gate:** Full legacy TestCase catalog ≥95% on **≥100 SRC-LEGACY** — **NOT MET**.  
Current: **37 PASS (SRC-BUILTIN/synthetic)** + **100 DRAFT skeleton** — see [TEST-CATALOG.md](./TEST-CATALOG.md) §2, §10.

---

## 5. Priority Matrix (P0 / P1 / P2)

### P0 — Must Have

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| P0-01 | Master CRUD | ✅ | `master-store`, IPC |
| P0-02 | Code CRUD | ✅ | `code-store`, IPC |
| P0-03 | Research Lab | ✅ | `features/research/` |
| P0-04 | RE Analysis | ✅ | STEP1–6 panels |
| P0-05 | Legacy Master import workflow | 🔶 | Catalog import ✅; Experiment auto-pipeline ❌ |
| P0-06 | STEP2 | ✅ | regression + `regression:gate` |
| P0-07 | STEP3 | ✅ | regression + `regression:gate` |
| P0-08 | Code Value Service | ⚠️ | implemented, **legacy unverified** |
| P0-09 | Analysis Execute UI | ✅ | `AnalysisFeature` |
| P0-10 | AnalysisHistory | ✅ | `persistAnalysisToDb` + **Phase 2-6** StatusBar 알림 |
| P0-11 | Statistics aggregation | ✅ | engine + UI + DB persist + **Phase 2-6** 알림 |
| P0-12 | Prediction | ⚠️ | heuristic only |
| P0-13 | TestCase Pass ≥95% @ legacy scale | ❌ | needs Phase 1-4 user legacy data |

### P1 — Should Have

| ID | Item | Status |
|----|------|--------|
| P1-01 | Excel Import/Export | ✅ |
| P1-02 | NSIS Installer | 🔶 **Setup EXE 빌드 ✅**; 수동 install QA — [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) |
| P1-03 | DB Backup/Restore | ✅ |
| P1-04 | File Logger | ✅ |
| P1-05 | Keyboard Shortcuts | ✅ **Phase 2-5** — Alt+1–8, Ctrl+Shift+I, F2/Ctrl+S/Delete (Master/Code/CodeValue) |
| P1-06 | Code Value UI | ✅ |
| P1-07 | Program Info | ✅ |
| P1-08 | Native Save Dialog | ✅ |

### P2 — Nice to Have

| ID | Item | Status |
|----|------|--------|
| P2-01 | Batch Master Analysis | ✅ |
| P2-02 | Research Dashboard | ✅ |
| P2-03 | Hypothesis ↔ Source | ✅ |
| P2-04 | Menu Edit | 🔶 sidebar reorder |
| P2-05 | Auto Screenshot | ❌ |
| P2-06 | Chart Visualization | ✅ |
| P2-07 | macOS / Linux | ❌ |

---

## 6. Architecture Deviations (PRD vs Code)

| Topic | PRD expectation | Actual | Phase to fix |
|-------|-----------------|--------|--------------|
| Analysis execution | Main IPC `analysis:run` | **✅ Phase 2-1** — Analysis/Research via IPC | — |
| Test Suite / Health | Main IPC `analysis:run*Suite`, `analysis:healthCheck` | **✅ Phase 2-2** + dual-run test | — |
| TestCase entity | `TestCase` table | `Verification` table | Documented |
| Research route | `algorithm-research` | `research` | OK (redirect) |
| Error UX | StatusBar, no `alert()` | **✅ Phase 2-3** — `ConfirmDialog`; **✅ 2-4** error codes | — |
| DB persist UX | User notified on save fail | **✅ Phase 2-6** — `notifyPersistenceFailure` | — |
| IPC documentation | [API.md](./API.md) — 51 invoke + 2 events | ✅ | Phase 4-6 |
| Repository pattern | All domains | **✅ renderer `repositories/`** (master, code, codeValue, research, statistics) — **Phase 5-4** | — |
| E2E in local gate | Optional in `build:check` | E2E **CI only** (`test:e2e:ci`) | By design |

---

## 7. Test & CI Status

| Layer | Count | Location | Status |
|-------|-------|----------|--------|
| Unit (engine/utils/hooks/features) | **127** | `tests/` (excl. integration/e2e) | ✅ |
| IPC / Integration | **21** | `tests/integration/` | ✅ **Phase 3-1** + **5-3** migration tests |
| Feature (research/statistics) | **13** | `tests/features/` | ✅ **Phase 4** |
| Hooks | **11** | `tests/hooks/` | ✅ **Phase 5-5** auto-refresh routing |
| E2E | **5** | `tests/e2e/` | ✅ **Phase 3-2** |
| **Total Vitest** | **148** | `npm run test` | ✅ |
| CI | 1 workflow | `.github/workflows/ci.yml` | ✅ lint · **format:check** · unit · **integration** · **regression:gate** · build · **e2e** (+ optional coverage) |

### Verification commands

| Command | Gate | Latest (2026-06-30) |
|---------|------|---------------------|
| `npm run regression:gate` | Built-in ≥ **95%** | **18/18 (100%)** |
| `npm run catalog:diagnose` | Combined + CV + Pred baselines | **43/43 (100%)** |
| `npm run test:unit` | Vitest (unit only) | **127 passed** |
| `npm run test:integration` | IPC + SQLite + schema migration | **21 passed** |
| `npm run test` | Vitest (unit + integration) | **148 passed** |
| `npm run lint` | ESLint `src` · `tests` · `electron` | ✅ **Phase 5-6** |
| `npm run format:check` | Prettier same scope | ✅ **Phase 5-6** (CI gate) |
| `npm run test:e2e` | Playwright `_electron` + Vitest | **5 passed** (import → analyze → export → health) |
| `npm run test:coverage` | Vitest + v8 | **148 tests** + threshold gate (**~65%** lines on engine/DB scope) |
| `npm run build:prod:nsis` | electron-builder | **✅** `release/CS E-Bid Analyzer-Setup-1.0.0-x64.exe` |

### Phase 1 fixtures & tools

| Asset | Phase | Notes |
|-------|-------|-------|
| `engine-regression-cases.json` | 1-5 | 10 cases → 18 field checks |
| `verificationImport.ts` + templates | 1-2 | JSON/CSV catalog |
| `legacy-master-skeleton-00-99.*` | 1-3 | 100 DRAFT |
| `code-value-verification-cases.ts` | 1-6 | 12 SRC-BUILTIN |
| `prediction-verification-cases.ts` | 1-7 | 12 SRC-BUILTIN |
| `outputFillPolicy.ts` + Outputs UI | 1-8 | Policy B |
| `regressionGate.ts` + CI | 1-9 | Exit code 2 if &lt;95% |
| `suiteDiagnostics.ts` + `catalog:diagnose` | 1-5 | Markdown FAIL report |
| `analysisRunService.ts` + `analysis:run` IPC | 2-1 | Shared Main/Renderer engine |
| `analysis-suite-handler.ts` | 2-2 | Regression / full suite / health |
| `ConfirmDialog` + `confirm-dialog-store` | 2-3 | Promise-based modal |
| `app-error-codes.ts` + `formatAppErrors` | 2-4 | 31 codes in `messages.ts` |
| `useCrudKeyboardShortcuts` | 2-5 | F2 / Ctrl+S / Delete |
| `persistAnalysisToDb` + `notifyPersistenceFailure` | 2-6 | History/Statistics fail UX |
| `tests/integration/` + `ipc-database.integration.test.ts` | 3-1 | 19 IPC + SQLite tests |
| `tests/integration/research-schema-migration.test.ts` | 5-3 | 2 migration tests |
| `tests/e2e/` + Playwright `_electron` | 3-2 | 5 smoke tests |
| `vitest.e2e.config.ts` + `test:coverage` thresholds | 3-3 | E2E/coverage config |
| [CHANGELOG.md](../CHANGELOG.md) v1.0.0 published | 3-4 | Release notes |
| `build:prod:nsis` + [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) | 3-5 | NSIS artifact + manual QA |
| `.github/workflows/ci.yml` | 3-6 | CI: lint · test · integration · regression · build · e2e |
| `messages.ts` ko/en + `translate()` / `useI18n()` | 4-1~4-4 | Master·Code·Analysis·Research·CodeValue·RE·Statistics i18n |
| [ARCHITECTURE.md](./ARCHITECTURE.md) v1.0.0 | 4-5 | Process boundaries, modules, data flow |
| [API.md](./API.md) v1.0.0 | 4-6 | 51 invoke + 2 progress events |
| Research Dashboard + suite history (`localStorage`) | 4-7 | Pass rate trend, experiment list, recent FAIL |
| Hypothesis `sourceField` + cross-tab navigation | 4-8 | Experiment/source link, Verification `hypothesisId` |
| Statistics charts (`DigitDistributionBarChart`, `LowHighStackedChart`) | 4-9 | Distribution · Low/High stacked · Frequency ratio bars |
| `lazy-page.ts` + `React.lazy` route pages + `Suspense` | 5-1 | Main bundle **62 KB gzip**; per-feature chunks |
| `analysis.worker.ts` + `analysisWorkerService` | 5-2 | Large masterValue (≥500) off main UI thread |
| `research-schema-migration.ts` | 5-3 | Incremental Research DB migration; legacy v1→v2 preserve |
| Renderer `repositories/` (master, code, codeValue, research, statistics) | 5-4 | IPC thin wrappers; removed `repository/` shims + dead types |
| `useFeatureGridAutoRefresh` + `refreshActiveFeatureGrids` | 5-5 | Settings interval reloads active route grids (skips dirty/saving) |
| `lint` / `format:check` (`src` · `tests` · `electron`) | 5-6 | ESLint env overrides (browser / vitest / node) + Prettier scope + CI |
| `STATUS.md` v1.7.0 Release 1.0 closeout | 5-7 | 본 갱신 — outcomes table, test/CI counts, doc sync |

Reports (local): `imports/suite-failure-report.md`, `codevalue-verification-report.md`, `prediction-verification-report.md`.

---

## 8. Documentation Index

| Document | Status | Purpose |
|----------|--------|---------|
| [PRD.md](./PRD.md) | ✅ **v1.0.0** | Requirements (Release 1.0 sync) |
| [STATUS.md](./STATUS.md) | ✅ **v1.7.0** | Live implementation status (**Release 1.0 closeout**) |
| [TEST-CATALOG.md](./TEST-CATALOG.md) | ✅ **v1.2.0** | TestCase index + automated test inventory |
| [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) | ✅ | Phase gates + **Release 1.0.0 Gate** |
| [CHANGELOG.md](../CHANGELOG.md) | ✅ **v1.0.0 published** | Release notes |
| [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md) | ✅ | Gate audit + deferrals |
| [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) | ✅ | NSIS install QA (Phase 3-5) |
| [RESEARCH_WORKSPACE.md](./RESEARCH_WORKSPACE.md) | ✅ | Research policy (incl. Policy B) |
| [RE-PLAYBOOK.md](./RE-PLAYBOOK.md) | ✅ | Legacy observe → Verification |
| [API.md](./API.md) | ✅ **v1.0.0** | Phase 4-6 — IPC channel reference |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | ✅ **v1.0.0** | Phase 4-5 — system architecture |

---

## 9. Known Risks

1. **Prediction/CodeValue** — UI disclaimers; **0 SRC-LEGACY** verified.
2. ~~Research auto-fill policy~~ — **✅ Phase 1-8** Policy B.
3. ~~Renderer analysis via Main IPC~~ — **✅ Phase 2-1**.
4. ~~**Research schema** drop/recreate on upgrade~~ — **✅ Phase 5-3** incremental migration (`electron/database/research/research-schema-migration.ts`).
5. ~~**`API.md` missing**~~ — **✅ Phase 4-6** ([API.md](./API.md)).
6. **NSIS install QA** — Setup EXE builds; manual checklist §4 not signed off ([INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md)).
7. **P0-13 / SRC-LEGACY** — Full legacy catalog verification still **blocked** on user data (unchanged by Phase 5).

---

## 10. Next Phase Entry Criteria

| Phase | Start when | Ready? |
|-------|------------|--------|
| **Phase 1** closeout | 1-1 … 1-10 docs/tools | ✅ (P0-13 excepted) |
| **Phase 2** (IPC/UX) | Regression infra stable | ✅ **2-1…2-6 done** · `API.md` ✅ |
| **Phase 3** (Test/Release) | Phase 2 IPC + confirm + error UX stable | ✅ **3-1…3-7** · manual install QA 잔여 |
| **Phase 4** (i18n/P2/Docs) | Phase 3 automation stable | ✅ **closeout** — i18n ≥90% · P2-04 sidebar reorder |
| **Release 1.0** | Phase 5 closeout | ✅ **Gate audit** — [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md) |
| **Phase 5** (Performance & Cleanup) | Phase 4 closeout | ✅ **5-1~5-6 closeout** · Release 1.0 doc sync |

**Release 1.0.0 deferrals (accepted):** P0-13 legacy catalog → v1.1 · NSIS manual QA sign-off · PO Prediction/CodeValue sign-off.

**Unblock P0-13:** Provide legacy JSON per [RE-PLAYBOOK](./RE-PLAYBOOK.md) → Phase 1-4 import → fill §5.3 skeleton.

**Backlog (post–Phase 5, not scheduled):**

| Item | Notes |
|------|-------|
| P0-13 legacy catalog (SRC-LEGACY) | Deferred v1.1 — pipeline ready; needs legacy user JSON |
| NSIS manual install QA | Setup builds ✅; human QA on clean VM — [INSTALL-QA-CHECKLIST.md](./INSTALL-QA-CHECKLIST.md) |
| P2-04 Menu Edit | Sidebar reorder ✅ (v1.0 scope); full legacy editor deferred |
| P2-05 Auto Screenshot | Research integration ❌ |
| P2-07 macOS / Linux | Not started |
| Release 1.0.0 doc sync | ✅ PRD · STATUS · TEST-CATALOG · CHANGELOG · README |

See [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md).

---

*Maintainers: update on screen, algorithm, or catalog changes.*
