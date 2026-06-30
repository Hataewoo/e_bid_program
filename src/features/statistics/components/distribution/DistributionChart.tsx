import type { FrequencyItem } from '@/features/statistics/types/frequency.types';
import { DigitDistributionBarChart } from '../charts/DigitDistributionBarChart';

interface DistributionChartProps {
  items: FrequencyItem[];
  selectedDigit?: number | null;
  onSelectDigit?: (digit: number) => void;
}

export function DistributionChart({ items, selectedDigit, onSelectDigit }: DistributionChartProps) {
  return (
    <DigitDistributionBarChart
      items={items}
      selectedDigit={selectedDigit}
      onSelectDigit={onSelectDigit}
    />
  );
}
