# CS E-Bid Analyzer — Test Catalog

| 항목 | 내용 |
|------|------|
| **버전** | 1.2.0 (Release 1.0 sync) |
| **기준일** | 2026-06-30 |
| **Release** | **1.0.0** — [RELEASE-1.0.0-SIGNOFF.md](./RELEASE-1.0.0-SIGNOFF.md) |
| **Phase 1 결과** | 인프라·builtin 게이트 ✅ · **SRC-LEGACY verified 0/100** 🔶 deferred v1.1 |
| **Pass gate (CI)** | Built-in regression ≥ **95%** via `npm run regression:gate` |
| **Pass gate (full)** | Combined suite ≥ **95%** via `npm run catalog:diagnose` (P0-13 @ legacy scale TBD) |

---

## 1. Classification Scheme

### 1.1 Category (`CAT-*`)

| Code | Domain | Engine field(s) | Priority |
|------|--------|-----------------|----------|
| `CAT-STEP2` | Low digit extraction (0–4) | `step2` | P0 |
| `CAT-STEP3` | High digit extraction (5–9) | `step3` | P0 |
| `CAT-STAT` | Statistics summary string | `statistics` | P0 |
| `CAT-PRED` | Prediction output | `prediction` | P0 (last) |
| `CAT-CV` | CodeValue statistics rows | `codeValueStats` | P0 |
| `CAT-PAT` | Low/High pattern flags | `lowPatterns`, `highPatterns` | P1 |
| `CAT-EDGE` | Empty, format, boundary | mixed | P0 |
| `CAT-BATCH` | Batch 00–99 | per-master | P1 |

### 1.2 Source (`SRC-*`)

| Code | Meaning |
|------|---------|
| `SRC-BUILTIN` | Bundled fixture (CI / vitest) |
| `SRC-SAMPLE` | Bundled sample Verification import |
| `SRC-LEGACY` | Observed legacy program output |
| `SRC-EXPERIMENT` | Research Experiment legacy column |
| `SRC-MANUAL` | Hand-authored edge case |

### 1.3 Status

| Status | Meaning |
|--------|---------|
| `PASS` | Engine matches expected |
| `FAIL` | Mismatch — fix engine or expected |
| `DRAFT` | Expected not yet confirmed from legacy |
| `SKIP` | Out of scope for current release |

### 1.4 ID Format

```
TC-{CAT}-{NNN}
Example: TC-STEP2-001
```

---

## 2. Inventory Summary (Phase 1 closeout)

| Source | Cases | Checks / rows | In CI | Legacy verified | Status |
|--------|-------|---------------|-------|-----------------|--------|
| `engine-regression-cases.json` | 10 | 18 field checks | ✅ `regression:gate` | 🔶 synthetic | **PASS @100%** |
| `sample-verification-cases.json` | 3 | 3 DB records | 🔶 manual import | 🔶 synthetic | PASS when imported |
| `code-value-verification-cases.ts` | 12 | 32 stat rows | ✅ vitest | 0 SRC-LEGACY | **PASS @100%** · unverified |
| `prediction-verification-cases.ts` | 12 | 54 field checks | ✅ vitest | 0 SRC-LEGACY | **PASS @100%** · heuristic |
| `legacy-master-skeleton-00-99.json` | 100 | 100 catalog rows | ❌ DRAFT | 0 | **DRAFT** |
| Verification DB (runtime) | variable | per import | 🔶 `catalog:diagnose` | user-dependent | **25/25 @100%** (dev DB) |
| Experiment legacy outputs | variable | per experiment | partial | per experiment | — |

### Totals

| Metric | Count |
|--------|-------|
| Catalog rows documented | **137** (10+3+12+12+100) |
| **PASS** (synthetic/builtin) | **37** case definitions |
| **SRC-LEGACY verified** | **0** |
| **DRAFT** (skeleton) | **100** |
| Combined diagnose gate (dev DB) | **43/43 @100%** |

**P0-13 (Release 1.0):** ≥100 `SRC-LEGACY` @ ≥95% — **Deferred v1.1** (pipeline ready; awaiting legacy observation per [Phase 1-4](./DEFINITION_OF_DONE.md)).

---

## 3. Registered Cases — Built-in Regression

File: `src/shared/fixtures/engine-regression-cases.json`  
Runner: `regressionSuite.ts` · Gate: `regressionGate.ts` · CI: `npm run regression:gate`

