import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { useCrudKeyboardShortcuts } from '@/hooks';
import { useI18n } from '@/i18n/use-i18n';
import { useCodeValueController } from './hooks/use-code-value-controller';
import { CodeValueGrid } from './components/CodeValueGrid';
import { CodeValueEditor } from './components/CodeValueEditor';
import { CodeValueToolbar } from './components/CodeValueToolbar';
import { CodeValueStatusBar } from './components/CodeValueStatusBar';

export function CodeValueManagementFeature() {
  const { t } = useI18n();
  const controller = useCodeValueController();

  useCrudKeyboardShortcuts({
    onNew: controller.handleNew,
    onSave: controller.handleSave,
    onDelete: controller.handleDelete,
    canNew: !controller.isSaving,
    canSave: controller.isDirty && !controller.isSaving,
    canDelete: Boolean(controller.formValues.id) && !controller.isSaving,
  });

  return (
    <div className="win-window flex h-full flex-col bg-[#808080]">
      <div className="win-titlebar">{t('codeValue.manage.title')}</div>

      <CodeValueToolbar controller={controller} />

      <ResizableSplitter
        storageKey="code-value-mgmt-width"
        defaultLeftWidth={420}
        minLeftWidth={300}
        minRightWidth={360}
        left={<CodeValueGrid />}
        right={<CodeValueEditor controller={controller} />}
      />

      <CodeValueStatusBar />
    </div>
  );
}
