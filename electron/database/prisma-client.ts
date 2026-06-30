import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';
import type { PrismaClient as PrismaClientInstance } from '@prisma/client';

export type PrismaClient = PrismaClientInstance;

type PrismaClientCtor = new () => PrismaClientInstance;

let cachedCtor: PrismaClientCtor | null = null;

function getRequireRoot(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'package.json');
  }
  return path.join(fileURLToPath(new URL('../../package.json', import.meta.url)));
}

function loadPrismaClientCtor(): PrismaClientCtor {
  if (cachedCtor) return cachedCtor;

  // Resolve @prisma/client from app root so nested .prisma/client (asarUnpack) is found.
  const require = createRequire(getRequireRoot());
  const mod = require('@prisma/client') as { PrismaClient: PrismaClientCtor };
  cachedCtor = mod.PrismaClient;
  return cachedCtor;
}

/** Lazy-load Prisma after configurePrismaQueryEngine() in packaged builds. */
export function createPrismaClient(): PrismaClientInstance {
  const Ctor = loadPrismaClientCtor();
  return new Ctor();
}
