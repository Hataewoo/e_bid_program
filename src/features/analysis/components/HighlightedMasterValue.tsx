import { memo, useMemo, useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { MASTER_VALUE_DISPLAY_CAP } from '../utils/analysis-display';

const CHUNK_SIZE = 80;

interface HighlightedMasterValueProps {
  digits: string;
  highlightIndices: ReadonlySet<number>;
}

export const HighlightedMasterValue = memo(function HighlightedMasterValue({
  digits,
  highlightIndices,
}: HighlightedMasterValueProps) {
  const { t } = useI18n();
  const [showFull, setShowFull] = useState(false);

  const displayDigits = useMemo(() => {
    if (showFull || digits.length <= MASTER_VALUE_DISPLAY_CAP) return digits;
    return digits.slice(0, MASTER_VALUE_DISPLAY_CAP);
  }, [digits, showFull]);

  const truncated = !showFull && digits.length > MASTER_VALUE_DISPLAY_CAP;

  const lines = useMemo(() => {
    const rows: { offset: number; chars: string[] }[] = [];
    for (let i = 0; i < displayDigits.length; i += CHUNK_SIZE) {
      rows.push({
        offset: i,
        chars: displayDigits.slice(i, i + CHUNK_SIZE).split(''),
      });
    }
    return rows;
  }, [displayDigits]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 justify-between border-b border-border bg-[#fffff0] px-2 py-0.5 text-[10px]">
        <span className="text-[#000080]">
          {t('analysis.highlight.title', { count: highlightIndices.size })}
        </span>
        {digits.length > MASTER_VALUE_DISPLAY_CAP ? (
          <button type="button" className="win-link-popup" onClick={() => setShowFull((v) => !v)}>
            {showFull ? t('analysis.highlight.showTruncated') : t('analysis.highlight.showFull')}
          </button>
        ) : null}
      </div>
      <div className="win-textarea-master min-h-0 flex-1 overflow-auto bg-white p-1 font-mono text-[11px] leading-relaxed text-black">
        {lines.map((line) => (
          <div key={line.offset} className="whitespace-pre">
            {line.chars.map((ch, i) => {
              const idx = line.offset + i;
              return (
                <span
                  key={idx}
                  className={
                    highlightIndices.has(idx)
                      ? 'bg-[#ffff00] font-semibold text-black'
                      : 'text-black'
                  }
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
        {truncated ? (
          <div className="mt-1 text-[10px] text-content-muted">
            {t('analysis.highlight.totalChars', { count: digits.length.toLocaleString() })}
          </div>
        ) : null}
      </div>
    </div>
  );
});

interface MasterValuePanelProps {
  digits: string;
  highlightIndices: ReadonlySet<number>;
}

export const MasterValuePanel = memo(function MasterValuePanel({
  digits,
  highlightIndices,
}: MasterValuePanelProps) {
  const { t } = useI18n();
  const [showFull, setShowFull] = useState(false);
  const hasHighlight = highlightIndices.size > 0;

  const plainText = useMemo(() => {
    const source =
      showFull || digits.length <= MASTER_VALUE_DISPLAY_CAP
        ? digits
        : digits.slice(0, MASTER_VALUE_DISPLAY_CAP);
    const lines: string[] = [];
    for (let i = 0; i < source.length; i += CHUNK_SIZE) {
      lines.push(source.slice(i, i + CHUNK_SIZE));
    }
    const truncated = !showFull && digits.length > MASTER_VALUE_DISPLAY_CAP;
    const text = lines.join('\n');
    return truncated
      ? `${text}\n${t('analysis.highlight.totalCharsHint', { count: digits.length.toLocaleString() })}`
      : text;
  }, [digits, showFull, t]);

  const showExpand = digits.length > MASTER_VALUE_DISPLAY_CAP;

  if (hasHighlight) {
    return <HighlightedMasterValue digits={digits} highlightIndices={highlightIndices} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showExpand ? (
        <div className="flex shrink-0 justify-end border-b border-border bg-[#fffff0] px-2 py-0.5">
          <button
            type="button"
            className="win-link-popup text-[10px]"
            onClick={() => setShowFull((v) => !v)}
          >
            {showFull ? t('analysis.highlight.showTruncated') : t('analysis.highlight.showFull')}
          </button>
        </div>
      ) : null}
      <textarea
        readOnly
        className="win-textarea-master min-h-0 flex-1 resize-none border-0 text-[11px]"
        value={plainText}
        spellCheck={false}
      />
    </div>
  );
});
