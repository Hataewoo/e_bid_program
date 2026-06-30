import type {
  AppUpdateAvailableNotice,
  AppUpdateCheckResult,
  AppUpdateDownloadResult,
  AppUpdateProgress,
} from '@/types/app-update';
import type {
  AppRuntimeInfo,
  DbStatus,
  Master,
  MasterInput,
  MasterSaveInput,
  BulkUpsertResult,
  BulkUpsertProgress,
  OperationResult,
  DataValidationResult,
  Code,
  CodeInput,
  CodeSaveInput,
  CodeValue,
  CodeValueSaveInput,
  Experiment,
  ExperimentSaveInput,
  ExperimentInputRow,
  ExperimentOutputRow,
  Hypothesis,
  HypothesisSaveInput,
  Screenshot,
  Verification,
  VerificationSaveInput,
  AnalysisHistory,
  Statistics,
  CreateAnalysisHistoryInput,
  RecordMasterStatisticsInput,
  DbOperationResult,
  SaveTextFileInput,
  SaveBinaryFileInput,
  PackagingVerifyResult,
} from '@/types/electron';
import type { AnalysisRunInput, AnalysisRunOutput } from '@/types/analysis';
import { runAppHealthCheck, type HealthCheckReport } from '@/shared/utils/appHealthCheck';
import { runBuiltInRegressionSuite } from '@/shared/utils/regressionSuite';
import { runFullVerificationSuite, type SuiteRunSummary } from '@/shared/utils/verificationSuite';
import { withIpcGuard } from './ipc-guard';
import {
  resolveAnalysisContext,
  runAnalysisPipeline,
  runAnalysisPipelineAsync,
} from '@/shared/services/analysisRunService';
import { AppErrorCode } from '@/shared/errors/app-error-codes';

class ElectronService {
  private get api() {
    return window.electronAPI;
  }

  isAvailable(): boolean {
    return Boolean(this.api);
  }

  async getVersion(): Promise<string> {
    if (!this.api) return '1.0.0';
    return this.api.getVersion();
  }

  async getRuntimeInfo(): Promise<AppRuntimeInfo | null> {
    if (!this.api?.getRuntimeInfo) return null;
    return this.api.getRuntimeInfo();
  }

  async getDbStatus(): Promise<DbStatus> {
    if (!this.api) {
      return { connected: false, path: '', tableCounts: {} };
    }
    return withIpcGuard('db:getStatus', () => this.api!.getDbStatus());
  }

  async getAllMasters(): Promise<Master[]> {
    if (!this.api) return [];
    return withIpcGuard('master:getAll', () => this.api!.getAllMasters(), { alertOnFail: false });
  }

  async getMasterByNo(masterNo: string): Promise<Master | null> {
    if (!this.api) return null;
    return withIpcGuard('master:getByNo', () => this.api!.getMasterByNo(masterNo), {
      alertOnFail: false,
    });
  }

