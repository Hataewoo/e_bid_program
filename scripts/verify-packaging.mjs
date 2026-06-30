import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const checks = [
  {
    name: 'prisma/schema.prisma',
    ok: fs.existsSync(path.join(root, 'prisma', 'schema.prisma')),
  },
  {
    name: 'node_modules/.prisma/client',
    ok: fs.existsSync(path.join(root, 'node_modules', '.prisma', 'client')),
  },
  {
    name: 'prisma/dev.db (template)',
    ok: fs.existsSync(path.join(root, 'prisma', 'dev.db')),
  },
  {
    name: 'dist/index.html (renderer build)',
    ok: fs.existsSync(path.join(root, 'dist', 'index.html')),
  },
  {
    name: 'dist-electron/main.js',
    ok: fs.existsSync(path.join(root, 'dist-electron', 'main.js')),
  },
  {
    name: 'electron-builder config',
    ok: Boolean(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).build?.nsis),
  },
];

const releasePrismaClient = path.join(root, 'release', 'win-unpacked', 'resources', 'prisma-client');
if (fs.existsSync(releasePrismaClient)) {
  checks.push(
    {
      name: 'release/resources/prisma-client/index.js',
      ok: fs.existsSync(path.join(releasePrismaClient, 'index.js')),
    },
    {
      name: 'release/resources/prisma-client/query_engine-windows.dll.node',
      ok: fs
        .readdirSync(releasePrismaClient)
        .some((f) => f.includes('query_engine') && f.endsWith('.node')),
    },
  );
}

let failed = 0;
for (const check of checks) {
  const mark = check.ok ? 'OK' : 'MISSING';
  console.log(`[verify-packaging] ${mark} — ${check.name}`);
  if (!check.ok) failed += 1;
}

if (failed > 0) {
  console.error(`[verify-packaging] ${failed} check(s) failed`);
  console.error('[verify-packaging] Run: npm run build && npm run prepare:packaging');
  process.exit(1);
}

console.log('[verify-packaging] All checks passed. Ready for: npm run build:prod:nsis');
