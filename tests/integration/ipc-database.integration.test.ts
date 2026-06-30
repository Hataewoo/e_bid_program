import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, ipc, type TestDatabaseHandle } from './helpers/test-database';

describe('IPC + SQLite integration', () => {
  let db: TestDatabaseHandle;

  beforeEach(async () => {
    db = await createTestDatabase({ seed: false });
  });

  afterEach(async () => {
    await db.cleanup();
  });

  describe('db:getStatus', () => {
    it('reports connected with zero counts on empty database', async () => {
      const status = await ipc.dbGetStatus(db.service);
      expect(status.connected).toBe(true);
      expect(status.path).toBe(db.dbPath);
      expect(status.tableCounts.Master).toBe(0);
      expect(status.tableCounts.Code).toBe(0);
    });
  });

  describe('master IPC', () => {
    it('master:save creates a row readable by master:getByNo', async () => {
      const saved = await ipc.masterSave(db.service, {
        masterNo: '42',
        masterValue: '1234567890',
        memo: 'integration',
      });
      expect(saved.success).toBe(true);

      const row = await ipc.masterGetByNo(db.service, '42');
      expect(row?.masterValue).toBe('1234567890');
      expect(row?.memo).toBe('integration');
    });

    it('master:save updates an existing master slot', async () => {
      await ipc.masterSave(db.service, { masterNo: '05', masterValue: '111', memo: null });
      const updated = await ipc.masterSave(db.service, {
        id: (await ipc.masterGetByNo(db.service, '05'))!.id,
        masterNo: '05',
        masterValue: '222',
        memo: 'updated',
      });
      expect(updated.success).toBe(true);
      expect((await ipc.masterGetByNo(db.service, '05'))?.masterValue).toBe('222');
    });

    it('master:delete removes a saved master', async () => {
      await ipc.masterSave(db.service, { masterNo: '07', masterValue: '999', memo: null });
      const deleted = await ipc.masterDelete(db.service, '07');
      expect(deleted.success).toBe(true);
      expect(await ipc.masterGetByNo(db.service, '07')).toBeNull();
    });

    it('master:validateData rejects non-numeric values', async () => {
      const result = await ipc.masterValidateData(db.service, {
        masterNo: '01',
        masterValue: 'abc',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(ipc.AppErrorCode.VAL_MASTER_VALUE);
    });

    it('master:create rejects duplicate masterNo', async () => {
      const master = db.service.getMasterService();
      const first = await master.create({ masterNo: '08', masterValue: '100', memo: null });
      expect(first.success).toBe(true);

      const dup = await master.create({ masterNo: '08', masterValue: '200', memo: null });
      expect(dup.success).toBe(false);
      if (!dup.success) {
        expect(dup.errors).toContain(ipc.AppErrorCode.VAL_MASTER_DUP);
      }
    });

    it('master:getAll returns saved masters', async () => {
      await ipc.masterSave(db.service, { masterNo: '09', masterValue: '555', memo: null });
      const rows = await ipc.masterGetAll(db.service);
      expect(rows.some((row) => row.masterNo === '09')).toBe(true);
    });
  });

  describe('code IPC', () => {
    it('code:save persists and code:getAll lists it', async () => {
      const saved = await ipc.codeSave(db.service, {
        code: 'TST01',
        type: 'test',
        description: 'integration code',
      });
      expect(saved.success).toBe(true);

      const rows = await ipc.codeGetAll(db.service);
      expect(rows.some((row) => row.code === 'TST01')).toBe(true);
    });

    it('code:delete removes a saved code', async () => {
      const saved = await ipc.codeSave(db.service, {
        code: 'DEL01',
        type: 'test',
        description: 'to delete',
      });
      expect(saved.success).toBe(true);
      if (!saved.success) return;
      const deleted = await ipc.codeDelete(db.service, saved.data.id);
      expect(deleted.success).toBe(true);
      expect((await ipc.codeGetAll(db.service)).some((row) => row.code === 'DEL01')).toBe(false);
    });

    it('code:save returns validation error for empty code name', async () => {
      const result = await ipc.codeSave(db.service, { code: '', type: 'x', description: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain(ipc.AppErrorCode.VAL_CODE_REQUIRED);
      }
    });
  });

  describe('codeValue IPC', () => {
    it('codeValue:save creates a row', async () => {
      const saved = await ipc.codeValueSave(db.service, {
        code: '01',
        value: '1001',
        description: 'cv test',
      });
      expect(saved.success).toBe(true);
      if (saved.success) {
        expect(saved.data.value).toBe('1001');
      }
    });
  });

  describe('analysis history / statistics IPC', () => {
    it('db:createAnalysisHistory inserts a history row', async () => {
      const row = await ipc.dbCreateAnalysisHistory(db.service, {
        title: 'Integration run',
        bidNumber: '01',
        status: 'completed',
        result: '{"source":"test"}',
      });
      expect(row.id).toBeGreaterThan(0);
      const histories = await ipc.dbGetAnalysisHistories(db.service);
      expect(histories).toHaveLength(1);
    });

    it('db:recordMasterStatistics writes aggregate rows', async () => {
      const count = await ipc.dbRecordMasterStatistics(db.service, {
        masterNo: '01',
        totalCount: 10,
        lowRate: 50,
        highRate: 50,
        runCount: 2,
        maxRun: 3,
        topDigit: 1,
        source: 'integration',
      });
      expect(count).toBeGreaterThanOrEqual(5);
      const stats = await ipc.dbGetStatistics(db.service);
      expect(stats.length).toBeGreaterThanOrEqual(5);
    });

    it('db:clearAnalysisHistories removes all history rows', async () => {
      await ipc.dbCreateAnalysisHistory(db.service, {
        title: 'To clear',
        status: 'completed',
      });
      const cleared = await ipc.dbClearAnalysisHistories(db.service);
      expect(cleared).toBe(1);
      expect(await ipc.dbGetAnalysisHistories(db.service)).toHaveLength(0);
    });

    it('db:clearStatistics removes statistics rows', async () => {
      await ipc.dbRecordMasterStatistics(db.service, {
        masterNo: '02',
        totalCount: 4,
        lowRate: 25,
        highRate: 75,
        runCount: 1,
        maxRun: 1,
        topDigit: null,
        source: 'integration',
      });
      const cleared = await ipc.dbClearStatistics(db.service);
      expect(cleared).toBeGreaterThanOrEqual(5);
      expect(await ipc.dbGetStatistics(db.service)).toHaveLength(0);
    });
  });

  describe('analysis:run IPC', () => {
    beforeEach(async () => {
      await db.cleanup();
      db = await createTestDatabase({ seed: true });
    });

    it('analysis:run succeeds for a seeded master', async () => {
      const result = await ipc.analysisRun(db.service, { masterNo: '01' });
      expect(result.success).toBe(true);
      expect(result.data?.result.totalCount).toBeGreaterThan(0);
      expect(result.data?.master?.masterNo).toBe('01');
    });

    it('analysis:runRegressionSuite returns built-in summary', async () => {
      const result = await ipc.analysisRegressionSuite(db.service);
      expect(result.success).toBe(true);
      expect(result.data?.total).toBeGreaterThan(0);
    });

    it('analysis:healthCheck passes with seeded codes', async () => {
      const result = await ipc.analysisHealthCheck(db.service);
      expect(result.success).toBe(true);
      expect(result.data?.ok).toBe(true);
    });
  });

  describe('research IPC', () => {
    it('research:experiments:save persists an experiment', async () => {
      const saved = await ipc.researchSaveExperiment(db.service, {
        name: 'IPC integration experiment',
        description: 'phase 3-1',
      });
      expect(saved.success).toBe(true);
      if (!saved.success) return;
      const loaded = await ipc.researchGetExperiment(db.service, saved.data.id);
      expect(loaded?.name).toBe('IPC integration experiment');
    });
  });
});
