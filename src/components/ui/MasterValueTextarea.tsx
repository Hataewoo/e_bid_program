import { useCallback, useEffect, useState } from 'react';
import { normalizeMasterValue } from '@/features/master/services/validation-service';
import { useObservedWidth } from '@/shared/hooks/useObservedWidth';
import {
  DIGIT_DISPLAY_FONT_PX,
  formatDigitsForDisplay,
} from '@/shared/utils/digitDisplayLayout';

interface MasterValueTextareaProps {
  id?: string;
  value: string;
  onChange?: (normalized: string) => void;
  onEnterPress?: () => void;
  normalizeValue?: (raw: string) => string;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  spellCheck?: boolean;
}

export function MasterValueTextarea({
  id,
  value,
  onChange,
  onEnterPress,
  readOnly = false,
  className = '',
  placeholder,
  spellCheck = false,
  normalizeValue = normalizeMasterValue,
}: MasterValueTextareaProps) {
  const { ref: textareaRef, width } = useObservedWidth<HTMLTextAreaElement>();
  const [displayText, setDisplayText] = useState('');

  const applyFormat = useCallback(
    (raw: string, w: number) => {
      const normalized = normalizeValue(raw);
      setDisplayText(formatDigitsForDisplay(normalized, w, DIGIT_DISPLAY_FONT_PX));
    },
    [normalizeValue],
  );

  useEffect(() => {
    applyFormat(value, width);
  }, [value, width, applyFormat]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const normalized = normalizeValue(e.target.value);
    onChange?.(normalized);
    setDisplayText(formatDigitsForDisplay(normalized, width, DIGIT_DISPLAY_FONT_PX));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || !onEnterPress) return;
    if (e.key !== 'Enter' && e.code !== 'Enter') return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();

    const normalized = normalizeValue(e.currentTarget.value);
    if (normalized !== value) {
      onChange?.(normalized);
    }
    onEnterPress();
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <textarea
        ref={textareaRef}
        id={id}
        readOnly={readOnly}
        spellCheck={spellCheck}
        placeholder={placeholder}
        className="win-textarea-master win-textarea-master-readable min-h-0 w-full flex-1"
        value={displayText}
        onChange={readOnly ? undefined : handleChange}
        onKeyDown={readOnly ? undefined : handleKeyDown}
      />
    </div>
  );
}
