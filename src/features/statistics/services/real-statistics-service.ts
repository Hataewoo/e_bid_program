import { translate } from '@/i18n/translate';
import type { Master } from '@/types/electron';
import { masterDisplayName } from '@/shared/utils/masterFilter';
import {
  analyzeMasterStatistics,
  buildDigitFrequency,
  buildDistributionText,
  buildFrequencyCardText,
  buildLowHighCardText,
  buildLowHighRatioFromResult,
  buildRunCountText,
  buildStatisticsSummaryText,
} from '@/shared/utils/statisticsEngine';
import {
  CARD_TITLES,
  type StatisticsData,
  type StatisticsMasterInfo,
} from '../types/statistics.types';

export { filterMasters } from '@/shared/utils/masterFilter';

export function buildRealStatistics(master: Master): {
  statisticsData: StatisticsData;
  masterInfo: StatisticsMasterInfo;
} {
  const result = analyzeMasterStatistics(master);
  const frequency = buildDigitFrequency(result.digits);
  const ratio = buildLowHighRatioFromResult(result);

  const cardContent: Record<(typeof CARD_TITLES)[number], string> = {
    Frequency: buildFrequencyCardText(frequency),
    'Low / High Ratio': buildLowHighCardText(ratio),
    'Run Count': buildRunCountText(result),
    Distribution: buildDistributionText(result.digits),
    'Recent History': translate('statistics.card.recentHistoryHint'),
    'Statistics Summary': buildStatisticsSummaryText(result, frequency),
  };

  return {
    statisticsData: {
      cards: CARD_TITLES.map((title) => ({
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        content: cardContent[title],
      })),
    },
    masterInfo: {
      masterNo: master.masterNo,
      description: masterDisplayName(master),
      createdAt: master.createdAt,
      updatedAt: master.updatedAt,
    },
  };
}
