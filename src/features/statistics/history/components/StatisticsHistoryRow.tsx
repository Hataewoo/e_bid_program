import type { StatisticsHistory } from '../../types/statistics-history.types';
import { formatHistoryTime, masterDisplayLabel } from '../../types/statistics-history.types';

interface StatisticsHistoryRowProps {
  item: StatisticsHistory;
  selected: boolean;
  onSelect: (item: StatisticsHistory) => void;
}

function StatusBadge({ status }: { status: StatisticsHistory['status'] }) {
  const cls = status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const label = status === 'SUCCESS' ? 'Success' : 'Failed';
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function StatisticsHistoryRow({ item, selected, onSelect }: StatisticsHistoryRowProps) {
  return (
    <tr
      className={`cursor-pointer border-b border-border transition-colors ${
        selected ? 'bg-accent/15' : 'hover:bg-surface-muted'
      }`}
      onClick={() => onSelect(item)}
    >
      <td className="whitespace-nowrap px-2 py-1.5 text-xs">{formatHistoryTime(item.createdAt)}</td>
      <td className="px-2 py-1.5 text-xs">{masterDisplayLabel(item.masterNo)}</td>
      <td className="px-2 py-1.5 text-xs">{item.analysisType}</td>
      <td className="px-2 py-1.5 text-xs">{item.result}</td>
      <td className="px-2 py-1.5 text-right font-mono text-xs">{item.duration}ms</td>
      <td className="px-2 py-1.5">
        <StatusBadge status={item.status} />
      </td>
    </tr>
  );
}
