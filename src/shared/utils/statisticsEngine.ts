import type { Master } from '@/types/electron';
import type { FrequencyData, FrequencyItem } from '@/features/statistics/types/frequency.types';
import type { LowHighRatio } from '@/features/statistics/types/low-high-ratio.types';
import { analyzeMasterValueCached } from './analysisCache';
import { analyzeMasterValue, calcRate, type AnalysisResult } from './analysisEngine';

export function buildDigitFrequency(digits: string): FrequencyData {
  const counts = new Map<number, number>();

  for (const ch of digits) {
    const digit = Number(ch);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }

  const totalDigits = digits.length;
  const items: FrequencyItem[] = Array.from({ length: 10 }, (_, digit) => ({
    digit,
    count: counts.get(digit) ?? 0,
    ratio: totalDigits > 0 ? calcRate(counts.get(digit) ?? 0, totalDigits) : 0,
  }));

  const uniqueDigits = items.filter((item) => item.count > 0).length;

  return {
    items,
    summary: { totalDigits, uniqueDigits },
  };
}

export function buildLowHighRatioFromResult(result: AnalysisResult): LowHighRatio {
  const low = result.lowRate;
  const high = result.highRate;
  const difference = Math.abs(low - high);

  let dominant: LowHighRatio['dominant'] = 'SAME';
  if (low > high) dominant = 'LOW';
  else if (high > low) dominant = 'HIGH';

  return { low, high, difference, dominant };
}

export function buildRunCountText(result: AnalysisResult): string {
  const { runs } = result;
  if (runs.length === 0) return 'Runs: 0';

  const maxRun = Math.max(...runs.map((run) => run.length));
  const avgRun = runs.reduce((sum, run) => sum + run.length, 0) / runs.length;

  return `Total Runs: ${runs.length} | Max Run: ${maxRun} | Avg Run: ${avgRun.toFixed(1)}`;
}

export function buildDistributionText(digits: string): string {
  const frequency = buildDigitFrequency(digits);
  if (frequency.summary.totalDigits === 0) return '데이터 없음';

  const top = [...frequency.items].sort((a, b) => b.count - a.count).slice(0, 3);
  return top.map((item) => `숫자 ${item.digit}: ${item.ratio.toFixed(1)}%`).join(' | ');
}

export function buildStatisticsSummaryText(
  result: AnalysisResult,
  frequency: FrequencyData,
): string {
  const mode = [...frequency.items].sort((a, b) => b.count - a.count || a.digit - b.digit)[0];
  const modeLabel = mode && mode.count > 0 ? `최빈값: ${mode.digit}` : '최빈값: -';

  const formatRate = (rate: number) => (Number.isInteger(rate) ? String(rate) : rate.toFixed(1));

  return `자릿수: ${result.totalCount} | Low: ${formatRate(result.lowRate)}% | High: ${formatRate(result.highRate)}% | ${modeLabel}`;
}

export function buildFrequencyCardText(frequency: FrequencyData): string {
  if (frequency.summary.totalDigits === 0) return '데이터 없음';
  return frequency.items
    .filter((item) => item.count > 0)
    .map((item) => `${item.digit}:${item.count}`)
    .join(' | ');
}

export function buildLowHighCardText(ratio: LowHighRatio): string {
  return `Low: ${ratio.low.toFixed(1)}% / High: ${ratio.high.toFixed(1)}% (${ratio.dominant})`;
}

export function analyzeMasterStatistics(master: Master, useCache = true): AnalysisResult {
  if (useCache) {
    return analyzeMasterValueCached(master.masterNo, master.masterValue);
  }
  return analyzeMasterValue(master.masterNo, master.masterValue);
}
