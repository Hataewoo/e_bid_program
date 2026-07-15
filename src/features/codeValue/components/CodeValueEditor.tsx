import { Controller } from 'react-hook-form';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useI18n } from '@/i18n/use-i18n';
import type { CodeValueController } from '../hooks/use-code-value-controller';

interface CodeValueEditorProps {
  controller: CodeValueController;
}

export function CodeValueEditor({ controller }: CodeValueEditorProps) {
  const { t } = useI18n();
  const { form, updateForm } = controller;

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('codeValue.mgmt.editorTitle')}</div>

      <div className="flex flex-1 flex-col gap-3 overflow-auto p-3">
        <div>
          <label htmlFor="cv-code" className="win-label mb-1 block">
            Code
          </label>
          <Controller
            name="code"
            control={form.control}
            render={({ field }) => (
              <input
                {...field}
                id="cv-code"
                type="text"
                className="win-input w-full font-mono"
                onChange={(e) => {
                  field.onChange(e);
                  updateForm({ code: e.target.value });
                }}
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="cv-value" className="win-label mb-1 block">
            Value
          </label>
          <Controller
            name="value"
            control={form.control}
            render={({ field }) => (
              <MasterValueTextarea
                id="cv-value"
                className="min-h-[100px]"
                value={field.value ?? ''}
                normalizeValue={(raw) => raw.replace(/\s/g, '')}
                onChange={(normalized) => {
                  field.onChange(normalized);
                  updateForm({ value: normalized });
                }}
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="cv-description" className="win-label mb-1 block">
            Description
          </label>
          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <input
                {...field}
                id="cv-description"
                type="text"
                className="win-input w-full"
                onChange={(e) => {
                  field.onChange(e);
                  updateForm({ description: e.target.value });
                }}
              />
            )}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <label htmlFor="cv-memo" className="win-label mb-1 block">
            Memo
          </label>
          <Controller
            name="memo"
            control={form.control}
            render={({ field }) => (
              <textarea
                {...field}
                id="cv-memo"
                className="win-textarea-master min-h-[120px] flex-1"
                onChange={(e) => {
                  field.onChange(e);
                  updateForm({ memo: e.target.value });
                }}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
