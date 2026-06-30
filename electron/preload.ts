import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../src/types/electron';
import type { AnalysisRunInput, AnalysisRunOutput } from '../src/types/analysis';
import type { OperationResult } from '../src/types/electron';
import type { HealthCheckReport } from '../src/shared/utils/appHealthCheck';
import type { SuiteRunSummary } from '../src/shared/utils/verificationSuite';

const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getRuntimeInfo: () => ipcRenderer.invoke('app:getRuntimeInfo'),
  getDbStatus: () => ipcRenderer.invoke('db:getStatus'),
  getAllMasters: () => ipcRenderer.invoke('master:getAll'),
  getMasterByNo: (masterNo) => ipcRenderer.invoke('master:getByNo', masterNo),
  saveMaster: (input) => ipcRenderer.invoke('master:save', input),
  deleteMaster: (masterNo) => ipcRenderer.invoke('master:delete', masterNo),
  validateMasterData: (input) => ipcRenderer.invoke('master:validateData', input),
  bulkUpsertMasters: (inputs) => ipcRenderer.invoke('master:bulkUpsert', inputs),
  onBulkUpsertProgress: (callback) => {
    const listener = (_event: unknown, progress: { current: number; total: number }) => {
      callback(progress);
    };
    ipcRenderer.on('master:bulkUpsert:progress', listener);
    return () => {
      ipcRenderer.removeListener('master:bulkUpsert:progress', listener);
    };
  },
  getAllCodes: () => ipcRenderer.invoke('code:getAll'),
  getCodeById: (id) => ipcRenderer.invoke('code:getById', id),
  saveCode: (input) => ipcRenderer.invoke('code:save', input),
  deleteCode: (id) => ipcRenderer.invoke('code:delete', id),
  bulkUpsertCodes: (inputs) => ipcRenderer.invoke('code:bulkUpsert', inputs),
  onCodeBulkUpsertProgress: (callback) => {
    const listener = (_event: unknown, progress: { current: number; total: number }) => {
      callback(progress);
    };
    ipcRenderer.on('code:bulkUpsert:progress', listener);
    return () => {
      ipcRenderer.removeListener('code:bulkUpsert:progress', listener);
    };
  },
  getAllCodeValues: () => ipcRenderer.invoke('codeValue:getAll'),
  getCodeValueById: (id) => ipcRenderer.invoke('codeValue:getById', id),
  saveCodeValue: (input) => ipcRenderer.invoke('codeValue:save', input),
  deleteCodeValue: (id) => ipcRenderer.invoke('codeValue:delete', id),
  getExperiments: () => ipcRenderer.invoke('research:experiments:getAll'),
  getExperimentById: (id) => ipcRenderer.invoke('research:experiments:getById', id),
  saveExperiment: (input) => ipcRenderer.invoke('research:experiments:save', input),
  deleteExperiment: (id) => ipcRenderer.invoke('research:experiments:delete', id),
  compareExperiment: (id) => ipcRenderer.invoke('research:experiments:compare', id),
  saveExperimentInputs: (experimentId, rows) =>
    ipcRenderer.invoke('research:experiments:saveInputs', experimentId, rows),
  saveExperimentOutputs: (experimentId, rows) =>
    ipcRenderer.invoke('research:experiments:saveOutputs', experimentId, rows),
  getHypotheses: () => ipcRenderer.invoke('research:hypotheses:getAll'),
  saveHypothesis: (input) => ipcRenderer.invoke('research:hypotheses:save', input),
  deleteHypothesis: (id) => ipcRenderer.invoke('research:hypotheses:delete', id),
  getVerifications: () => ipcRenderer.invoke('research:verifications:getAll'),
  saveVerification: (input) => ipcRenderer.invoke('research:verifications:save', input),
  deleteVerification: (id) => ipcRenderer.invoke('research:verifications:delete', id),
  getScreenshots: (experimentId) =>
    ipcRenderer.invoke('research:screenshots:getByExperiment', experimentId),
  saveScreenshot: (experimentId, filename, dataBase64, caption) =>
    ipcRenderer.invoke('research:screenshots:save', experimentId, filename, dataBase64, caption),
  getScreenshotImage: (filePath) => ipcRenderer.invoke('research:screenshots:getImage', filePath),
  deleteScreenshot: (id) => ipcRenderer.invoke('research:screenshots:delete', id),
  exportAllResearch: (format) => ipcRenderer.invoke('research:exportAll', format),
  getAnalysisHistories: () => ipcRenderer.invoke('db:getAnalysisHistories'),
  getStatistics: () => ipcRenderer.invoke('db:getStatistics'),
  createAnalysisHistory: (input) => ipcRenderer.invoke('db:createAnalysisHistory', input),
  recordMasterStatistics: (input) => ipcRenderer.invoke('db:recordMasterStatistics', input),
  clearAnalysisHistories: () => ipcRenderer.invoke('db:clearAnalysisHistories'),
  clearStatistics: () => ipcRenderer.invoke('db:clearStatistics'),
  runAnalysis: (input: AnalysisRunInput) =>
    ipcRenderer.invoke('analysis:run', input) as Promise<OperationResult<AnalysisRunOutput>>,
  runRegressionSuite: () =>
    ipcRenderer.invoke('analysis:runRegressionSuite') as Promise<OperationResult<SuiteRunSummary>>,
  runFullVerificationSuite: () =>
    ipcRenderer.invoke('analysis:runFullSuite') as Promise<OperationResult<SuiteRunSummary>>,
  runHealthCheck: () =>
    ipcRenderer.invoke('analysis:healthCheck') as Promise<OperationResult<HealthCheckReport>>,
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
  saveTextFile: (input) => ipcRenderer.invoke('app:saveTextFile', input),
  saveBinaryFile: (input) => ipcRenderer.invoke('app:saveBinaryFile', input),
  verifyPackaging: () => ipcRenderer.invoke('app:verifyPackaging'),
  isUpdaterEnabled: () => ipcRenderer.invoke('app:isUpdaterEnabled'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  onUpdateProgress: (callback) => {
    const listener = (_event: unknown, progress: { percent: number }) => {
      callback(progress);
    };
    ipcRenderer.on('app:update-progress', listener);
    return () => {
      ipcRenderer.removeListener('app:update-progress', listener);
    };
  },
  onUpdateAvailable: (callback) => {
    const listener = (
      _event: unknown,
      info: { currentVersion: string; latestVersion: string; releaseNotes?: string },
    ) => {
      callback(info);
    };
    ipcRenderer.on('app:update-available', listener);
    return () => {
      ipcRenderer.removeListener('app:update-available', listener);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
