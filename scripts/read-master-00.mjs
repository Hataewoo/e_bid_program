import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const m = await p.master.findFirst({ where: { masterNo: '00' } });
console.log(JSON.stringify({ len: m?.masterValue?.length ?? 0, head: m?.masterValue?.slice(0, 120) ?? null }));
await p.$disconnect();
