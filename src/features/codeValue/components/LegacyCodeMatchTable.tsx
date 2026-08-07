import { memo } from 'react';
import type { LegacyCodeContentRow } from '@/shared/utils/legacyCodeContentEngine';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';

interface LegacyCodeMatchTableProps {
  rows: LegacyCodeContentRow[];
  loading?: boolean;
  engineVersion?: string;
  hintKey?: MessageKey;
}

export const LegacyCodeMatchTable = memo(function LegacyCodeMatchTable({
  rows,
  loading = false,
  engineVersion,
  hintKey = 'codeValue.legacy.step2CodeTableHint',
}: LegacyCodeMatchTableProps) {
  const { t } = useI18n();

  return (
    <div className="flex h-full min-h-0 flex-col border border-[#404040] bg-white">
      <div className="win-pattern-stats-line shrink-0">
        {t(hintKey)}
        {engineVersion ? (
          <span className="ml-2 text-[10px] text-content-muted">[{engineVersion}]</span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-content-muted">
            {t('analysis.codeValue.computing')}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-content-muted">
            {t('codeValue.legacy.noCodeMatches')}
          </div>
        ) : (
          <table className="win-pattern-values-table win-legacy-pattern-table w-full">
            <thead>
              <tr>
                <th className="win-pattern-code-col text-left">{t('code.grid.code')}</th>
                <th className="win-pattern-values-col text-left">{t('codeValue.legacy.contentColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <td className="win-pattern-code-col font-semibold text-[#0000ff]">{row.code}</td>
                  <td className="win-pattern-values-col win-legacy-table-content">{row.content || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});
