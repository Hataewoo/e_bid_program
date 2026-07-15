import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const checks = [
  { label: 'dev.db', url: 'file:D:/e_bid_program/prisma/dev.db' },
  { label: 'seed-template.db', url: 'file:D:/e_bid_program/prisma/seed-template.db' },
];

for (const { label, url } of checks) {
  const filePath = url.replace('file:', '');
  console.log(`\n========== ${label} ==========`);
  if (!fs.existsSync(filePath)) {
    console.log('파일 없음:', filePath);
    continue;
  }
  const stat = fs.statSync(filePath);
  console.log('경로:', filePath);
  console.log('크기:', stat.size, 'bytes');
  console.log('수정:', stat.mtime.toISOString());

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [masters, codes, codeValues] = await Promise.all([
      prisma.master.findMany({
        select: { masterNo: true, masterValue: true, memo: true, updatedAt: true },
        orderBy: { masterNo: 'asc' },
      }),
      prisma.code.findMany({
        select: { code: true, type: true, description: true },
        orderBy: { code: 'asc' },
      }),
      prisma.codeValue.findMany({
        select: { code: true, value: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    const mastersWithValue = masters.filter((m) => (m.masterValue ?? '').trim().length > 0);
    console.log('\n[Master]');
    console.log('  전체 슬롯:', masters.length);
    console.log('  값 있음:', mastersWithValue.length);
    for (const m of mastersWithValue.slice(0, 10)) {
      console.log(
        `  ${m.masterNo}: ${m.masterValue.length}자 | memo=${m.memo ?? '-'} | ${m.updatedAt.toISOString()}`,
      );
    }
    if (mastersWithValue.length > 10) {
      console.log(`  ... 외 ${mastersWithValue.length - 10}건`);
    }

    console.log('\n[Code]');
    console.log('  건수:', codes.length);
    for (const c of codes.slice(0, 5)) {
      console.log(`  ${c.code} (${c.type}) ${c.description}`);
    }
    if (codes.length > 5) console.log(`  ... 외 ${codes.length - 5}건`);

    console.log('\n[CodeValue]');
    console.log('  건수:', codeValues.length);

    const ok =
      mastersWithValue.length > 0 && codes.length >= 31 && fs.existsSync(filePath) && stat.size > 50000;
    console.log('\n판정:', ok ? 'OK — 템플릿으로 사용 가능' : '주의 — 데이터 부족 또는 빈 DB');
  } finally {
    await prisma.$disconnect();
  }
}
