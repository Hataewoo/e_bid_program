import { PrismaClient } from '@prisma/client';

for (const url of ['file:./prisma/dev.db', 'file:./prisma/seed-template.db']) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    const list = await p.master.findMany({
      select: { masterNo: true, masterValue: true },
      orderBy: { masterNo: 'asc' },
    });
    console.log('\n', url, 'count', list.length);
    for (const m of list.filter((x) => x.masterNo === '00' || x.masterValue.length > 500)) {
      console.log(' ', m.masterNo, 'len', m.masterValue.length);
    }
  } catch (e) {
    console.log(url, e.message);
  }
  await p.$disconnect();
}
