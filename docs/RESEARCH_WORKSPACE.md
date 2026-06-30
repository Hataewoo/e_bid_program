# Research Workspace

Reverse Engineering Workspace for the CS E-Bid Analyzer project.

**Purpose:** Systematically record legacy program inputs/outputs, compare them with our program, form hypotheses, and verify them — **without implementing bid algorithms**.

---

## 1. Overview

The Research feature replaces the former "Algorithm Research" menu. It is a data collection and comparison tool only.

| Principle | Rule |
|-----------|------|
| No algorithm guessing in Research UI | Research tabs never *implement* bid logic — they record and compare |
| Manual legacy entry | Legacy column values are always researcher-typed observations |
| Our Program: manual default | Right column is empty or manual unless researcher applies a draft |
| Compare first | Differences must be recorded before hypotheses |
| Verify before implement | Algorithm changes follow Verification PASS |

### Our Program fill policy (adopted: **B — Draft proposal**)

| Option | Behavior | Status |
|--------|----------|--------|
| **A — Manual only** | Our Program column is always hand-typed | Supported (default workflow) |
| **B — Draft proposal** | “분석 엔진으로 채우기” fills the **form only** with analysis-engine output tagged `[DRAFT:analysis-engine]`; **not** auto-saved; researcher must diff vs Legacy and **Save Outputs** | **✅ Adopted** |

Code: `src/features/research/constants/outputFillPolicy.ts`, `fill-outputs-from-analysis.ts`, Outputs tab banner + inline legacy preview.

---

## 2. Screen Design

**Route:** `/research`  
**Menu:** Research (left sidebar)

### Tab Layout

| Tab | Purpose |
|-----|---------|
| **Experiments** | Create/edit experiments (name, date, version, description, status) |
| **Screenshots** | Upload legacy program screen captures per experiment |
| **Inputs** | Free-form key-value input data (masterNo, code, etc.) |
| **Outputs** | Legacy vs Our program output fields (step2, step3, statistics, prediction, memo) |
| **Differences** | Side-by-side comparison with diff highlighting |
| **Hypotheses** | Write hypotheses with confidence (0–100) and verified flag |
| **Verification** | Input → Expected → Actual → PASS/FAIL |

### Experiment Status

- `Draft` — work in progress
- `Running` — comparison in progress
- `Verified` — all output fields match
- `Failed` — differences detected

### Difference Types

| Type | Meaning |
|------|---------|
| Match | Values identical |
| Digit Difference | Numeric character mismatch |
| Length Difference | String lengths differ |
| Missing Value | Our program empty, legacy has value |
| Unexpected Value | Legacy empty, our program has value |
| Character Mismatch | Non-digit character mismatch |

---

## 3. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Renderer (React)                          │
│  features/research/                                              │
│    ResearchFeature → tabs → Zustand store → electronService      │
└────────────────────────────┬────────────────────────────────────┘
                             │ IPC (research:*)
