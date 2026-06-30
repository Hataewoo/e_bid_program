# CS E-Bid Analyzer — IPC API Reference

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.0.0 (Phase 4-6) |
| **기준일** | 2026-06-30 |
| **채널 수** | **51** `invoke` handlers + **2** one-way progress events |

Renderer ↔ Main 통신 계약서. 아키텍처 개요는 [ARCHITECTURE.md](./ARCHITECTURE.md), 구현 상태는 [STATUS.md](./STATUS.md)를 참조한다.

---

## 1. How to Call

### 1.1 Call Stack

```
Feature store / component
  → electronService.<method>()     // src/services/electron-service.ts
  → withIpcGuard()                 // 30s timeout, error → useAppStore
  → window.electronAPI.<method>()  // electron/preload.ts
  → ipcRenderer.invoke(channel, …)
  → ipcMain.handle(channel, …)     // electron/main.ts
  → DatabaseService / analysis handlers
```

### 1.2 Type Sources

| Artifact | Path |
|----------|------|
| Preload bridge | `electron/preload.ts` |
| Renderer API type | `src/types/electron.ts` → `ElectronAPI` |
| IPC registration | `electron/main.ts` → `registerIpcHandlers()` |
| Analysis I/O | `src/types/analysis.ts` |
| Error codes | `src/shared/errors/app-error-codes.ts` |

### 1.3 Security

- `contextIsolation: true`, `nodeIntegration: false`
- Renderer는 **preload에 노출된 메서드만** 호출 가능
- DB·파일시스템·네이티브 dialog는 Main 전용

### 1.4 Renderer Fallback (no Electron)

`electronService`는 `window.electronAPI`가 없을 때 일부 analysis 메서드를 **로컬 shared pipeline**으로 대체한다:

| Method | Fallback |
|--------|----------|
| `runAnalysisLocal()` | `runAnalysisPipeline()` (DB codes 빈 배열 가능) |
| `runRegressionSuiteLocal()` | `runBuiltInRegressionSuite()` |
| `runFullVerificationSuiteLocal()` | `runFullVerificationSuite()` (DB 없음) |
| `runHealthCheckLocal()` | `runAppHealthCheck()` |

---

## 2. Conventions

### 2.1 Channel Naming

`domain:action` 또는 `domain:subdomain:action`

예: `master:save`, `research:experiments:compare`, `analysis:run`

### 2.2 Response Patterns

| Pattern | Type | When |
|---------|------|------|
| CRUD success/fail | `OperationResult<T>` | save, delete |
| Read list | `T[]` | getAll |
| Read one | `T \| null` | getById, getByNo |
| Validation | `DataValidationResult` | master:validateData |
| Bulk import | `BulkUpsertResult` | bulkUpsert |
| Dialog cancel | `{ success: false, cancelled: true }` | backup, restore, saveFile |
| Analysis / suite | `OperationResult<Payload>` | analysis:* |

### 2.3 Common Types

```typescript
interface OperationResult<T = void> {
  success: boolean;
  errors?: string[];   // AppErrorCode or free-text (legacy)
  data?: T;
}

interface BulkUpsertResult {
  success: boolean;
  processed: number;
  upserted: number;
  failed: number;
  errors: string[];
}

interface BulkUpsertProgress {
  current: number;
  total: number;
}

interface DbOperationResult {
  success: boolean;
  cancelled?: boolean;
  path?: string;
  errors?: string[];
}
```

날짜 필드는 IPC 경계에서 **ISO 8601 string** (`toISOString()`).

### 2.4 Error Codes

`OperationResult.errors` 및 validation 응답은 `AppErrorCode` 문자열을 사용한다. Renderer는 `formatAppErrors()` / `formatAppError()`로 i18n 메시지로 변환한다.

| Prefix | Examples |
|--------|----------|
| `VAL_*` | `VAL_MASTER_NO`, `VAL_CODE_DUP`, `VAL_CODE_VALUE_NOT_FOUND` |
| `DB_*` | `DB_NOT_INIT`, `DB_BACKUP_FAILED`, `DB_HISTORY_SAVE_FAILED` |
| `IPC_*` | `IPC_TIMEOUT`, `IPC_ANALYSIS_FAILED`, `IPC_REGRESSION_FAILED` |

전체 목록: `src/shared/errors/app-error-codes.ts` (31 codes).

---

## 3. Quick Reference — All Channels

### 3.1 Invoke Handlers (51)

