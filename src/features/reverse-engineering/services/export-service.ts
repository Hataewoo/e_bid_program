import type { FullAnalysisResult } from '../types/analysis.types';
import { analysisService } from './analysis-service';

export class ExportService {
  toJson(result: FullAnalysisResult): string {
    return analysisService.toJsonString(result);
  }

  toTxt(result: FullAnalysisResult): string {
    const lines: string[] = [
      `Master No: ${result.masterNo}`,
      `Input Length: ${result.step1.length}`,
      '',
      '=== STEP 1: Frequency Analysis ===',
      `Length: ${result.step1.length}`,
      `Duplicate Count: ${result.step1.duplicateCount}`,
      `Consecutive Count: ${result.step1.consecutiveCount}`,
      `Even: ${result.step1.evenCount} (${result.step1.evenRatio})`,
      `Odd: ${result.step1.oddCount} (${result.step1.oddRatio})`,
      `Low (0-4): ${result.step1.lowCount} (${result.step1.lowRatio})`,
      `High (5-9): ${result.step1.highCount} (${result.step1.highRatio})`,
      '',
      'Frequency:',
      ...Object.entries(result.step1.frequency).map(([d, c]) => `  ${d}: ${c}`),
      '',
      '=== STEP 2: Low Part (0-4) ===',
      result.step2.lowPart,
      '',
      '=== STEP 3: High Part (5-9) ===',
      result.step3.highPart,
      '',
      '=== STEP 4: Consecutive Groups ===',
      result.step4.groups.join(' | '),
      '',
      '=== STEP 5: Run Length Encoding ===',
      JSON.stringify(result.step5.rle, null, 2),
      '',
      '=== STEP 6: JSON Summary ===',
      this.toJson(result),
    ];
    return lines.join('\n');
  }

  toCsv(result: FullAnalysisResult): string {
    const rows: string[][] = [
      ['section', 'key', 'value'],
      ['step1', 'length', String(result.step1.length)],
      ['step1', 'duplicateCount', String(result.step1.duplicateCount)],
      ['step1', 'consecutiveCount', String(result.step1.consecutiveCount)],
      ['step1', 'evenCount', String(result.step1.evenCount)],
      ['step1', 'oddCount', String(result.step1.oddCount)],
      ['step1', 'lowCount', String(result.step1.lowCount)],
      ['step1', 'highCount', String(result.step1.highCount)],
      ['step1', 'evenRatio', String(result.step1.evenRatio)],
      ['step1', 'oddRatio', String(result.step1.oddRatio)],
      ['step1', 'lowRatio', String(result.step1.lowRatio)],
      ['step1', 'highRatio', String(result.step1.highRatio)],
    ];

    for (const [digit, count] of Object.entries(result.step1.frequency)) {
      rows.push(['step1', `freq_${digit}`, String(count)]);
    }

    rows.push(['step2', 'lowPart', result.step2.lowPart]);
    rows.push(['step3', 'highPart', result.step3.highPart]);
    rows.push(['step4', 'groups', result.step4.groups.join('|')]);
    rows.push(['step5', 'rle', JSON.stringify(result.step5.rle)]);
    rows.push(['step5', 'rleCounts', result.step5.rleCounts.join('|')]);

    return rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  async copyToClipboard(result: FullAnalysisResult): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.toJson(result));
      return true;
    } catch {
      return false;
    }
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  exportJson(result: FullAnalysisResult): void {
    this.downloadFile(
      this.toJson(result),
      `re-analysis-${result.masterNo}.json`,
      'application/json',
    );
  }

  exportTxt(result: FullAnalysisResult): void {
    this.downloadFile(this.toTxt(result), `re-analysis-${result.masterNo}.txt`, 'text/plain');
  }

  exportCsv(result: FullAnalysisResult): void {
    this.downloadFile(this.toCsv(result), `re-analysis-${result.masterNo}.csv`, 'text/csv');
  }
}

export const exportService = new ExportService();
