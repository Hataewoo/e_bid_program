type BannerVariant = 'info' | 'warning';

interface UnverifiedAlgorithmBannerProps {
  title: string;
  message: string;
  detail?: string;
  variant?: BannerVariant;
  className?: string;
}

const VARIANT_CLASS: Record<BannerVariant, string> = {
  info: 'border-[#b8860b] bg-[#fff8e6] text-[#663c00]',
  warning: 'border-[#c0392b] bg-[#fff0f0] text-[#7a1f1f]',
};

export function UnverifiedAlgorithmBanner({
  title,
  message,
  detail,
  variant = 'info',
  className = '',
}: UnverifiedAlgorithmBannerProps) {
  return (
    <div
      className={`rounded border px-3 py-2 text-xs leading-relaxed ${VARIANT_CLASS[variant]} ${className}`}
      role="note"
    >
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5">{message}</div>
      {detail ? <div className="mt-1 opacity-80">{detail}</div> : null}
    </div>
  );
}