| ID | Name | Category | masterNo | Key assertion |
|----|------|----------|----------|---------------|
| TC-STEP2-001 | STEP2/3 — digits 0-9 | CAT-STEP2/3 | 00 | step2=`01234`, step3=`56789` |
| TC-STEP2-002 | STEP2/3 — low only | CAT-STEP2 | 01 | step3 empty |
| TC-STEP3-001 | STEP2/3 — high only | CAT-STEP3 | 02 | step2 empty |
| TC-STEP2-003 | STEP2/3 — mixed sequence | CAT-STEP2/3 | 03 | long alternating |
| TC-EDGE-001 | STEP2/3 — formatted input | CAT-EDGE | 04 | comma/space/newline strip |
| TC-STAT-001 | Statistics — digit count | CAT-STAT | 05 | 10 digits, 50/50 |
| TC-STAT-002 | Statistics — all low | CAT-STAT | 06 | 100% low |
| TC-PAT-001 | Low pattern — threeOrMore | CAT-PAT | 07 | `000` + `55` |
| TC-EDGE-002 | Single digit low | CAT-EDGE | 08 | one char |
| TC-STEP2-004 | Long mixed run | CAT-STEP2/3 | 09 | 20-digit repeat |

**CI result:** 18/18 field checks @ **100%** (threshold ≥95%).

---

## 4. Registered Cases — Sample Verification Import

File: `src/shared/fixtures/sample-verification-cases.json`  
Import: Research → Test Suite → **Load Sample TestCases**

| ID | Name | Category | Notes |
|----|------|----------|-------|
| TC-STEP2-001-V | Regression — STEP2/3 (00) | CAT-STEP2/3 | Mirrors built-in 001 |
| TC-STAT-001-V | Regression — Statistics (05) | CAT-STAT | DB verification record |
| TC-EDGE-001-V | Regression — formatted input (04) | CAT-EDGE | DB verification record |

---

## 5. Domain Baselines (Phase 1-6 / 1-7)

### 5.1 CAT-PRED — Prediction

File: `src/shared/fixtures/prediction-verification-cases.ts`  
Runner: `predictionVerification.ts` · Tests: `predictionVerification.test.ts`

| ID | Name | Status | Source |
|----|------|--------|--------|
| TC-PRED-001 … TC-PRED-012 | Heuristic baseline | **PASS** | SRC-BUILTIN |
| TC-PRED-100+ | *(pending legacy observation)* | DRAFT | — |

**Engine:** `predictionEngine.buildPrediction` — **heuristic**  
**Legacy gate:** ≥10 SRC-LEGACY @ ≥95% — **NOT MET** (0 legacy)  
**UI:** Prediction panel 배너 · `(휴리스틱 · 레거시 미검증)`

### 5.2 CAT-CV — CodeValue

File: `src/shared/fixtures/code-value-verification-cases.ts`  
Runner: `codeValueVerification.ts` · Tests: `codeValueVerification.test.ts`

| ID | Name | Status | Source |
|----|------|--------|--------|
| TC-CV-001 … TC-CV-012 | Pattern/sequence baseline | **PASS** | SRC-BUILTIN |
| TC-CV-100+ | *(pending legacy observation)* | DRAFT | — |

**Legacy gate:** ≥10 SRC-LEGACY @ ≥95% — **NOT MET** (0 legacy)  
**UI:** CodeValue 미검증 배너

### 5.3 CAT-LEGACY — Master 00–99 STEP2/3 sweep

**Phase 1-3 skeleton** — 100 cases, all **`DRAFT`**.

| Item | Value |
|------|-------|
| **Count** | 100 (Master `00` … `99`) |
| **Category** | `CAT-BATCH` |
| **Source** | `SRC-LEGACY` (target) |
| **ID pattern** | `TC-LEGACY-{NNN}` |
| **JSON** | `legacy-master-skeleton-00-99.json` |
| **CSV** | `legacy-master-skeleton-00-99.csv` |
| **Builder** | `legacyMasterCatalogSkeleton.ts` |

#### ID ↔ masterNo map (sample)

| masterNo | catalogId | Name |
|----------|-----------|------|
| 00 | TC-LEGACY-000 | Legacy Master 00 STEP2/3 |
| 01 | TC-LEGACY-001 | Legacy Master 01 STEP2/3 |
| 42 | TC-LEGACY-042 | Legacy Master 42 STEP2/3 |
| 99 | TC-LEGACY-099 | Legacy Master 99 STEP2/3 |

#### Placeholder → observation

| Field | Skeleton | After observation |
|-------|----------|-------------------|
| `masterValue` | empty / `TBD` | Master DB |
| `step2` / `step3` | empty | Legacy program output |
| `legacyEvidence` | empty | `OBS-YYYYMMDD-NN` + screenshot |
| **Status** | `DRAFT` | `PASS` or `FAIL` |

**Progress:** **0 / 100** verified (`DRAFT` only).

#### Fill workflow

1. Legacy run → record in Research Outputs (legacy) per [RE-PLAYBOOK](./RE-PLAYBOOK.md).
2. Update fixture row or export JSON.
3. `npm run catalog:import -- <file> --update`
4. `npm run catalog:diagnose` — update §2 inventory.

---

