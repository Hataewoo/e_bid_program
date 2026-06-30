import { translate } from '@/i18n/translate';
import type { MessageKey } from '@/i18n/messages';

const CARD_TITLE_KEYS: Record<string, MessageKey> = {
  Frequency: 'statistics.panel.frequency',
  'Low / High Ratio': 'statistics.panel.lowHigh',
  'Run Count': 'statistics.card.runCount',
  Distribution: 'statistics.distribution.title',
  'Recent History': 'statistics.card.recentHistory',
  'Statistics Summary': 'statistics.card.statisticsSummary',
};

export function translateStatisticsCardTitle(title: string): string {
  const key = CARD_TITLE_KEYS[title];
  return key ? translate(key) : title;
}
