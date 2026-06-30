import { digitFrequencyService } from './digit-frequency-service';
import { groupingService } from './grouping-service';
import { rleService } from './rle-service';
import type { FullAnalysisResult } from '../types/analysis.types';

export class AnalysisService {
  analyze(masterNo: string, masterValue: string): FullAnalysisResult | null {
    const normalized = masterValue.replace(/\s/g, '');
    if (!normalized) return null;

    const step1 = digitFrequencyService.analyze(normalized);
    const lowPart = groupingService.extractLowPart(normalized);
    const highPart = groupingService.extractHighPart(normalized);
    const groups = groupingService.findConsecutiveGroups(normalized);
    const rle = rleService.encode(normalized);
    const rleCounts = rleService.toCounts(rle);

    return {
      masterNo,
      input: normalized,
      step1,
      step2: { lowPart },
      step3: { highPart },
      step4: { groups },
      step5: { rle, rleCounts },
      step6: {
        length: step1.length,
        frequency: step1.frequency,
        lowPart,
        highPart,
        groups,
        rle,
        evenCount: step1.evenCount,
        oddCount: step1.oddCount,
        lowCount: step1.lowCount,
        highCount: step1.highCount,
        duplicateCount: step1.duplicateCount,
        consecutiveCount: step1.consecutiveCount,
      },
    };
  }

  toJsonString(result: FullAnalysisResult): string {
    return JSON.stringify(result.step6, null, 2);
  }
}

export const analysisService = new AnalysisService();
