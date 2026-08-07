import { PrismaClient } from '@prisma/client';

const dbPath = process.argv[2] ?? 'C:/Users/USER/AppData/Roaming/cs-e-bid-program/database.db';
process.env.DATABASE_URL = `file:${dbPath}`;

const p = new PrismaClient();
const m = await p.master.findFirst({ where: { masterNo: '00' } });
console.log(JSON.stringify({ len: m?.masterValue?.length ?? 0, head: m?.masterValue?.slice(0, 100) ?? null }));
await p.$disconnect();
