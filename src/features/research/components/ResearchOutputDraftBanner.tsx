import { UnverifiedAlgorithmBanner } from '@/components/ui/UnverifiedAlgorithmBanner';
import { useI18n } from '@/i18n/use-i18n';
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
      detail={t('research.outputPolicy.bannerDetail')}
      variant="info"
    />
  );
}
