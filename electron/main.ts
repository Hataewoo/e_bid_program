import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseService } from './database/database-service';
import { ensureUserDataDirectory, resolveDatabasePath } from './database/db-path';
import { fileLogger } from './logger/file-logger';
import {
  checkForAppUpdates,
  downloadAppUpdate,
  initAppUpdater,
  isUpdaterEnabled,
  notifyIfUpdateAvailable,
  quitAndInstallAppUpdate,
} from './updater/app-updater';
import { handleAnalysisRun } from './analysis/analysis-run-handler';
import {
  handleFullVerificationSuite,
  handleHealthCheck,
  handleRegressionSuite,
} from './analysis/analysis-suite-handler';
import { invalidateAnalysisCacheForMaster } from '@/shared/utils/analysisCache';
import { AppErrorCode } from '@/shared/errors/app-error-codes';
import type { MasterInput } from './database/validation/validation-service';
import type { CodeInput } from './database/code/code-validation-service';
import type { CodeValueInput } from './database/codeValue/code-value-validation-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let databaseService: DatabaseService | null = null;

const isDev = !app.isPackaged && process.env.CSEBID_E2E !== '1';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'CS E-Bid Analyzer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle('db:getStatus', async () => {
    return databaseService?.getStatus() ?? { connected: false, path: '', tableCounts: {} };
  });

  ipcMain.handle('master:getAll', async () => {
    return databaseService?.getMasterService().getAll() ?? [];
  });

  ipcMain.handle('master:getByNo', async (_event, masterNo: string) => {
    return databaseService?.getMasterService().getByMasterNo(masterNo) ?? null;
  });

  ipcMain.handle('master:save', async (_event, input: MasterInput & { id?: number | null }) => {
    const service = databaseService?.getMasterService();
    if (!service) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    const result = await service.save(input);
    if (result.success && result.data?.masterNo) {
      invalidateAnalysisCacheForMaster(result.data.masterNo);
    }
    return result;
  });

  ipcMain.handle('master:delete', async (_event, masterNo: string) => {
    const service = databaseService?.getMasterService();
    if (!service) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    const result = await service.delete(masterNo);
    if (result.success) {
      invalidateAnalysisCacheForMaster(masterNo);
    }
    return result;
  });

  ipcMain.handle('master:validateData', async (_event, input: MasterInput) => {
    const service = databaseService?.getMasterService();
    if (!service) {
      return {
        valid: false,
        checks: { isNumeric: false, lengthValid: false, notEmpty: false },
        errors: [AppErrorCode.DB_NOT_INIT],
      };
    }
    return service.validateData(input);
  });

  ipcMain.handle('master:bulkUpsert', async (event, inputs: MasterInput[]) => {
    const service = databaseService?.getMasterService();
    if (!service) {
      return {
        success: false,
        processed: 0,
        upserted: 0,
        failed: inputs.length,
        errors: [AppErrorCode.DB_NOT_INIT],
      };
    }
    return service.bulkUpsert(inputs, (progress) => {
      event.sender.send('master:bulkUpsert:progress', progress);
    });
  });

  ipcMain.handle('code:getAll', async () => {
    return databaseService?.getCodeService().getAll() ?? [];
  });

  ipcMain.handle('code:getById', async (_event, id: number) => {
    return databaseService?.getCodeService().getById(id) ?? null;
  });

  ipcMain.handle('code:save', async (_event, input: CodeInput & { id?: number | null }) => {
    const service = databaseService?.getCodeService();
    if (!service) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return service.save(input);
  });

  ipcMain.handle('code:delete', async (_event, id: number) => {
    const service = databaseService?.getCodeService();
    if (!service) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return service.delete(id);
  });

  ipcMain.handle('code:bulkUpsert', async (event, inputs: CodeInput[]) => {
    const service = databaseService?.getCodeService();
    if (!service) {
      return {
        success: false,
        processed: 0,
        upserted: 0,
        failed: inputs.length,
        errors: [AppErrorCode.DB_NOT_INIT],
      };
    }
    return service.bulkUpsert(inputs, (progress) => {
      event.sender.send('code:bulkUpsert:progress', progress);
    });
  });

  ipcMain.handle('codeValue:getAll', async () => {
    return databaseService?.getCodeValueService().getAll() ?? [];
  });

  ipcMain.handle('codeValue:getById', async (_event, id: number) => {
    return databaseService?.getCodeValueService().getById(id) ?? null;
  });

  ipcMain.handle(
    'codeValue:save',
    async (_event, input: CodeValueInput & { id?: number | null }) => {
      const service = databaseService?.getCodeValueService();
      if (!service) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
      return service.save(input);
    },
  );

  ipcMain.handle('codeValue:delete', async (_event, id: number) => {
    const service = databaseService?.getCodeValueService();
    if (!service) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return service.delete(id);
  });

  const research = () => databaseService?.getResearchService();

  ipcMain.handle('research:experiments:getAll', async () => research()?.experiments.getAll() ?? []);
  ipcMain.handle(
    'research:experiments:getById',
    async (_e, id: number) => research()?.experiments.getById(id) ?? null,
  );
  ipcMain.handle('research:experiments:save', async (_e, input) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.experiments.save(input);
  });
  ipcMain.handle('research:experiments:delete', async (_e, id: number) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.experiments.delete(id);
  });
  ipcMain.handle('research:experiments:compare', async (_e, id: number) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.compareExperiment(id);
  });

  ipcMain.handle('research:hypotheses:getAll', async () => research()?.hypotheses.getAll() ?? []);
  ipcMain.handle('research:hypotheses:save', async (_e, input) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.hypotheses.save(input);
  });
  ipcMain.handle('research:hypotheses:delete', async (_e, id: number) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.hypotheses.delete(id);
  });

  ipcMain.handle('research:experiments:saveInputs', async (_e, experimentId: number, rows) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.experiments.saveInputs(experimentId, rows);
  });
  ipcMain.handle('research:experiments:saveOutputs', async (_e, experimentId: number, rows) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.experiments.saveOutputs(experimentId, rows);
  });

  ipcMain.handle(
    'research:verifications:getAll',
    async () => research()?.verifications.getAll() ?? [],
  );
  ipcMain.handle('research:verifications:save', async (_e, input) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.verifications.save(input);
  });
  ipcMain.handle('research:verifications:delete', async (_e, id: number) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.verifications.delete(id);
  });

  ipcMain.handle(
    'research:screenshots:getByExperiment',
    async (_e, experimentId: number) => research()?.screenshots.getByExperiment(experimentId) ?? [],
  );
  ipcMain.handle(
    'research:screenshots:save',
    async (_e, experimentId: number, filename: string, dataBase64: string, caption?: string) => {
      const svc = research();
      if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
      const data = await svc.screenshots.save(experimentId, filename, dataBase64, caption);
      return { success: true, data };
    },
  );
  ipcMain.handle('research:screenshots:getImage', async (_e, filePath: string) => {
    const svc = research();
    if (!svc) return null;
    return svc.screenshots.readAsBase64(filePath);
  });
  ipcMain.handle('research:screenshots:delete', async (_e, id: number) => {
    const svc = research();
    if (!svc) return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    return svc.screenshots.delete(id);
  });

  ipcMain.handle('research:exportAll', async (_e, format: 'json' | 'csv' | 'txt' = 'json') => {
    const svc = research();
    if (!svc) return null;
    return svc.exportAll(format);
  });

  ipcMain.handle('db:getAnalysisHistories', async () => {
    return databaseService?.getAnalysisHistories() ?? [];
  });

  ipcMain.handle('db:getStatistics', async () => {
    return databaseService?.getStatistics() ?? [];
  });

  ipcMain.handle('db:createAnalysisHistory', async (_event, input) => {
    return databaseService?.createAnalysisHistory(input) ?? null;
  });

  ipcMain.handle('db:recordMasterStatistics', async (_event, input) => {
    return databaseService?.recordMasterStatistics(input) ?? 0;
  });

  ipcMain.handle('db:clearAnalysisHistories', async () => {
    return databaseService?.clearAnalysisHistories() ?? 0;
  });

  ipcMain.handle('db:clearStatistics', async () => {
    return databaseService?.clearStatistics() ?? 0;
  });

  ipcMain.handle('analysis:run', async (_event, input) => {
    return handleAnalysisRun(databaseService, input);
  });

  ipcMain.handle('analysis:runRegressionSuite', async () => {
    return handleRegressionSuite(databaseService);
  });

  ipcMain.handle('analysis:runFullSuite', async () => {
    return handleFullVerificationSuite(databaseService);
  });

  ipcMain.handle('analysis:healthCheck', async () => {
    return handleHealthCheck(databaseService);
  });

  ipcMain.handle('db:backup', async () => {
    if (!databaseService) {
      return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const result = await dialog.showSaveDialog({
      title: '데이터베이스 백업',
      defaultPath: `csebid-backup-${stamp}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true };
    }

    try {
      await databaseService.backupToFile(result.filePath);
      fileLogger.info('Database backup completed', result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      fileLogger.error('Database backup failed', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : AppErrorCode.DB_BACKUP_FAILED],
      };
    }
  });

  ipcMain.handle('db:restore', async () => {
    if (!databaseService) {
      return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
    }

    const result = await dialog.showOpenDialog({
      title: '데이터베이스 복원',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { success: false, cancelled: true };
    }

    try {
      await databaseService.restoreFromFile(result.filePaths[0]);
      fileLogger.info('Database restore completed', result.filePaths[0]);
      return { success: true, path: result.filePaths[0] };
    } catch (error) {
      fileLogger.error('Database restore failed', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : AppErrorCode.DB_RESTORE_FAILED],
      };
    }
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getRuntimeInfo', async () => {
    const dbInfo = databaseService?.getRuntimeInfo();
    return {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      userData: app.getPath('userData'),
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      dbPath: dbInfo?.dbPath ?? '',
      dbMode: dbInfo?.mode ?? (app.isPackaged ? 'production' : 'development'),
      templateCopied: dbInfo?.templateCopied ?? false,
      logPath: fileLogger.getPath(),
    };
  });

  ipcMain.handle(
    'app:saveTextFile',
    async (_event, input: { defaultName: string; content: string; title?: string }) => {
      const result = await dialog.showSaveDialog({
        title: input.title ?? '파일 저장',
        defaultPath: input.defaultName,
        filters: [
          { name: 'CSV', extensions: ['csv'] },
          { name: 'Text', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true };
      }

      try {
        fs.writeFileSync(result.filePath, input.content, 'utf8');
        fileLogger.info('File saved', result.filePath);
        return { success: true, path: result.filePath };
      } catch (error) {
        fileLogger.error('File save failed', error);
        return {
          success: false,
          errors: [error instanceof Error ? error.message : AppErrorCode.DB_WRITE_FAILED],
        };
      }
    },
  );

  ipcMain.handle(
    'app:saveBinaryFile',
    async (_event, input: { defaultName: string; base64: string; title?: string }) => {
      const result = await dialog.showSaveDialog({
        title: input.title ?? '파일 저장',
        defaultPath: input.defaultName,
        filters: [
          { name: 'Excel', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true };
      }

      try {
        fs.writeFileSync(result.filePath, Buffer.from(input.base64, 'base64'));
        fileLogger.info('Binary file saved', result.filePath);
        return { success: true, path: result.filePath };
      } catch (error) {
        fileLogger.error('Binary file save failed', error);
        return {
          success: false,
          errors: [error instanceof Error ? error.message : AppErrorCode.DB_WRITE_FAILED],
        };
      }
    },
  );

  ipcMain.handle('app:isUpdaterEnabled', () => isUpdaterEnabled());

  ipcMain.handle('app:checkForUpdates', async () => checkForAppUpdates());

  ipcMain.handle('app:downloadUpdate', async () => downloadAppUpdate());

  ipcMain.handle('app:quitAndInstall', () => {
    quitAndInstallAppUpdate();
  });

  ipcMain.handle('app:verifyPackaging', async () => {
    const root = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
    const checks = [
      {
        name: 'prisma/schema.prisma',
        ok: fs.existsSync(path.join(root, 'prisma', 'schema.prisma')),
      },
      {
        name: 'node_modules/.prisma/client',
        ok: fs.existsSync(path.join(root, 'node_modules', '.prisma', 'client')),
      },
      { name: 'dist/index.html', ok: fs.existsSync(path.join(root, 'dist', 'index.html')) },
      {
        name: 'dist-electron/main.js',
        ok: fs.existsSync(path.join(root, 'dist-electron', 'main.js')),
      },
    ];

    if (!app.isPackaged) {
      checks.push({
        name: 'prisma/dev.db',
        ok: fs.existsSync(path.join(root, 'prisma', 'dev.db')),
      });
    }

    return {
      ready: checks.every((check) => check.ok),
      checks,
    };
  });
}

app.whenReady().then(async () => {
  ensureUserDataDirectory();

  const pathPreview = resolveDatabasePath();
  const dbDir = path.dirname(pathPreview.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.info('[App] Mode:', app.isPackaged ? 'production' : 'development');
  console.info('[App] userData:', pathPreview.userDataPath);
  console.info('[App] database (resolved):', pathPreview.dbPath);
  if (app.isPackaged) {
    console.info('[App] resourcesPath:', process.resourcesPath);
  }

  try {
    databaseService = new DatabaseService();
    await databaseService.initialize();
    fileLogger.info('Database initialized', pathPreview.dbPath);
  } catch (err) {
    console.error('[App] Database initialization failed:', err);
    fileLogger.error('Database initialization failed', err);
    databaseService = null;
  }
  registerIpcHandlers();
  initAppUpdater(() => mainWindow);
  createWindow();

  if (app.isPackaged) {
    window.setTimeout(() => {
      void notifyIfUpdateAvailable(() => mainWindow);
    }, 8_000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await databaseService?.disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await databaseService?.disconnect();
});
