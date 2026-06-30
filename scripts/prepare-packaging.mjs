/**
 * 프로덕션 패키징 전:
 * 1) Prisma Client / Query Engine 생성
 * 2) prisma/dev.db 템플릿 DB 생성 (extraResources -> database.db)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const prismaClientDir = path.join(root, 'node_modules', '.prisma', 'client');
const devDbPath = path.join(root, 'prisma', 'dev.db');

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

console.log('[packaging] creating template database prisma/dev.db ...');
let skipDbPush = false;
if (fs.existsSync(devDbPath)) {
  try {
    fs.unlinkSync(devDbPath);
  } catch {
    console.warn('[packaging] dev.db in use — reusing existing prisma/dev.db as template');
    skipDbPush = true;
  }
}

if (!skipDbPush) {
  try {
    execSync('npx prisma db push --skip-generate', {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: `file:${devDbPath}`,
      },
    });
  } catch {
    console.error('[packaging] ERROR: failed to create prisma/dev.db template');
    process.exit(1);
  }
}

if (!fs.existsSync(devDbPath)) {
  console.error('[packaging] ERROR: prisma/dev.db was not created');
  process.exit(1);
}

console.log('[packaging] template DB ready:', devDbPath);
console.log('[packaging] Ready for electron-builder (win x64)');
