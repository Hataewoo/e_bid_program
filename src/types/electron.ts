import type { AnalysisRunInput, AnalysisRunOutput } from './analysis';
import type { HealthCheckReport } from '@/shared/utils/appHealthCheck';
import type { SuiteRunSummary } from '@/shared/utils/verificationSuite';
import type {
  AppUpdateAvailableNotice,
  AppUpdateCheckResult,
  AppUpdateDownloadResult,
  AppUpdateProgress,
} from './app-update';

export type { AnalysisRunInput, AnalysisRunOutput } from './analysis';

export interface DbStatus {
  connected: boolean;
  path: string;
  tableCounts: Record<string, number>;
}

export interface AppRuntimeInfo {
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

export interface SaveTextFileInput {
  defaultName: string;
  content: string;
  title?: string;
}

export interface SaveBinaryFileInput {
  defaultName: string;
  base64: string;
  title?: string;
}

export interface PackagingVerifyResult {
  ready: boolean;
  checks: Array<{ name: string; ok: boolean }>;
}

export interface Master {
  id: number;
  masterNo: string;
  masterValue: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MasterInput {
  masterNo: string;
  masterValue: string;
  memo?: string | null;
}

export interface MasterSaveInput extends MasterInput {
  id?: number | null;
}

export interface BulkUpsertProgress {
  current: number;
  total: number;
}

export interface BulkUpsertResult {
  success: boolean;
  processed: number;
  upserted: number;
  failed: number;
  errors: string[];
}

export interface Code {
  id: number;
  code: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodeInput {
  code: string;
  type: string;
  description?: string;
}

export interface CodeSaveInput extends CodeInput {
  id?: number | null;
}

export interface CodeValue {
  id: number;
  code: string;
  value: string;
  description: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CodeValueInput {
  code: string;
  value: string;
  description?: string | null;
  memo?: string | null;
}

export interface CodeValueSaveInput extends CodeValueInput {
  id?: number | null;
}

export interface OperationResult<T = void> {
  success: boolean;
  errors?: string[];
  data?: T;
}

export interface DataValidationResult {
  valid: boolean;
  checks: {
    isNumeric: boolean;
    lengthValid: boolean;
    notEmpty: boolean;
  };
  errors: string[];
}

export interface AnalysisHistory {
  id: number;
  title: string;
  bidNumber: string | null;
  status: string;
  result: string | null;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Statistics {
  id: number;
  category: string;
  label: string;
  value: number;
  unit: string | null;
  period: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbOperationResult {
  success: boolean;
  cancelled?: boolean;
  path?: string;
  errors?: string[];
}

export interface CreateAnalysisHistoryInput {
  title: string;
  bidNumber?: string | null;
  status: string;
  result?: string | null;
}

export interface RecordMasterStatisticsInput {
  masterNo: string;
  totalCount: number;
  lowRate: number;
  highRate: number;
  runCount: number;
  maxRun: number;
  topDigit: number | null;
  source: string;
}

export interface Experiment {
  id: number;
  name: string;
  date: string;
  version: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  inputs?: ExperimentInputRow[];
  outputs?: ExperimentOutputRow[];
  comparisons?: Comparison[];
  screenshots?: Screenshot[];
  verifications?: Verification[];
  hypotheses?: Hypothesis[];
}

export interface ExperimentSaveInput {
  id?: number | null;
  name: string;
  date?: string;
  version?: string;
  description?: string;
  status?: string;
}

export interface ExperimentInputRow {
  id?: number;
  experimentId?: number;
  fieldKey: string;
  fieldValue: string;
}

export interface ExperimentOutputRow {
  id?: number;
  experimentId?: number;
  source: string;
  fieldKey: string;
  fieldValue: string;
  memo?: string | null;
}

export interface Hypothesis {
  id: number;
  experimentId: number | null;
  sourceField: string | null;
  title: string;
  description: string;
  confidence: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HypothesisSaveInput {
  id?: number | null;
  experimentId?: number | null;
  sourceField?: string | null;
  title: string;
  description: string;
  confidence?: number;
  verified?: boolean;
}

export interface Comparison {
  id: number;
  experimentId: number;
  fieldKey: string;
  legacyValue: string;
  oursValue: string;
  diffType: string | null;
  diffDetail: string | null;
  isMatch: boolean;
  createdAt: string;
}

export interface ComparisonDiff {
  fieldKey: string;
  legacyValue: string;
  oursValue: string;
  isMatch: boolean;
  diffType?: string;
  diffDetail?: string;
}

export interface Verification {
  id: number;
  experimentId: number | null;
  hypothesisId: number | null;
  name: string;
  inputData: string;
  expectedResult: string;
  actualResult: string | null;
  passed: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationSaveInput {
  id?: number | null;
  experimentId?: number | null;
  hypothesisId?: number | null;
  name: string;
  inputData?: string;
  expectedResult: string;
  actualResult?: string | null;
}

export interface Screenshot {
  id: number;
  experimentId: number;
  filename: string;
  filePath: string;
  caption: string | null;
  createdAt: string;
}

export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getRuntimeInfo: () => Promise<AppRuntimeInfo>;
  getDbStatus: () => Promise<DbStatus>;
  getAllMasters: () => Promise<Master[]>;
  getMasterByNo: (masterNo: string) => Promise<Master | null>;
  saveMaster: (input: MasterSaveInput) => Promise<OperationResult<Master>>;
  deleteMaster: (masterNo: string) => Promise<OperationResult>;
  validateMasterData: (input: MasterInput) => Promise<DataValidationResult>;
  bulkUpsertMasters: (inputs: MasterInput[]) => Promise<BulkUpsertResult>;
  onBulkUpsertProgress: (callback: (progress: BulkUpsertProgress) => void) => () => void;
  getAllCodes: () => Promise<Code[]>;
  getCodeById: (id: number) => Promise<Code | null>;
  saveCode: (input: CodeSaveInput) => Promise<OperationResult<Code>>;
  deleteCode: (id: number) => Promise<OperationResult>;
  bulkUpsertCodes: (inputs: CodeInput[]) => Promise<BulkUpsertResult>;
  onCodeBulkUpsertProgress: (callback: (progress: BulkUpsertProgress) => void) => () => void;
  getAllCodeValues: () => Promise<CodeValue[]>;
  getCodeValueById: (id: number) => Promise<CodeValue | null>;
  saveCodeValue: (input: CodeValueSaveInput) => Promise<OperationResult<CodeValue>>;
  deleteCodeValue: (id: number) => Promise<OperationResult>;
  getExperiments: () => Promise<Experiment[]>;
  getExperimentById: (id: number) => Promise<Experiment | null>;
  saveExperiment: (input: ExperimentSaveInput) => Promise<OperationResult<Experiment>>;
  deleteExperiment: (id: number) => Promise<OperationResult>;
  compareExperiment: (
    id: number,
  ) => Promise<
    OperationResult<{ comparisons: Comparison[]; allMatch: boolean; diffs: ComparisonDiff[] }>
  >;
  saveExperimentInputs: (
    experimentId: number,
    rows: ExperimentInputRow[],
  ) => Promise<OperationResult<ExperimentInputRow[]>>;
  saveExperimentOutputs: (
    experimentId: number,
    rows: ExperimentOutputRow[],
  ) => Promise<OperationResult<ExperimentOutputRow[]>>;
  getHypotheses: () => Promise<Hypothesis[]>;
  saveHypothesis: (input: HypothesisSaveInput) => Promise<OperationResult<Hypothesis>>;
  deleteHypothesis: (id: number) => Promise<OperationResult>;
  getVerifications: () => Promise<Verification[]>;
  saveVerification: (
    input: VerificationSaveInput,
  ) => Promise<OperationResult<Verification> & { passed?: boolean }>;
  deleteVerification: (id: number) => Promise<OperationResult>;
  getScreenshots: (experimentId: number) => Promise<Screenshot[]>;
  saveScreenshot: (
    experimentId: number,
    filename: string,
    dataBase64: string,
    caption?: string,
  ) => Promise<OperationResult<Screenshot>>;
  getScreenshotImage: (filePath: string) => Promise<string | null>;
  deleteScreenshot: (id: number) => Promise<OperationResult>;
  exportAllResearch: (
    format?: 'json' | 'csv' | 'txt',
  ) => Promise<{ format: string; content: string } | null>;
  getAnalysisHistories: () => Promise<AnalysisHistory[]>;
  getStatistics: () => Promise<Statistics[]>;
  createAnalysisHistory: (input: CreateAnalysisHistoryInput) => Promise<AnalysisHistory>;
  recordMasterStatistics: (input: RecordMasterStatisticsInput) => Promise<number>;
  clearAnalysisHistories: () => Promise<number>;
  clearStatistics: () => Promise<number>;
  runAnalysis: (input: AnalysisRunInput) => Promise<OperationResult<AnalysisRunOutput>>;
  runRegressionSuite: () => Promise<OperationResult<SuiteRunSummary>>;
  runFullVerificationSuite: () => Promise<OperationResult<SuiteRunSummary>>;
  runHealthCheck: () => Promise<OperationResult<HealthCheckReport>>;
  backupDatabase: () => Promise<DbOperationResult>;
  restoreDatabase: () => Promise<DbOperationResult>;
  saveTextFile: (input: SaveTextFileInput) => Promise<DbOperationResult>;
  saveBinaryFile: (input: SaveBinaryFileInput) => Promise<DbOperationResult>;
  verifyPackaging: () => Promise<PackagingVerifyResult>;
  isUpdaterEnabled: () => Promise<boolean>;
  checkForUpdates: () => Promise<AppUpdateCheckResult>;
  downloadUpdate: () => Promise<AppUpdateDownloadResult>;
  quitAndInstall: () => void;
  onUpdateProgress: (callback: (progress: AppUpdateProgress) => void) => () => void;
  onUpdateAvailable: (callback: (info: AppUpdateAvailableNotice) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
