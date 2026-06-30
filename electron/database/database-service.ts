import fs from 'fs';
import path from 'path';
import { createPrismaClient, type PrismaClient } from './prisma-client';
import { app } from 'electron';
import { MasterRepository } from './master/master-repository';
import { MasterService } from './master/master-service';
import { ValidationService } from './validation/validation-service';
import { CodeRepository } from './code/code-repository';
import { CodeService } from './code/code-service';
import { CodeValidationService } from './code/code-validation-service';
import { CodeValueRepository } from './codeValue/code-value-repository';
import { CodeValueService } from './codeValue/code-value-service';
import { CodeValueValidationService } from './codeValue/code-value-validation-service';
import { ResearchService } from './research/research-service';
import type { MasterInput } from './validation/validation-service';
import { AnalysisPersistenceService } from './analysis-persistence-service';
import type {
  CreateAnalysisHistoryInput,
  RecordMasterStatisticsInput,
} from './analysis-persistence-types';
import { SEED_CODES } from './seed/code-seed';
import { configurePrismaQueryEngine, resolveDatabasePath, type DatabasePathInfo } from './db-path';
import { migrateResearchSchema } from './research/research-schema-migration';

export interface DbStatus {
  connected: boolean;
  path: string;
  tableCounts: Record<string, number>;
}

const SEED_CODE_VALUE_SAMPLES = [
  { code: '01', value: '1001', description: 'Code 01 기본값', memo: '더미 1' },
  { code: '01', value: '1002', description: 'Code 01 보조값', memo: null },
  { code: '01234', value: '23401', description: '01234 패턴값', memo: '더미 3' },
  { code: '10', value: '5000', description: 'Code 10 샘플', memo: null },
  { code: '10', value: '5001', description: 'Code 10 확장', memo: '더미 5' },
  { code: '20', value: '20001', description: 'Code 20 기본', memo: null },
  { code: '23', value: '23001', description: 'Code 23 샘플', memo: '더미 7' },
  { code: '234', value: '234001', description: 'Code 234 패턴', memo: null },
  { code: '23401', value: '901234', description: '23401 조합', memo: '더미 9' },
  { code: '24', value: '24001', description: 'Code 24 샘플', memo: null },
  { code: '30', value: '30001', description: 'Code 30 기본', memo: '더미 11' },
  { code: '32', value: '32001', description: 'Code 32 샘플', memo: null },
  { code: '324', value: '324001', description: 'Code 324 패턴', memo: '더미 13' },
  { code: '34', value: '34001', description: 'Code 34 샘플', memo: null },
  { code: '40', value: '40001', description: 'Code 40 기본', memo: '더미 15' },
  { code: '42', value: '42001', description: 'Code 42 샘플', memo: null },
  { code: '423', value: '423001', description: 'Code 423 패턴', memo: '더미 17' },
  { code: '43', value: '43001', description: 'Code 43 샘플', memo: null },
  { code: '45', value: '45001', description: 'Code 45 기본', memo: '더미 19' },
  { code: '45', value: '45002', description: 'Code 45 보조', memo: '더미 20' },
];

export class DatabaseService {
  private prisma: PrismaClient | null = null;
  private dbPath = '';
  private pathInfo: DatabasePathInfo | null = null;
  private masterService: MasterService | null = null;
  private codeService: CodeService | null = null;
  private codeValueService: CodeValueService | null = null;
  private researchService: ResearchService | null = null;
  private analysisPersistence: AnalysisPersistenceService | null = null;

  async initialize(): Promise<void> {
    configurePrismaQueryEngine();

    this.pathInfo = resolveDatabasePath();
    this.dbPath = this.pathInfo.dbPath;

    console.info(
      `[DB] ${this.pathInfo.mode} — database: ${this.dbPath}` +
        (this.pathInfo.templateCopied ? ' (template copied)' : ''),
    );

    await this.connectAtPath(this.dbPath, { seed: true });
  }

  /** Integration tests — isolated SQLite file (no Electron userData). */
  async initializeAtPath(dbPath: string, options?: { seed?: boolean }): Promise<void> {
    this.pathInfo = {
      dbPath,
      mode: 'development',
      userDataPath: path.dirname(dbPath),
      templateCopied: false,
    };
    this.dbPath = dbPath;
    await this.connectAtPath(dbPath, { seed: options?.seed ?? false });
  }