| Channel | Preload method | electronService |
|---------|----------------|-----------------|
| **app:** | | |
| `app:getVersion` | `getVersion` | `getVersion()` |
| `app:getRuntimeInfo` | `getRuntimeInfo` | `getRuntimeInfo()` |
| `app:saveTextFile` | `saveTextFile` | `saveTextFile(input)` |
| `app:saveBinaryFile` | `saveBinaryFile` | `saveBinaryFile(input)` |
| `app:verifyPackaging` | `verifyPackaging` | `verifyPackaging()` |
| **db:** | | |
| `db:getStatus` | `getDbStatus` | `getDbStatus()` |
| `db:getAnalysisHistories` | `getAnalysisHistories` | `getAnalysisHistories()` |
| `db:getStatistics` | `getStatistics` | `getStatistics()` |
| `db:createAnalysisHistory` | `createAnalysisHistory` | `createAnalysisHistory(input)` |
| `db:recordMasterStatistics` | `recordMasterStatistics` | `recordMasterStatistics(input)` |
| `db:clearAnalysisHistories` | `clearAnalysisHistories` | `clearAnalysisHistories()` |
| `db:clearStatistics` | `clearStatistics` | `clearStatistics()` |
| `db:backup` | `backupDatabase` | `backupDatabase()` |
| `db:restore` | `restoreDatabase` | `restoreDatabase()` |
| **master:** | | |
| `master:getAll` | `getAllMasters` | `getAllMasters()` |
| `master:getByNo` | `getMasterByNo` | `getMasterByNo(masterNo)` |
| `master:save` | `saveMaster` | `saveMaster(input)` |
| `master:delete` | `deleteMaster` | `deleteMaster(masterNo)` |
| `master:validateData` | `validateMasterData` | `validateMasterData(input)` |
| `master:bulkUpsert` | `bulkUpsertMasters` | `bulkUpsertMasters(inputs)` |
| **code:** | | |
| `code:getAll` | `getAllCodes` | `getAllCodes()` |
| `code:getById` | `getCodeById` | `getCodeById(id)` |
| `code:save` | `saveCode` | `saveCode(input)` |
| `code:delete` | `deleteCode` | `deleteCode(id)` |
| `code:bulkUpsert` | `bulkUpsertCodes` | `bulkUpsertCodes(inputs)` |
| **codeValue:** | | |
| `codeValue:getAll` | `getAllCodeValues` | `getAllCodeValues()` |
| `codeValue:getById` | `getCodeValueById` | `getCodeValueById(id)` |
| `codeValue:save` | `saveCodeValue` | `saveCodeValue(input)` |
| `codeValue:delete` | `deleteCodeValue` | `deleteCodeValue(id)` |
| **research:** | | |
| `research:experiments:getAll` | `getExperiments` | `getExperiments()` |
| `research:experiments:getById` | `getExperimentById` | `getExperimentById(id)` |
| `research:experiments:save` | `saveExperiment` | `saveExperiment(input)` |
| `research:experiments:delete` | `deleteExperiment` | `deleteExperiment(id)` |
| `research:experiments:compare` | `compareExperiment` | `compareExperiment(id)` |
| `research:experiments:saveInputs` | `saveExperimentInputs` | `saveExperimentInputs(id, rows)` |
| `research:experiments:saveOutputs` | `saveExperimentOutputs` | `saveExperimentOutputs(id, rows)` |
| `research:hypotheses:getAll` | `getHypotheses` | `getHypotheses()` |
| `research:hypotheses:save` | `saveHypothesis` | `saveHypothesis(input)` |
| `research:hypotheses:delete` | `deleteHypothesis` | `deleteHypothesis(id)` |
| `research:verifications:getAll` | `getVerifications` | `getVerifications()` |
| `research:verifications:save` | `saveVerification` | `saveVerification(input)` |
| `research:verifications:delete` | `deleteVerification` | `deleteVerification(id)` |
| `research:screenshots:getByExperiment` | `getScreenshots` | `getScreenshots(experimentId)` |
| `research:screenshots:save` | `saveScreenshot` | `saveScreenshot(…)` |
| `research:screenshots:getImage` | `getScreenshotImage` | `getScreenshotImage(filePath)` |
| `research:screenshots:delete` | `deleteScreenshot` | `deleteScreenshot(id)` |
| `research:exportAll` | `exportAllResearch` | `exportAllResearch(format?)` |
| **analysis:** | | |
| `analysis:run` | `runAnalysis` | `runAnalysis(input)` |
| `analysis:runRegressionSuite` | `runRegressionSuite` | `runRegressionSuite()` |
| `analysis:runFullSuite` | `runFullVerificationSuite` | `runFullVerificationSuite()` |
| `analysis:healthCheck` | `runHealthCheck` | `runHealthCheck()` |

