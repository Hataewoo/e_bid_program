import { PrismaClient } from '@prisma/client';
import { analyzeMasterValue, buildRuns, toClassSequence, extractSidePatterns } from '../src/shared/utils/analysisEngine.ts';
import { filterDigitsByClass } from '../src/features/analysis/utils/analysis-display.ts';

const prisma = new PrismaClient();
const m = await prisma.master.findFirst({ where: { masterNo: '00' } });
if (!m) {
  console.log('Master 00 not found');
  process.exit(1);
}
const digits = m.masterValue.replace(/\D/g, '');
console.log('len', digits.length);
console.log('low', [...digits].filter((c) => c <= '4').length);
console.log('high', [...digits].filter((c) => c >= '5').length);

const result = analyzeMasterValue('00', digits);
const lowRuns = result.runs.filter((r) => r.cls === 'low').map((r) => r.length);
const highRuns = result.runs.filter((r) => r.cls === 'high').map((r) => r.length);
console.log('low runs count', lowRuns.length);
console.log('high runs count', highRuns.length);
console.log('low runs first 30', lowRuns.slice(0, 30).join(','));
console.log('high runs first 30', highRuns.slice(0, 30).join(','));
console.log('oneDuplicate low', result.lowPatterns.oneDuplicate.slice(0, 20));
console.log('threeOrMore low', result.lowPatterns.threeOrMore.slice(0, 20));
await prisma.$disconnect();