  private async connectAtPath(dbPath: string, options: { seed: boolean }): Promise<void> {
    process.env.DATABASE_URL = `file:${dbPath}`;

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.info(`[DB] test/connect — database: ${dbPath}`);

    this.prisma = createPrismaClient();
    await this.prisma.$connect();
    await this.ensureSchema();
    this.initServices();
    if (options.seed) {
      await this.seedDummyData();
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma?.$disconnect();
    this.prisma = null;
    this.masterService = null;
    this.codeService = null;
    this.codeValueService = null;
    this.researchService = null;
    this.analysisPersistence = null;
  }

  getMasterService(): MasterService {
    if (!this.masterService) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.masterService;
  }

  getCodeService(): CodeService {
    if (!this.codeService) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.codeService;
  }

  getCodeValueService(): CodeValueService {
    if (!this.codeValueService) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.codeValueService;
  }

  getResearchService(): ResearchService {
    if (!this.researchService) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.researchService;
  }

  async getStatus(): Promise<DbStatus> {
    if (!this.prisma) {
      return { connected: false, path: this.dbPath, tableCounts: {} };
    }

    try {
      const [
        masterCount,
        codeCount,
        codeValueCount,
        analysisCount,
        statisticsCount,
        experimentCount,
      ] = await Promise.all([
        this.prisma.master.count(),
        this.prisma.code.count(),
        this.prisma.codeValue.count(),
        this.prisma.analysisHistory.count(),
        this.prisma.statistics.count(),
        this.prisma.experiment.count(),
      ]);

      return {
        connected: true,
        path: this.dbPath,
        tableCounts: {
          Master: masterCount,
          Code: codeCount,
          CodeValue: codeValueCount,
          AnalysisHistory: analysisCount,
          Statistics: statisticsCount,
          Experiment: experimentCount,
        },
      };
    } catch {
      return { connected: false, path: this.dbPath, tableCounts: {} };
    }
  }

  async getAnalysisHistories() {
    return this.prisma?.analysisHistory.findMany({ orderBy: { analyzedAt: 'desc' } }) ?? [];
  }

  async getStatistics() {
    return this.prisma?.statistics.findMany({ orderBy: { recordedAt: 'desc' } }) ?? [];
  }

  async createAnalysisHistory(input: CreateAnalysisHistoryInput) {
    if (!this.analysisPersistence) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.analysisPersistence.createAnalysisHistory(input);
  }

  async recordMasterStatistics(input: RecordMasterStatisticsInput) {
    if (!this.analysisPersistence) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.analysisPersistence.recordMasterStatistics(input);
  }

  async clearAnalysisHistories() {
    if (!this.analysisPersistence) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.analysisPersistence.clearAnalysisHistories();
  }

  async clearStatistics() {
    if (!this.analysisPersistence) {
      throw new Error('DatabaseService is not initialized');
    }
    return this.analysisPersistence.clearStatistics();
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  async backupToFile(destPath: string): Promise<void> {
    if (!this.prisma) {
      throw new Error('DatabaseService is not initialized');
    }
    if (!fs.existsSync(this.dbPath)) {
      throw new Error('Database file not found');
    }

    await this.prisma.$disconnect();
    fs.copyFileSync(this.dbPath, destPath);

    this.prisma = createPrismaClient();
    await this.prisma.$connect();
    this.initServices();
  }

  async restoreFromFile(sourcePath: string): Promise<void> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Backup file not found');
    }

    await this.prisma?.$disconnect();
    fs.copyFileSync(sourcePath, this.dbPath);

    this.prisma = createPrismaClient();
    await this.prisma.$connect();
    await this.ensureSchema();
    this.initServices();
  }