  async saveMaster(input: MasterSaveInput): Promise<OperationResult<Master>> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveMaster(input);
  }

  async deleteMaster(masterNo: string): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteMaster(masterNo);
  }

  async validateMasterData(input: MasterInput): Promise<DataValidationResult> {
    if (!this.api) {
      return {
        valid: false,
        checks: { isNumeric: false, lengthValid: false, notEmpty: false },
        errors: [AppErrorCode.IPC_UNAVAILABLE],
      };
    }
    return this.api.validateMasterData(input);
  }

  async bulkUpsertMasters(inputs: MasterInput[]): Promise<BulkUpsertResult> {
    if (!this.api) {
      return {
        success: false,
        processed: 0,
        upserted: 0,
        failed: inputs.length,
        errors: [AppErrorCode.IPC_UNAVAILABLE],
      };
    }
    return withIpcGuard('master:bulkUpsert', () => this.api!.bulkUpsertMasters(inputs), {
      timeoutMs: 120_000,
    });
  }

  onBulkUpsertProgress(callback: (progress: BulkUpsertProgress) => void): () => void {
    if (!this.api?.onBulkUpsertProgress) return () => undefined;
    return this.api.onBulkUpsertProgress(callback);
  }

  async getAllCodes(): Promise<Code[]> {
    if (!this.api) return [];
    return withIpcGuard('code:getAll', () => this.api!.getAllCodes(), { alertOnFail: false });
  }

  async getCodeById(id: number): Promise<Code | null> {
    if (!this.api) return null;
    return this.api.getCodeById(id);
  }

  async saveCode(input: CodeSaveInput): Promise<OperationResult<Code>> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveCode(input);
  }

  async deleteCode(id: number): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteCode(id);
  }

  async bulkUpsertCodes(inputs: CodeInput[]): Promise<BulkUpsertResult> {
    if (!this.api) {
      return {
        success: false,
        processed: 0,
        upserted: 0,
        failed: inputs.length,
        errors: [AppErrorCode.IPC_UNAVAILABLE],
      };
    }
    return withIpcGuard('code:bulkUpsert', () => this.api!.bulkUpsertCodes(inputs), {
      timeoutMs: 120_000,
    });
  }

  onCodeBulkUpsertProgress(callback: (progress: BulkUpsertProgress) => void): () => void {
    if (!this.api?.onCodeBulkUpsertProgress) return () => undefined;
    return this.api.onCodeBulkUpsertProgress(callback);
  }

  async getAllCodeValues(): Promise<CodeValue[]> {
    if (!this.api) return [];
    return this.api.getAllCodeValues();
  }

  async getCodeValueById(id: number): Promise<CodeValue | null> {
    if (!this.api) return null;
    return this.api.getCodeValueById(id);
  }

  async saveCodeValue(input: CodeValueSaveInput): Promise<OperationResult<CodeValue>> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveCodeValue(input);
  }

  async deleteCodeValue(id: number): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteCodeValue(id);
  }

  async getExperiments(): Promise<Experiment[]> {
    if (!this.api) return [];
    return this.api.getExperiments();
  }

  async getExperimentById(id: number): Promise<Experiment | null> {
    if (!this.api) return null;
    return this.api.getExperimentById(id);
  }

  async saveExperiment(input: ExperimentSaveInput): Promise<OperationResult<Experiment>> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveExperiment(input);
  }

  async deleteExperiment(id: number): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteExperiment(id);
  }

  async compareExperiment(id: number) {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.compareExperiment(id);
  }

  async saveExperimentInputs(experimentId: number, rows: ExperimentInputRow[]) {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveExperimentInputs(experimentId, rows);
  }

  async saveExperimentOutputs(experimentId: number, rows: ExperimentOutputRow[]) {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveExperimentOutputs(experimentId, rows);
  }

  async getHypotheses(): Promise<Hypothesis[]> {
    if (!this.api) return [];
    return this.api.getHypotheses();
  }

  async saveHypothesis(input: HypothesisSaveInput): Promise<OperationResult<Hypothesis>> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveHypothesis(input);
  }

  async deleteHypothesis(id: number): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteHypothesis(id);
  }

  async getVerifications(): Promise<Verification[]> {
    if (!this.api) return [];
    return this.api.getVerifications();
  }

  async saveVerification(input: VerificationSaveInput) {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveVerification(input);
  }

  async deleteVerification(id: number): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteVerification(id);
  }

  async getScreenshots(experimentId: number): Promise<Screenshot[]> {
    if (!this.api) return [];
    return this.api.getScreenshots(experimentId);
  }

  async saveScreenshot(
    experimentId: number,
    filename: string,
    dataBase64: string,
    caption?: string,
  ): Promise<OperationResult<Screenshot>> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.saveScreenshot(experimentId, filename, dataBase64, caption);
  }

  async getScreenshotImage(filePath: string): Promise<string | null> {
    if (!this.api) return null;
    return this.api.getScreenshotImage(filePath);
  }

  async deleteScreenshot(id: number): Promise<OperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return this.api.deleteScreenshot(id);
  }

  async exportAllResearch(format: 'json' | 'csv' | 'txt' = 'json') {
    if (!this.api) return null;
    return this.api.exportAllResearch(format);
  }

  async getAnalysisHistories(): Promise<AnalysisHistory[]> {
    if (!this.api) return [];
    return this.api.getAnalysisHistories();
  }

  async getStatistics(): Promise<Statistics[]> {
    if (!this.api) return [];
    return this.api.getStatistics();
  }

  async createAnalysisHistory(input: CreateAnalysisHistoryInput): Promise<AnalysisHistory | null> {
    if (!this.api) return null;
    return withIpcGuard('db:createAnalysisHistory', () => this.api!.createAnalysisHistory(input), {
      alertOnFail: false,
    });
  }

  async recordMasterStatistics(input: RecordMasterStatisticsInput): Promise<number> {
    if (!this.api) return 0;
    return withIpcGuard(
      'db:recordMasterStatistics',
      () => this.api!.recordMasterStatistics(input),
      {
        alertOnFail: false,
      },
    );
  }

  async clearAnalysisHistories(): Promise<number> {
    if (!this.api) return 0;
    return withIpcGuard('db:clearAnalysisHistories', () => this.api!.clearAnalysisHistories(), {
      alertOnFail: false,
    });
  }

  async clearStatistics(): Promise<number> {
    if (!this.api) return 0;
    return withIpcGuard('db:clearStatistics', () => this.api!.clearStatistics(), {
      alertOnFail: false,
    });
  }

  async runAnalysis(input: AnalysisRunInput): Promise<OperationResult<AnalysisRunOutput>> {
    if (!this.api?.runAnalysis) {
      return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    }
    return withIpcGuard('analysis:run', () => this.api!.runAnalysis(input), {
      alertOnFail: false,
    });
  }

  /** Renderer fallback when IPC is unavailable (e.g. unit tests in jsdom). */
  runAnalysisLocal(
    input: AnalysisRunInput,
    master: Master | null,
    codes: Code[],
  ): AnalysisRunOutput {
    const context = resolveAnalysisContext(input, master, codes);
    return runAnalysisPipeline(context);
  }

  async runAnalysisLocalAsync(
    input: AnalysisRunInput,
    master: Master | null,
    codes: Code[],
    options?: { workerEnabled?: boolean },
  ): Promise<AnalysisRunOutput> {
    const context = resolveAnalysisContext(input, master, codes);
    return runAnalysisPipelineAsync(context, options);
  }

  async runRegressionSuite(): Promise<OperationResult<SuiteRunSummary>> {
    if (!this.api?.runRegressionSuite) {
      return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    }
    return withIpcGuard('analysis:runRegressionSuite', () => this.api!.runRegressionSuite(), {
      alertOnFail: false,
    });
  }

  runRegressionSuiteLocal(codes: Code[]): SuiteRunSummary {
    return runBuiltInRegressionSuite(codes);
  }

  async runFullVerificationSuite(): Promise<OperationResult<SuiteRunSummary>> {
    if (!this.api?.runFullVerificationSuite) {
      return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    }
    return withIpcGuard('analysis:runFullSuite', () => this.api!.runFullVerificationSuite(), {
      alertOnFail: false,
      timeoutMs: 120_000,
    });
  }

  runFullVerificationSuiteLocal(
    verifications: Verification[],
    experiments: Experiment[],
    codes: Code[],
  ): SuiteRunSummary {
    return runFullVerificationSuite(verifications, experiments, codes);
  }

  async runHealthCheck(): Promise<OperationResult<HealthCheckReport>> {
    if (!this.api?.runHealthCheck) {
      return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    }
    return withIpcGuard('analysis:healthCheck', () => this.api!.runHealthCheck(), {
      alertOnFail: false,
    });
  }

  runHealthCheckLocal(codes: Code[] = []): HealthCheckReport {
    return runAppHealthCheck(codes);
  }

  async backupDatabase(): Promise<DbOperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return withIpcGuard('db:backup', () => this.api!.backupDatabase(), { alertOnFail: true });
  }

  async restoreDatabase(): Promise<DbOperationResult> {
    if (!this.api) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return withIpcGuard('db:restore', () => this.api!.restoreDatabase(), { alertOnFail: true });
  }

  async saveTextFile(input: SaveTextFileInput): Promise<DbOperationResult> {
    if (!this.api?.saveTextFile) return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return withIpcGuard('app:saveTextFile', () => this.api!.saveTextFile(input), {
      alertOnFail: true,
    });
  }

  async saveBinaryFile(input: SaveBinaryFileInput): Promise<DbOperationResult> {
    if (!this.api?.saveBinaryFile)
      return { success: false, errors: [AppErrorCode.IPC_UNAVAILABLE] };
    return withIpcGuard('app:saveBinaryFile', () => this.api!.saveBinaryFile(input), {
      alertOnFail: true,
    });
  }

  async verifyPackaging(): Promise<PackagingVerifyResult> {
    if (!this.api?.verifyPackaging) {
      return { ready: false, checks: [{ name: 'electronAPI', ok: false }] };
    }
    return this.api.verifyPackaging();
  }

  async isUpdaterEnabled(): Promise<boolean> {
    if (!this.api?.isUpdaterEnabled) return false;
    return this.api.isUpdaterEnabled();
  }

  async checkForUpdates(): Promise<AppUpdateCheckResult> {
    if (!this.api?.checkForUpdates) {
      return { ok: false, status: 'disabled', reason: 'development' };
    }
    return withIpcGuard('app:checkForUpdates', () => this.api!.checkForUpdates()!, {
      alertOnFail: false,
    });
  }

  async downloadUpdate(): Promise<AppUpdateDownloadResult> {
    if (!this.api?.downloadUpdate) {
      return { ok: false, message: 'IPC_UNAVAILABLE' };
    }
    return withIpcGuard('app:downloadUpdate', () => this.api!.downloadUpdate()!, {
      alertOnFail: false,
      timeoutMs: 600_000,
    });
  }

  quitAndInstallUpdate(): void {
    this.api?.quitAndInstall?.();
  }

  onUpdateProgress(callback: (progress: AppUpdateProgress) => void): () => void {
    if (!this.api?.onUpdateProgress) return () => undefined;
    return this.api.onUpdateProgress(callback);
  }

  onUpdateAvailable(callback: (info: AppUpdateAvailableNotice) => void): () => void {
    if (!this.api?.onUpdateAvailable) return () => undefined;
    return this.api.onUpdateAvailable(callback);
  }
}

export const electronService = new ElectronService();