## 6. Import / Export Pipeline (Phase 1-2)

| Action | UI / CLI |
|--------|----------|
| Import catalog | Test Suite → **Catalog 가져오기** · `npm run catalog:import -- <file>` |
| Duplicate policy | skip / update (`catalogId` or name) |
| Export catalog | Test Suite → JSON/CSV export |
| Templates | `legacy-verification-catalog.template.{json,csv}` |
| Master skeleton | `legacy-master-skeleton-00-99.{json,csv}` |
| Parser | `verificationImport.ts` |

Metadata (`catalogId`, `source`, …) → `inputData._catalog`.

---

## 7. Running Tests & Gates

| Action | Command / UI |
|--------|--------------|
| All Vitest tests | `npm run test` — **148** (unit **127** + integration **21**) |
| Unit only | `npm run test:unit` |
| Integration only | `npm run test:integration` |
| E2E smoke | `npm run test:e2e` — **5** tests (CI: `test:e2e:ci`) |
| **CI regression gate** | `npm run regression:gate` — **≥95%** built-in |
| Full diagnose | `npm run catalog:diagnose` — combined + CV + Pred |
| Built-in regression UI | Test Suite → **Run Built-in Regression** |
| Full Verification DB | Test Suite → **Run All** |
| FAIL report export | Test Suite → **FAIL 진단 보고서** |
| Health check | Settings → **Run Health Check** |
| **Local release gate** | `npm run build:check` (lint + test + regression + build) |
| **NSIS package** | `npm run build:prod:nsis` |
| **CI (GitHub)** | lint · format:check · unit · integration · regression · build · e2e |

### Latest gate snapshot (Release 1.0, 2026-06-30)

| Gate | Result |
|------|--------|
| Vitest (`npm run test`) | **148/148** passed |
| Built-in regression | 18/18 (**100%**) |
| Verification DB | 25/25 (**100%**) |
| Combined diagnose | 43/43 (**100%**) |
| CodeValue baseline | 32/32 · legacy **unverified** |
| Prediction baseline | 54/54 · **heuristic** |
| `build:check` | ✅ lint + test + regression + build |
| `build:prod:nsis` | ✅ Setup EXE + blockmap |

Reports: `imports/suite-failure-report.md`, `codevalue-verification-report.md`, `prediction-verification-report.md`.

---

## 8. Adding a New Case (Workflow)

1. Observe legacy output (screenshot + Research Outputs `legacy`).
2. Assign ID (§1.4) and category (§1.1); set `source: SRC-LEGACY`.
3. Add row to this doc **before** committing JSON.
4. Import via Catalog or Verification tab.
5. Run `catalog:diagnose`; on FAIL use diagnosis export.
6. Update [STATUS.md](./STATUS.md) §4 and §2 inventory.

---

## 9. Issue Template

GitHub **Test Case** — `.github/ISSUE_TEMPLATE/testcase.yml`

---

## 10. Phase 1 Closeout Checklist

| Step | Deliverable | Catalog impact |
|------|-------------|----------------|
| 1-1 | RE-PLAYBOOK | Workflow for §5.3 fill |
| 1-2 | Import pipeline | §6 |
| 1-3 | 100× skeleton | §5.3 DRAFT rows |
| 1-4 | User legacy import | ⏸️ pending user file |
| 1-5 | Diagnose + engine fixes | §7 combined gate |
| 1-6 | CodeValue TC-CV-001…012 | §5.2 |
| 1-7 | Prediction TC-PRED-001…012 | §5.1 |
| 1-8 | Research Policy B | (no catalog row) |
| 1-9 | `regression:gate` in CI | §3, §7 |
| 1-10 | STATUS + TEST-CATALOG | §2, §10 (this section) |

**Release blocker (P0-13):** Deferred to v1.1 — import ≥100 `SRC-LEGACY` cases with observed `step2`/`step3` when legacy data is available.

---

## 11. Automated Test Inventory (Release 1.0)

| Suite | Location | Count | In `build:check` |
|-------|----------|-------|------------------|
| Shared / engine unit | `tests/shared/` | ~93 | ✅ |
| Feature unit | `tests/features/` | 13 | ✅ |
| Hooks | `tests/hooks/` | 11 | ✅ |
| IPC + SQLite integration | `tests/integration/ipc-database.integration.test.ts` | 19 | ✅ |
| Research schema migration | `tests/integration/research-schema-migration.test.ts` | 2 | ✅ |
| E2E smoke | `tests/e2e/` | 5 | CI only (`test:e2e:ci`) |
| **Total Vitest** | | **148** | |

Cross-reference: [STATUS.md](./STATUS.md) §1 · [PRD.md](./PRD.md) §18 · [CHANGELOG.md](../CHANGELOG.md).

---

*Maintainers: update §2 inventory on catalog import; update §7/§11 on test count changes.*
