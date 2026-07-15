import { memo, useMemo, useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useObservedWidth } from '@/shared/hooks/useObservedWidth';
import {
  buildDigitDisplayLines,
  DIGIT_DISPLAY_FONT_PX,
} from '@/shared/utils/digitDisplayLayout';
import { MASTER_VALUE_DISPLAY_CAP } from '../utils/analysis-display';

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
  const { ref: containerRef, width } = useObservedWidth<HTMLDivElement>();

  const displayDigits = useMemo(() => {
    if (showFull || digits.length <= MASTER_VALUE_DISPLAY_CAP) return digits;
    return digits.slice(0, MASTER_VALUE_DISPLAY_CAP);
  }, [digits, showFull]);

  const truncated = !showFull && digits.length > MASTER_VALUE_DISPLAY_CAP;

  const lines = useMemo(
    () => buildDigitDisplayLines(displayDigits, width, DIGIT_DISPLAY_FONT_PX),
    [displayDigits, width],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 justify-between border-b border-border bg-[#fffff0] px-2 py-0.5 text-xs">
        <span className="text-[#000080]">
          {t('analysis.highlight.title', { count: highlightIndices.size })}
        </span>
        {digits.length > MASTER_VALUE_DISPLAY_CAP ? (
          <button type="button" className="win-link-popup" onClick={() => setShowFull((v) => !v)}>
            {showFull ? t('analysis.highlight.showTruncated') : t('analysis.highlight.showFull')}
          </button>
        ) : null}
      </div>
      <div
        ref={containerRef}
        className="win-textarea-master win-textarea-master-readable min-h-0 flex-1 overflow-auto bg-white text-black"
      >
        {lines.map((line) => (
          <div key={line.startIndex} className="whitespace-pre">
            {line.text.split('').map((ch, i) => {
              const idx = line.startIndex + i;
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
          <div className="mt-1 text-sm text-content-muted">
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

  const displayDigits = useMemo(() => {
    if (showFull || digits.length <= MASTER_VALUE_DISPLAY_CAP) return digits;
    return digits.slice(0, MASTER_VALUE_DISPLAY_CAP);
  }, [digits, showFull]);

  const showExpand = digits.length > MASTER_VALUE_DISPLAY_CAP;
  const truncated = !showFull && digits.length > MASTER_VALUE_DISPLAY_CAP;

  if (hasHighlight) {
    return <HighlightedMasterValue digits={digits} highlightIndices={highlightIndices} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showExpand ? (
        <div className="flex shrink-0 justify-end border-b border-border bg-[#fffff0] px-2 py-0.5">
          <button type="button" className="win-link-popup text-xs" onClick={() => setShowFull((v) => !v)}>
            {showFull ? t('analysis.highlight.showTruncated') : t('analysis.highlight.showFull')}
          </button>
        </div>
      ) : null}
      <MasterValueTextarea readOnly value={displayDigits} />
      {truncated ? (
        <div className="shrink-0 px-2 py-0.5 text-sm text-content-muted">
          {t('analysis.highlight.totalCharsHint', { count: digits.length.toLocaleString() })}
        </div>
      ) : null}
    </div>
  );
});
