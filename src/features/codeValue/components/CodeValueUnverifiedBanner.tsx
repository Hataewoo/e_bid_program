import { UnverifiedAlgorithmBanner } from '@/components/ui/UnverifiedAlgorithmBanner';
import { useI18n } from '@/i18n/use-i18n';
import { getAlgorithmVerificationStatus } from '@/shared/utils/algorithmVerificationStatus';

interface CodeValueUnverifiedBannerProps {
  className?: string;
}

export function CodeValueUnverifiedBanner({ className = '' }: CodeValueUnverifiedBannerProps) {
  const { t } = useI18n();
  const status = getAlgorithmVerificationStatus();

  if (status.codeValue === 'verified') {
    return null;
  }

  return (
    <UnverifiedAlgorithmBanner
      className={className}
      title={t('algorithm.codeValue.bannerTitle')}
      message={t('algorithm.codeValue.bannerMessage')}
      detail={status.codeValueDetail}
      variant={status.codeValue === 'partial' ? 'warning' : 'info'}
    />
  );
}