### 3.2 One-Way Events (2)

Main → Renderer (`event.sender.send`). Preload에서 listener 등록.

| Event | Preload API | Payload |
|-------|-------------|---------|
| `master:bulkUpsert:progress` | `onBulkUpsertProgress(cb)` → unsubscribe | `{ current, total }` |
| `code:bulkUpsert:progress` | `onCodeBulkUpsertProgress(cb)` → unsubscribe | `{ current, total }` |

---

## 4. App

### `app:getVersion`

| | |
|--|--|
| **Args** | — |
| **Returns** | `string` — Electron `app.getVersion()` |
| **Side effects** | None |

### `app:getRuntimeInfo`

| | |
|--|--|
| **Args** | — |
| **Returns** | `AppRuntimeInfo` |

```typescript
interface AppRuntimeInfo {
  version: string;
  isPackaged: boolean;
  userData: string;
  appPath: string;
  resourcesPath: string;
  dbPath: string;
  dbMode: 'development' | 'production';
  templateCopied: boolean;
  logPath?: string;
}
```

### `app:saveTextFile`

| | |
|--|--|
| **Args** | `SaveTextFileInput` — `{ defaultName, content, title? }` |
| **Returns** | `DbOperationResult` — `{ success, path? }` or `{ cancelled: true }` |
| **Side effects** | Native save dialog; writes UTF-8 file |

### `app:saveBinaryFile`

| | |
|--|--|
| **Args** | `SaveBinaryFileInput` — `{ defaultName, base64, title? }` |
| **Returns** | `DbOperationResult` |
| **Side effects** | Native save dialog; writes binary from base64 |

### `app:verifyPackaging`

| | |
|--|--|
| **Args** | — |
| **Returns** | `PackagingVerifyResult` — `{ ready: boolean, checks: { name, ok }[] }` |
| **Notes** | Dev mode additionally checks `prisma/dev.db` |

---

## 5. Database (`db:`)

### `db:getStatus`

| | |
|--|--|
| **Returns** | `DbStatus` — `{ connected, path, tableCounts }` |
| **Errors** | `connected: false` if DB not initialized |

### `db:getAnalysisHistories`

| | |
|--|--|
| **Returns** | `AnalysisHistory[]` |

### `db:getStatistics`

| | |
|--|--|
| **Returns** | `Statistics[]` — aggregate rows (`category`, `label`, `value`, …) |

### `db:createAnalysisHistory`

| | |
|--|--|
| **Args** | `CreateAnalysisHistoryInput` — `{ title, bidNumber?, status, result? }` |
| **Returns** | `AnalysisHistory` or `null` on failure |

### `db:recordMasterStatistics`

| | |
|--|--|
| **Args** | `RecordMasterStatisticsInput` |

```typescript
interface RecordMasterStatisticsInput {
  masterNo: string;
  totalCount: number;
  lowRate: number;
  highRate: number;
  runCount: number;
  maxRun: number;
  topDigit: number | null;
  source: string;   // e.g. 'analysis', 'statistics', 'code-value'
}
```

| | |
|--|--|
| **Returns** | `number` — inserted row id (0 on failure) |

### `db:clearAnalysisHistories` / `db:clearStatistics`

| | |
|--|--|
| **Returns** | `number` — deleted row count |

### `db:backup` / `db:restore`

| | |
|--|--|
| **Args** | — (user picks path via dialog) |
| **Returns** | `DbOperationResult` |
| **Side effects** | Copies SQLite file to/from selected path; restore reconnects Prisma |

---

## 6. Master (`master:`)

### Entity: `Master`