┌────────────────────────────▼────────────────────────────────────┐
│                     Electron Main Process                        │
│  electron/database/research/                                     │
│    research-service.ts                                           │
│      ├── experiment/     (CRUD, inputs, outputs)                 │
│      ├── comparison/     (diff engine + persistence)             │
│      ├── hypothesis/     (CRUD)                                  │
│      ├── verification/   (CRUD + PASS/FAIL evaluation)         │
│      └── screenshot/     (file storage + DB metadata)            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma
┌────────────────────────────▼────────────────────────────────────┐
│  SQLite (%APPDATA%/cs-e-bid-program/database/cs_e_bid.db)       │
└─────────────────────────────────────────────────────────────────┘
```

### Typical Workflow

1. **Create Experiment** (Experiments tab) → status `Draft`
2. **Record Inputs** (Inputs tab) — values used in legacy program
3. **Record Legacy Outputs** (Outputs tab, left column) — observed from legacy program
4. **Our Program outputs** (Outputs tab, right column) — **manual by default**; optional **“분석 엔진 Draft 제안”** (Policy B) fills the form with tagged draft values — review inline diff vs Legacy, then **Save Outputs**
5. **Upload Screenshots** (Screenshots tab) — evidence
6. **Run Comparison** (Differences tab) → auto-updates status to `Verified` or `Failed`
7. **Write Hypothesis** (Hypotheses tab) — explain observed pattern
8. **Verify Hypothesis** (Verification tab) — structured PASS/FAIL test
9. **Export** (toolbar) — JSON / CSV / TXT for external analysis

---

## 4. Database Design

### Entity Relationship

```
Experiment
  ├── ExperimentInput[]     (fieldKey, fieldValue)
  ├── ExperimentOutput[]    (source: legacy|ours, fieldKey, fieldValue, memo)
  ├── Comparison[]          (fieldKey, legacyValue, oursValue, diffType, isMatch)
  ├── Screenshot[]          (filename, filePath, caption)
  ├── Verification[]
  └── Hypothesis[]
        └── Verification[]  (optional link via hypothesisId)
```

### Tables

#### Experiment

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | TEXT | Required |
| date | DATETIME | Experiment date |
| version | TEXT | Program version under test |
| description | TEXT | Free text |
| status | TEXT | Draft / Running / Verified / Failed |

#### ExperimentInput

| Column | Type | Notes |
|--------|------|-------|
| experimentId | INT FK | Cascade delete |
| fieldKey | TEXT | e.g. masterNo, code |
| fieldValue | TEXT | User-entered value |

#### ExperimentOutput

| Column | Type | Notes |
|--------|------|-------|
| experimentId | INT FK | Cascade delete |
| source | TEXT | `legacy` or `ours` |
| fieldKey | TEXT | e.g. step2, step3 |
| fieldValue | TEXT | Observed result |
| memo | TEXT | Optional notes |

#### Comparison

| Column | Type | Notes |
|--------|------|-------|
| experimentId | INT FK | Rebuilt on each compare run |
| fieldKey | TEXT | Output field name |
| legacyValue | TEXT | |
| oursValue | TEXT | |
| diffType | TEXT | Match, Digit Difference, etc. |
| diffDetail | TEXT | Index/length detail |
| isMatch | BOOLEAN | |

#### Hypothesis

| Column | Type | Notes |
|--------|------|-------|
| experimentId | INT FK | Optional |
| title | TEXT | |
| description | TEXT | Full hypothesis text |
| confidence | INT | 0–100 |
| verified | BOOLEAN | Manual confirmation |

#### Verification

| Column | Type | Notes |
|--------|------|-------|
| experimentId | INT FK | Optional |
| hypothesisId | INT FK | Optional |
| name | TEXT | Test name |
| inputData | TEXT | JSON string |
| expectedResult | TEXT | |
| actualResult | TEXT | |
| passed | BOOLEAN | Auto: trim(expected) === trim(actual) |

#### Screenshot

| Column | Type | Notes |
|--------|------|-------|
| experimentId | INT FK | |
| filename | TEXT | |
| filePath | TEXT | Stored under userData/research/screenshots |
| caption | TEXT | |

---

## 5. Architecture

```
src/features/research/
  ResearchFeature.tsx          # Main shell + tab routing
  index.ts
  types/index.ts               # Tab IDs, status enums, diff colors
  constants/outputFillPolicy.ts  # Policy B (draft proposal) helpers
  services/fill-outputs-from-analysis.ts
  stores/research-store.ts     # Zustand state + IPC calls
  components/
    ResearchOutputDraftBanner.tsx
    ExperimentSelector.tsx
    ExportToolbar.tsx
    tabs/
      ExperimentsTab.tsx
      ScreenshotsTab.tsx
      InputsTab.tsx
      OutputsTab.tsx
      DifferencesTab.tsx
      HypothesesTab.tsx
      VerificationTab.tsx

