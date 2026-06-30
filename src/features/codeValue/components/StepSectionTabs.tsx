import { useMemo } from 'react';
import { SortableTabBar } from '@/components/layout/SortableTabBar';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import { type CodeValueStepId, useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';

const CODE_VALUE_STEP_LABEL_KEYS: Record<CodeValueStepId, MessageKey> = {
  '1': 'analysis.step.step1',
  '2': 'analysis.step.step2',
  '3': 'analysis.step.step3',
};

export function StepSectionTabs() {
  const { t } = useI18n();
  const stepOrder = useWorkspaceLayoutStore((s) => s.codeValueStepOrder);
  const activeStep = useWorkspaceLayoutStore((s) => s.codeValueActiveStep);
  const setStepOrder = useWorkspaceLayoutStore((s) => s.setCodeValueStepOrder);
  const setActiveStep = useWorkspaceLayoutStore((s) => s.setCodeValueActiveStep);

  const tabItems = useMemo(
    () =>
      stepOrder.map((id) => ({
        id,
        label: t(CODE_VALUE_STEP_LABEL_KEYS[id]),
      })),
    [stepOrder, t],
  );

  return (
    <SortableTabBar
      items={tabItems}
      activeId={activeStep}
      onReorder={(ids) => setStepOrder(ids as CodeValueStepId[])}
      onSelect={(id) => setActiveStep(id as CodeValueStepId)}
    />
  );
}