```typescript
interface Master {
  id: number;
  masterNo: string;      // '00' ~ '99'
  masterValue: string;   // digit sequence (UI: "입력 값")
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `master:getAll` / `master:getByNo`

| Channel | Args | Returns |
|---------|------|---------|
| `master:getAll` | — | `Master[]` |
| `master:getByNo` | `masterNo: string` | `Master \| null` |

### `master:save`

| | |
|--|--|
| **Args** | `MasterSaveInput` — `{ id?, masterNo, masterValue, memo? }` |
| **Returns** | `OperationResult<Master>` |
| **Validation** | `VAL_MASTER_*` codes on failure |
| **Side effects** | Upsert by `masterNo`; **invalidates analysis cache** for that slot |

### `master:delete`

| | |
|--|--|
| **Args** | `masterNo: string` |
| **Returns** | `OperationResult` |
| **Side effects** | Invalidates analysis cache |

### `master:validateData`

| | |
|--|--|
| **Args** | `MasterInput` — `{ masterNo, masterValue, memo? }` |
| **Returns** | `DataValidationResult` — `{ valid, checks: { isNumeric, lengthValid, notEmpty }, errors[] }` |
| **Notes** | Does not persist |

### `master:bulkUpsert`

| | |
|--|--|
| **Args** | `MasterInput[]` |
| **Returns** | `BulkUpsertResult` |
| **Events** | Emits `master:bulkUpsert:progress` during processing |
| **Side effects** | Batch upsert; per-row validation errors collected in `errors` |

---

## 7. Code (`code:`)

### Entity: `Code`

```typescript
interface Code {
  id: number;
  code: string;          // UI: code name (e.g. '01', '20')
  type: string;          // low/high classification
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

| Channel | Args | Returns |
|---------|------|---------|
| `code:getAll` | — | `Code[]` |
| `code:getById` | `id: number` | `Code \| null` |
| `code:save` | `CodeSaveInput` — `{ id?, code, type, description? }` | `OperationResult<Code>` |
| `code:delete` | `id: number` | `OperationResult` |
| `code:bulkUpsert` | `CodeInput[]` | `BulkUpsertResult` + `code:bulkUpsert:progress` events |

---

## 8. CodeValue (`codeValue:`)

### Entity: `CodeValue`

```typescript
interface CodeValue {
  id: number;
  code: string;
  value: string;
  description: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}
```

| Channel | Args | Returns |
|---------|------|---------|
| `codeValue:getAll` | — | `CodeValue[]` |
| `codeValue:getById` | `id: number` | `CodeValue \| null` |
| `codeValue:save` | `CodeValueSaveInput` | `OperationResult<CodeValue>` |
| `codeValue:delete` | `id: number` | `OperationResult` |

---

## 9. Research (`research:`)

Research IPC는 `DatabaseService.getResearchService()` 하위 서비스에 위임한다.

### 9.1 Experiments

| Channel | Args | Returns |
|---------|------|---------|
| `research:experiments:getAll` | — | `Experiment[]` (summary; nested relations optional) |
| `research:experiments:getById` | `id: number` | `Experiment \| null` (with inputs, outputs, comparisons, …) |
| `research:experiments:save` | `ExperimentSaveInput` | `OperationResult<Experiment>` |
| `research:experiments:delete` | `id: number` | `OperationResult` |
| `research:experiments:compare` | `id: number` | `OperationResult<{ comparisons, allMatch, diffs }>` |
| `research:experiments:saveInputs` | `experimentId, ExperimentInputRow[]` | `OperationResult<ExperimentInputRow[]>` |
| `research:experiments:saveOutputs` | `experimentId, ExperimentOutputRow[]` | `OperationResult<ExperimentOutputRow[]>` |

**`ExperimentSaveInput`:** `{ id?, name, date?, version?, description?, status? }`

**`compare`:** Legacy output rows vs engine output — populates `Comparison` diffs.

### 9.2 Hypotheses

| Channel | Args | Returns |
|---------|------|---------|
| `research:hypotheses:getAll` | — | `Hypothesis[]` |
| `research:hypotheses:save` | `HypothesisSaveInput` | `OperationResult<Hypothesis>` |
| `research:hypotheses:delete` | `id: number` | `OperationResult` |

### 9.3 Verifications (Test Suite cases)

| Channel | Args | Returns |
|---------|------|---------|
| `research:verifications:getAll` | — | `Verification[]` |
| `research:verifications:save` | `VerificationSaveInput` | `OperationResult<Verification> & { passed?: boolean }` |
| `research:verifications:delete` | `id: number` | `OperationResult` |

**`VerificationSaveInput`:** `{ id?, experimentId?, hypothesisId?, name, inputData?, expectedResult, actualResult? }`

On save, Main may run engine verification and set `passed` on the result.

### 9.4 Screenshots

| Channel | Args | Returns |
|---------|------|---------|
| `research:screenshots:getByExperiment` | `experimentId: number` | `Screenshot[]` |
| `research:screenshots:save` | `experimentId, filename, dataBase64, caption?` | `OperationResult<Screenshot>` |
| `research:screenshots:getImage` | `filePath: string` | `string \| null` (base64) |
| `research:screenshots:delete` | `id: number` | `OperationResult` |

Files stored under `userData` (Main filesystem).

### 9.5 Export

| Channel | Args | Returns |
|---------|------|---------|
| `research:exportAll` | `format?: 'json' \| 'csv' \| 'txt'` (default `'json'`) | `{ format, content } \| null` |

---

## 10. Analysis (`analysis:`)

All analysis handlers live in `electron/analysis/`. Computation uses **`runAnalysisPipeline()`** from `src/shared/services/analysisRunService.ts`.

### `analysis:run`

| | |
|--|--|
| **Args** | `AnalysisRunInput` |

```typescript
interface AnalysisRunInput {
  masterNo: string;
  masterValue?: string;   // optional — loaded from DB if omitted
}
```

| | |
|--|--|
| **Returns** | `OperationResult<AnalysisRunOutput>` |

```typescript
interface AnalysisRunOutput {
  result: AnalysisResult;           // from analysisEngine
  codeValueStats: CodeValueStatRow[];
  prediction: PredictionResult;
  researchFields: EngineVerificationOutput;
  fromCache: boolean;
  master: Master | null;
}
```

| | |
|--|--|
| **Behavior** | Loads master + all codes from DB → `resolveAnalysisContext()` → `runAnalysisPipeline()` |
| **Errors** | `DB_NOT_INIT`, `IPC_ANALYSIS_FAILED` |

### `analysis:runRegressionSuite`

| | |
|--|--|
| **Args** | — |
| **Returns** | `OperationResult<SuiteRunSummary>` |
| **Behavior** | Loads codes → `runBuiltInRegressionSuite(codes)` (18 built-in fixtures) |

### `analysis:runFullSuite`

| | |
|--|--|
| **Args** | — |
| **Returns** | `OperationResult<SuiteRunSummary>` |
| **Behavior** | Loads codes + DB verifications + experiments → `runFullVerificationSuite()` |

### `analysis:healthCheck`

| | |
|--|--|
| **Args** | — |
| **Returns** | `OperationResult<HealthCheckReport>` |
| **Behavior** | Loads codes → `runAppHealthCheck(codes)` |

**`SuiteRunSummary`:**

```typescript
interface SuiteRunSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: SuiteCaseResult[];
}
```

**`HealthCheckReport`:**

```typescript
interface HealthCheckReport {
  ok: boolean;
  items: { id, label, ok, detail? }[];
  passRate: number;
}
```

---

## 11. Side Effects Summary

| Channel | Notable side effects |
|---------|---------------------|
| `master:save`, `master:delete` | `invalidateAnalysisCacheForMaster(masterNo)` |
| `master:bulkUpsert`, `code:bulkUpsert` | Progress events; may partial-fail |
| `db:backup`, `db:restore` | Native dialog; filesystem copy |
| `app:saveTextFile`, `app:saveBinaryFile` | Native dialog; filesystem write |
| `research:screenshots:save` | Writes image file under userData |
| `db:createAnalysisHistory`, `db:recordMasterStatistics` | Prisma insert |
| `db:clear*` | Bulk delete |

---

## 12. Adding a New Channel (Checklist)

1. Add handler in `electron/main.ts` → `registerIpcHandlers()`
2. Expose method in `electron/preload.ts`
3. Add signature to `ElectronAPI` in `src/types/electron.ts`
4. Add facade method on `electronService` with `withIpcGuard`
5. Add `AppErrorCode` entries + `messages.ts` keys if new failure modes
6. Integration test in `tests/integration/` if DB-backed
7. **Update this document**

---

## 13. Related Documents

| Document | Content |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Process boundaries, module layout |
| [PRD.md](./PRD.md) §15 | Original IPC requirements (may lag implementation) |
| [STATUS.md](./STATUS.md) | Feature completion status |
| [TEST-CATALOG.md](./TEST-CATALOG.md) | Verification case catalog |
| [RESEARCH_WORKSPACE.md](./RESEARCH_WORKSPACE.md) | Research outputs Policy B |

---

*Source of truth for channel inventory: `electron/preload.ts` + `electron/main.ts`. Regenerate this doc when adding or renaming channels.*
