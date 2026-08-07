import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  analyzePointValuesPatterns,
  buildSubBandPointValueCounts,
  filterPointValuesToSubBand,
  getSidePointValues,
  resolveSubBandFromPointValues,
} from '../src/shared/utils/pointValuesCodeFlow';
import { resolvePatternRecommendPath } from '../src/shared/utils/patternRecommendEngine';
import { getSubBandLabel } from '../src/shared/utils/digitSubBand';

const masterValue = process.argv[2] ?? '5566775617';
const prefix = process.argv[3] ?? '6';

const result = analyzeMasterValue('00', masterValue);
const hpv = getSidePointValues(result, prefix, 'high');
const hlFiltered = filterPointValuesToSubBand(hpv, 'highLow');
const hhFiltered = filterPointValuesToSubBand(hpv, 'highHigh');

const hlAnalysis = analyzePointValuesPatterns(hlFiltered, 'high');
const hhAnalysis = analyzePointValuesPatterns(hhFiltered, 'high');

const report = buildSubBandPointValueCounts(result, prefix);
const path = resolvePatternRecommendPath(result, prefix);
const sub = resolveSubBandFromPointValues(result, prefix, 'high');

console.log('Master:', masterValue, '| prefix:', JSON.stringify(prefix));
console.log('High Point Values (full):', hpv);
console.log('');
console.log('--- highLow (5~7) filter ---');
console.log('filtered:', hlFiltered);
console.log("S':", hlAnalysis.baseSequence.join(', '));
console.log('active rules:');
for (const row of hlAnalysis.rows.filter((r) => r.values.length > 0)) {
  console.log(`  ${row.code}: [${row.values.join(', ')}]`);
}
console.log('');
console.log('--- highHigh (8~9) filter ---');
console.log('filtered:', hhFiltered);
console.log("S':", hhAnalysis.baseSequence.join(', '));
console.log('active rules:');
for (const row of hhAnalysis.rows.filter((r) => r.values.length > 0)) {
  console.log(`  ${row.code}: [${row.values.join(', ')}]`);
}
console.log('');
console.log('Comparison scores:', report.highComparison.scores);
console.log('Selected:', report.highComparison.selected, getSubBandLabel(report.highComparison.selected));
console.log('');
console.log('Path subBand:', path.targetSubBand, getSubBandLabel(path.targetSubBand));
console.log('');
console.log('Sub-band reasons (② only):');
for (const r of path.subBandReasons) {
  if (r.includes('3 이상') || r.includes('5 이상') || r.includes('가점') || r.includes('source') || r.includes('필터')) {
    console.log(' ', r);
  }
}
