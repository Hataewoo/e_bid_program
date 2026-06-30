import type { FrequencyItem } from '../../types/frequency.types';
import { barHeightPercent, isLowDigit } from '../../utils/chart-metrics';

interface FrequencyRowProps {
  item: FrequencyItem;
  selected: boolean;
  onSelect: (digit: number) => void;
  maxCount: number;
}

export function FrequencyRow({ item, selected, onSelect, maxCount }: FrequencyRowProps) {
  const ratioWidth = barHeightPercent(item.count, maxCount, 0);
  const low = isLowDigit(item.digit);

  return (
    <tr
      className={`cursor-pointer border-b border-border transition-colors ${
        selected ? 'bg-accent/15 text-content' : 'hover:bg-surface-muted'
      }`}
      onClick={() => onSelect(item.digit)}
    >
      <td className="px-3 py-1.5 font-mono text-sm">{item.digit}</td>
      <td className="px-3 py-1.5 text-right font-mono text-sm">{item.count}</td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full ${low ? 'bg-blue-600' : 'bg-orange-500'}`}
              style={{ width: `${ratioWidth}%` }}
            />
          </div>
          <span className="min-w-[3rem] font-mono text-sm">{item.ratio.toFixed(1)}%</span>
        </div>
      </td>
    </tr>
  );
}