  private initServices(): void {
    if (!this.prisma) return;

    const masterRepository = new MasterRepository(this.prisma);
    const masterValidationService = new ValidationService();
    this.masterService = new MasterService(masterRepository, masterValidationService);

    const codeRepository = new CodeRepository(this.prisma);
    const codeValidationService = new CodeValidationService();
    this.codeService = new CodeService(codeRepository, codeValidationService);

    const codeValueRepository = new CodeValueRepository(this.prisma);
    const codeValueValidationService = new CodeValueValidationService();
    this.codeValueService = new CodeValueService(codeValueRepository, codeValueValidationService);

    this.researchService = new ResearchService(this.prisma);
    this.analysisPersistence = new AnalysisPersistenceService(this.prisma);
  }

  /** IPC/디버그용 런타임 DB 정보 */
  getRuntimeInfo(): {
    dbPath: string;
    userDataPath: string;
    isPackaged: boolean;
    mode: 'development' | 'production';
    templateCopied: boolean;
  } {
    return {
      dbPath: this.dbPath,
      userDataPath: app.getPath('userData'),
      isPackaged: app.isPackaged,
      mode: this.pathInfo?.mode ?? (app.isPackaged ? 'production' : 'development'),
      templateCopied: this.pathInfo?.templateCopied ?? false,
    };
  }

  private async ensureSchema(): Promise<void> {
    if (!this.prisma) return;

    await this.migrateMasterTable();
    await this.migrateCodeTable();
    await this.migrateCodeValueTable();
    if (this.prisma) {
      await migrateResearchSchema(this.prisma);
    }

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalysisHistory" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "bidNumber" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "result" TEXT,
        "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Statistics" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "category" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "value" REAL NOT NULL,
        "unit" TEXT,
        "period" TEXT,
        "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async migrateMasterTable(): Promise<void> {
    if (!this.prisma) return;

    const tableInfo = await this.prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("Master")`,
    );

    if (tableInfo.length === 0) {
      await this.createMasterTable();
      return;
    }

    const hasMasterNo = tableInfo.some((col) => col.name === 'masterNo');
    if (!hasMasterNo) {
      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Master"`);
      await this.createMasterTable();
    }
  }

  private async migrateCodeTable(): Promise<void> {
    if (!this.prisma) return;

    const tableInfo =
      await this.prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Code")`);

    if (tableInfo.length === 0) {
      await this.createCodeTable();
      return;
    }

    const hasType = tableInfo.some((col) => col.name === 'type');
    if (!hasType) {
      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Code"`);
      await this.createCodeTable();
    }
  }

  private async createMasterTable(): Promise<void> {
    if (!this.prisma) return;

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Master" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "masterNo" TEXT NOT NULL,
        "masterValue" TEXT NOT NULL DEFAULT '',
        "memo" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Master_masterNo_key" ON "Master"("masterNo")
    `);
  }

  private async createCodeTable(): Promise<void> {
    if (!this.prisma) return;

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Code" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "code" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Code_code_key" ON "Code"("code")
    `);
  }

  private async migrateCodeValueTable(): Promise<void> {
    if (!this.prisma) return;

    const tableInfo = await this.prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("CodeValue")`,
    );

    if (tableInfo.length === 0) {
      await this.createCodeValueTable();
    }
  }

  private async createCodeValueTable(): Promise<void> {
    if (!this.prisma) return;

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CodeValue" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "code" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "memo" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async seedDummyData(): Promise<void> {
    if (!this.masterService || !this.codeService || !this.codeValueService) return;

    const masterCount = await this.masterService.getCount();
    if (masterCount === 0) {
      const samples: MasterInput[] = [
        { masterNo: '00', masterValue: '1234567890', memo: '기본 마스터 데이터' },
        { masterNo: '01', masterValue: '9876543210', memo: '테스트 데이터' },
      ];

      for (const sample of samples) {
        await this.masterService.create(sample);
      }
    }

    const codeCount = await this.codeService.getCount();
    if (codeCount === 0) {
      for (const item of SEED_CODES) {
        await this.codeService.create({
          code: item.code,
          type: item.type,
          description: item.description,
        });
      }
    }

    const codeValueCount = await this.codeValueService.getCount();
    if (codeValueCount === 0) {
      for (const sample of SEED_CODE_VALUE_SAMPLES) {
        await this.codeValueService.create(sample);
      }
    }
  }
}
