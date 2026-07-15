import { UnverifiedAlgorithmBanner } from '@/components/ui/UnverifiedAlgorithmBanner';
import { useI18n } from '@/i18n/use-i18n';
import { shouldShowLegacyUnverifiedUi } from '@/shared/utils/algorithmVerificationStatus';
import { RESEARCH_OUTPUT_FILL_POLICY } from '../constants/outputFillPolicy';

interface ResearchOutputDraftBannerProps {
  className?: string;
}

export function ResearchOutputDraftBanner({ className = '' }: ResearchOutputDraftBannerProps) {
  const { t } = useI18n();

  if (RESEARCH_OUTPUT_FILL_POLICY !== 'draft-proposal') {
    return null;
  }

  return (
    <UnverifiedAlgorithmBanner
      className={className}
      title={t('research.outputPolicy.bannerTitle')}
      message={t('research.outputPolicy.bannerMessage')}
      detail={shouldShowLegacyUnverifiedUi() ? t('research.outputPolicy.bannerDetail') : undefined}
      variant="info"
    />
  );
}
