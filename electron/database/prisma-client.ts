import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { PrismaClient as PrismaClientInstance } from '@prisma/client';

export type PrismaClient = PrismaClientInstance;

type PrismaClientCtor = new () => PrismaClientInstance;

let cachedCtor: PrismaClientCtor | null = null;

function resolvePackagedClientEntry(): string {
  const candidates = [
    path.join(process.resourcesPath, 'prisma-client', 'index.js'),
    path.join(path.dirname(app.getPath('exe')), 'resources', 'prisma-client', 'index.js'),
  ];

  for (const entry of candidates) {
    if (fs.existsSync(entry)) return entry;
  }

  throw new Error(
    '[DB] Packaged Prisma client not found. Expected resources/prisma-client/index.js',
  );
}

function loadPrismaClientCtor(): PrismaClientCtor {
  if (cachedCtor) return cachedCtor;

  const require = createRequire(import.meta.url);
  const entry = app.isPackaged ? resolvePackagedClientEntry() : '@prisma/client';
  const mod = require(entry) as { PrismaClient: PrismaClientCtor };
  cachedCtor = mod.PrismaClient;
  return cachedCtor;
}

/** Lazy-load Prisma after configurePrismaQueryEngine() in packaged builds. */
export function createPrismaClient(): PrismaClientInstance {
  const Ctor = loadPrismaClientCtor();
  return new Ctor();
}
