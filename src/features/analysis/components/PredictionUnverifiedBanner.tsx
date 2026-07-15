import { UnverifiedAlgorithmBanner } from '@/components/ui/UnverifiedAlgorithmBanner';
import { useI18n } from '@/i18n/use-i18n';
import {
  getAlgorithmVerificationStatus,
  shouldShowLegacyUnverifiedUi,
} from '@/shared/utils/algorithmVerificationStatus';

interface PredictionUnverifiedBannerProps {
  className?: string;
}

export function PredictionUnverifiedBanner({ className = '' }: PredictionUnverifiedBannerProps) {
  const { t } = useI18n();
  const status = getAlgorithmVerificationStatus();

  if (!shouldShowLegacyUnverifiedUi() || status.prediction === 'verified') {
    return null;
  }

  return (
    <UnverifiedAlgorithmBanner
      className={className}
      title={t('algorithm.prediction.bannerTitle')}
      message={t('algorithm.prediction.bannerMessage')}
      detail={status.predictionDetail}
      variant={status.prediction === 'partial' ? 'warning' : 'info'}
    />
  );
}
