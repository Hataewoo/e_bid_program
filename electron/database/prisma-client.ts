import { createRequire } from 'node:module';
import Module from 'node:module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';
import type { PrismaClient as PrismaClientInstance } from '@prisma/client';

export type PrismaClient = PrismaClientInstance;

type PrismaClientCtor = new () => PrismaClientInstance;

let cachedCtor: PrismaClientCtor | null = null;
let packagedResolverInstalled = false;

function getDevRequireRoot(): string {
  // Vite dev 번들은 `new URL('../../package.json', import.meta.url)`를 data: URL로 인라인해
  // fileURLToPath가 실패하므로, main.js 기준 디렉터리에서 프로젝트 루트를 계산한다.
  const mainDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(mainDir, '..', 'package.json'),
    path.join(process.cwd(), 'package.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function getPackagedBundledClientDir(): string {
  return path.join(process.resourcesPath, 'prisma-client');
}

function resolveBundledClientFile(bundledClientDir: string, subPath: string): string | null {
  const normalized = subPath.endsWith('.js') ? subPath : `${subPath}.js`;
  const candidate = path.join(bundledClientDir, normalized);
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

/**
 * In packaged builds, @prisma/client/default.js requires ".prisma/client/default".
 * That path breaks when .prisma lives in asar.unpacked or extraResources — redirect
 * to resources/prisma-client (electron-builder extraResources).
 */
function installPackagedPrismaModuleResolver(bundledClientDir: string): void {
  if (packagedResolverInstalled) return;
  packagedResolverInstalled = true;

  const unpackedPrismaRoot = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    '@prisma',
    'client',
  );

  type ResolveFilename = (
    request: string,
    parent: Module | null,
    isMain: boolean,
    options?: unknown,
  ) => string;

  const moduleHost = Module as unknown as {
    _resolveFilename: ResolveFilename;
  };
  const originalResolve = moduleHost._resolveFilename;

  moduleHost._resolveFilename = function patchedResolve(
    request,
    parent,
    isMain,
    options,
  ) {
    if (request === '.prisma/client/default' || request.startsWith('.prisma/client/')) {
      const subPath =
        request === '.prisma/client/default'
          ? 'default.js'
          : request.slice('.prisma/client/'.length);
      const bundled = resolveBundledClientFile(bundledClientDir, subPath);
      if (bundled) return bundled;
    }

    if (request.startsWith('@prisma/client/') && fs.existsSync(unpackedPrismaRoot)) {
      const rel = request.slice('@prisma/client/'.length);
      const runtimeCandidate = path.join(unpackedPrismaRoot, rel);
      if (fs.existsSync(runtimeCandidate)) return runtimeCandidate;
      if (fs.existsSync(`${runtimeCandidate}.js`)) return `${runtimeCandidate}.js`;
    }

    return originalResolve.call(this, request, parent, isMain, options);
  };
}

function loadPrismaClientCtor(): PrismaClientCtor {
  if (cachedCtor) return cachedCtor;

  if (app.isPackaged) {
    const bundledClientDir = getPackagedBundledClientDir();
    const bundledIndex = path.join(bundledClientDir, 'index.js');

    if (!fs.existsSync(bundledIndex)) {
      throw new Error(
        `Bundled Prisma client not found at ${bundledIndex}. ` +
          'Rebuild with prepare:packaging and extraResources prisma-client.',
      );
    }

    installPackagedPrismaModuleResolver(bundledClientDir);
    const require = createRequire(path.join(app.getAppPath(), 'package.json'));
    const mod = require(bundledIndex) as { PrismaClient: PrismaClientCtor };
    cachedCtor = mod.PrismaClient;
    return cachedCtor;
  }

  const require = createRequire(getDevRequireRoot());
  const mod = require('@prisma/client') as { PrismaClient: PrismaClientCtor };
  cachedCtor = mod.PrismaClient;
  return cachedCtor;
}

/** Lazy-load Prisma after configurePrismaQueryEngine() in packaged builds. */
export function createPrismaClient(): PrismaClientInstance {
  const Ctor = loadPrismaClientCtor();
  return new Ctor();
}