electron/database/research/
  research-service.ts          # Orchestrator
  types.ts
  experiment/
    experiment-repository.ts
    experiment-service.ts
  comparison/
    comparison-service.ts      # Diff algorithm (structure only)
    comparison-repository.ts
  hypothesis/
    hypothesis-repository.ts
  verification/
    verification-service.ts
  screenshot/
    screenshot-service.ts
```

### IPC Channels

| Channel | Action |
|---------|--------|
| `research:experiments:getAll` | List experiments |
| `research:experiments:getById` | Full experiment with relations |
| `research:experiments:save` | Create/update experiment |
| `research:experiments:delete` | Delete experiment |
| `research:experiments:saveInputs` | Replace input rows |
| `research:experiments:saveOutputs` | Replace output rows |
| `research:experiments:compare` | Run diff + update status |
| `research:hypotheses:*` | Hypothesis CRUD |
| `research:verifications:*` | Verification CRUD |
| `research:screenshots:*` | Screenshot CRUD |
| `research:exportAll` | Export JSON/CSV/TXT |

---

## 6. Using Research for Algorithm Analysis

레거시 관측 절차는 [RE-PLAYBOOK.md](./RE-PLAYBOOK.md)를 따른다.

### Phase 1 — Collect (current)

1. Run legacy program with known Master/Code inputs
2. Enter inputs and legacy outputs into Research
3. Attach screenshots as evidence
4. Export JSON for backup/sharing

### Phase 2 — Compare

1. Enter or apply **Draft proposal** (Policy B) in Outputs (ours) when our program output is available
2. Review inline diff preview; edit fields if needed; **Save Outputs**
3. Run Comparison → review diff types
4. Group experiments by diff pattern (e.g. all "Digit Difference" on step2)

### Phase 3 — Hypothesize

Example hypothesis:

> STEP2 is the result of extracting digits 0–4 from Master Value, in order.

Set confidence based on evidence count. Mark `verified: true` only after Verification PASS.

### Phase 4 — Verify

Create Verification record:

- **Input:** `{"masterValue": "1234567890"}`
- **Expected:** (from legacy observation)
- **Actual:** (from applying hypothesis manually or partial implementation)
- **Result:** PASS → hypothesis promoted; FAIL → revise hypothesis

### Phase 5 — Implement (future, gated)

Only after multiple Verification PASS records for a hypothesis:

- Document algorithm in `ANALYSIS_ENGINE.md`
- Implement in Analysis feature
- Re-run Research comparison to confirm match

---

## 7. Export Formats

| Format | Content |
|--------|---------|
| **JSON** | Full nested export: experiments (with inputs/outputs/comparisons/screenshots), hypotheses, verifications |
| **CSV** | Summary rows: type, id, name, status, detail |
| **TXT** | Header + full JSON payload |

Export is triggered from the Research toolbar (top-right).

---

## 8. Migration Notes

- Old `Algorithm Research` menu → **Research**
- Route `/algorithm-research` redirects to `/research`
- Previous JSON-blob Experiment schema was replaced with normalized tables
- **Phase 5-3:** Legacy v1 blob schema is migrated incrementally on startup (`migrateResearchSchema`) — `Experiment` renamed to `Experiment_legacy_v1`, rows copied to v2 tables; `ComparisonResult`→`Comparison`, `TestCase`→`Verification`. No drop/recreate of v2 tables with data.

---

## 9. Constraints (Do Not Violate)

1. **Never** implement bid calculation logic inside Research tabs (recording/comparison only)
2. **Never** auto-save analysis-engine output as verified observation — Policy **B** applies draft to the form only; researcher must **Save Outputs** after diff review
3. Reverse Engineering feature may analyze structure (digit frequency, RLE) but that is separate from Research I/O recording
4. Treat Prediction/CodeValue engine fields as **unverified** until legacy Verification PASS (see STATUS.md)
