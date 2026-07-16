/**
 * 프로덕션 패키징 전:
 * 1) Prisma Client / Query Engine 생성
 * 2) prisma/dev.db 템플릿 DB 준비 (extraResources -> database.db)
 *    - 기존 dev.db(마스터 19 포함)를 유지하고 스키마만 맞춤
 *    - seed-template.db 백업 동기화
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const prismaClientDir = path.join(root, 'node_modules', '.prisma', 'client');
const devDbPath = path.join(root, 'prisma', 'dev.db');
const seedTemplatePath = path.join(root, 'prisma', 'seed-template.db');

console.log('[packaging] prisma generate...');
try {
  execSync('npx prisma generate', { cwd: root, stdio: 'inherit' });
} catch {
  if (fs.existsSync(prismaClientDir)) {
    console.warn(
      '[packaging] prisma generate skipped (engine locked?) — using existing .prisma/client',
    );
  } else {
    console.error('[packaging] ERROR: prisma generate failed and no client found');
    process.exit(1);
  }
}

if (!fs.existsSync(prismaClientDir)) {
  console.error('[packaging] ERROR: .prisma/client not found after generate');
  process.exit(1);
}

const engines = fs
  .readdirSync(prismaClientDir)
  .filter((f) => f.endsWith('.node') && f.includes('query_engine'));
if (engines.length === 0) {
  console.error('[packaging] ERROR: query_engine-windows.dll.node not found in .prisma/client');
  process.exit(1);
}
console.log('[packaging] Prisma query engine:', engines.join(', '));

const schemaPath = path.join(root, 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('[packaging] ERROR: prisma/schema.prisma missing');
  process.exit(1);
}

console.log('[packaging] preparing template database prisma/dev.db ...');

if (!fs.existsSync(devDbPath)) {
  if (fs.existsSync(seedTemplatePath)) {
    fs.copyFileSync(seedTemplatePath, devDbPath);
    console.log('[packaging] copied seed-template.db -> dev.db');
  } else {
    console.log('[packaging] creating empty prisma/dev.db ...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: `file:${devDbPath}`,
      },
    });
  }
} else {
  console.log('[packaging] reusing existing prisma/dev.db as installer template');
}

try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: `file:${devDbPath}`,
    },
  });
} catch {
  console.error('[packaging] ERROR: failed to align prisma/dev.db schema');
  process.exit(1);
}

if (!fs.existsSync(devDbPath)) {
  console.error('[packaging] ERROR: prisma/dev.db was not created');
  process.exit(1);
}

try {
  fs.copyFileSync(devDbPath, seedTemplatePath);
  console.log('[packaging] backup synced: dev.db -> seed-template.db');
} catch (error) {
  console.warn('[packaging] seed-template.db backup skipped:', error);
}

const stat = fs.statSync(devDbPath);
console.log('[packaging] template DB ready:', devDbPath, `(${stat.size} bytes)`);
console.log('[packaging] Ready for electron-builder (win x64)');
