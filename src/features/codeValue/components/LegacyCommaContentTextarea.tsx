import { memo } from 'react';

interface LegacyCommaContentTextareaProps {
  value: string;
  className?: string;
}

/** DetailGrid / Duplicat — 쉼표 유지, CSS로 칸 너비 끝까지 채운 뒤 줄바꿈 */
export const LegacyCommaContentTextarea = memo(function LegacyCommaContentTextarea({
  value,
  className = '',
}: LegacyCommaContentTextareaProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="win-legacy-comma-content" role="textbox" aria-readonly>
        {value}
      </div>
    </div>
  );
});
