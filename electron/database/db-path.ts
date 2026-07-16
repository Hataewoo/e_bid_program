import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  ensureProductionDatabaseFromTemplate,
  type TemplateDbSyncResult,
} from './template-db-sync';

/** 배포 환경 userData 내 SQLite 파일명 */
export const PROD_DB_FILENAME = 'database.db';

/** 개발 환경 — 프로젝트 루트 기준 */
export const DEV_DB_RELATIVE = path.join('prisma', 'dev.db');

/** extraResources에 복사되는 템플릿 DB (resources/database.db) */
export const PACKAGED_TEMPLATE_DB = 'database.db';

export interface DatabasePathInfo {
  dbPath: string;
  mode: 'development' | 'production';
  userDataPath: string;
  templateCopied: boolean;
  templateSynced: boolean;
}

export function resolveProjectRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'prisma', 'schema.prisma'))) {
    return cwd;
  }

  const appPath = app.getAppPath();
  if (fs.existsSync(path.join(appPath, 'prisma', 'schema.prisma'))) {
    return appPath;
  }

  const parentOfApp = path.join(appPath, '..');
  if (fs.existsSync(path.join(parentOfApp, 'prisma', 'schema.prisma'))) {
    return parentOfApp;
  }

  return cwd;
}

function findPackagedTemplateDb(): string | null {
  const candidates = [
    path.join(process.resourcesPath, PACKAGED_TEMPLATE_DB),
    path.join(process.resourcesPath, 'prisma', 'dev.db'),
    path.join(process.resourcesPath, 'prisma-client', 'dev.db'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * 배포 DB 준비 — 최초 설치 복사 + 앱 버전 변경 시 템플릿 덮어쓰기.
 */
export function bootstrapProductionDatabase(
  targetPath: string,
  appVersion: string,
): TemplateDbSyncResult {
  const templatePath = findPackagedTemplateDb();
  const result = ensureProductionDatabaseFromTemplate({
    targetPath,
    templatePath,
    userDataPath: app.getPath('userData'),
    appVersion,
  });

  if (result.copied) {
    console.info('[DB] Template copied (first install):', templatePath, '->', targetPath);
  } else if (result.synced) {
    console.info('[DB] Template synced on app update ->', appVersion);
  } else if (!templatePath) {
    console.warn(
      '[DB] Packaged template DB not found in resourcesPath.\n' +
        `  resourcesPath: ${process.resourcesPath}\n` +
        '  Prisma will create a new SQLite file on first connect.',
    );
  }

  return result;
}

/**
 * 개발: <projectRoot>/prisma/dev.db
 * 배포: <userData>/database.db (+ 최초/업데이트 시 템플릿 반영)
 */
export function resolveDatabasePath(): DatabasePathInfo {
  const userDataPath = app.getPath('userData');
  const e2eDbPath = process.env.CSEBID_E2E_DB_PATH?.trim();

  if (!app.isPackaged && e2eDbPath) {
    const dbPath = path.resolve(e2eDbPath);
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return {
      dbPath,
      mode: 'development',
      userDataPath,
      templateCopied: false,
      templateSynced: false,
    };
  }

  if (!app.isPackaged) {
    const root = resolveProjectRoot();
    const dbPath = path.join(root, DEV_DB_RELATIVE);
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return {
      dbPath,
      mode: 'development',
      userDataPath,
      templateCopied: false,
      templateSynced: false,
    };
  }

  const dbPath = path.join(userDataPath, PROD_DB_FILENAME);
  const templateResult = bootstrapProductionDatabase(dbPath, app.getVersion());

  return {
    dbPath,
    mode: 'production',
    userDataPath,
    templateCopied: templateResult.copied,
    templateSynced: templateResult.synced,
  };
}

function listPrismaEngineCandidates(): string[] {
  const exeDir = path.dirname(app.getPath('exe'));
  const appPath = app.getAppPath();
  const resources = process.resourcesPath;

  return [
    path.join(resources, 'prisma-client', 'query_engine-windows.dll.node'),
    path.join(exeDir, 'resources', 'prisma-client', 'query_engine-windows.dll.node'),
    path.join(
      resources,
      'app.asar.unpacked',
      'node_modules',
      '.prisma',
      'client',
      'query_engine-windows.dll.node',
    ),
    path.join(resources, 'prisma', 'query_engine-windows.dll.node'),
    path.join(resources, 'prisma-engines', 'query_engine-windows.dll.node'),
    path.join(
      resources,
      'app.asar.unpacked',
      'node_modules',
      '@prisma',
      'engines',
      'query_engine-windows.dll.node',
    ),
    path.join(appPath, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'),
    path.join(
      appPath,
      '..',
      'app.asar.unpacked',
      'node_modules',
      '.prisma',
      'client',
      'query_engine-windows.dll.node',
    ),
  ];
}

/** Prisma query engine (.node) — asar 밖 또는 extraResources 탐색 */
export function resolvePrismaEnginePath(): string | null {
  for (const candidate of listPrismaEngineCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function ensureUserDataDirectory(): string {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
    console.info('[DB] userData directory created:', userDataPath);
  }
  return userDataPath;
}

export function configurePrismaQueryEngine(): void {
  if (!app.isPackaged) return;

  process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

  const enginePath = resolvePrismaEnginePath();
  if (enginePath) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
    console.info('[DB] Prisma query engine:', enginePath);
    return;
  }

  const searched = listPrismaEngineCandidates().join('\n    ');
  console.error(
    '[DB] Prisma query engine not found — PrismaClientInitializationError 가능\n' +
      '  Searched:\n    ' +
      searched +
      '\n  Fix: extraResources node_modules/.prisma/client -> prisma-client, asarUnpack **/*.node',
  );
}
