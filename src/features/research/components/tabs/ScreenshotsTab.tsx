import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { useResearchStore } from '../../stores/research-store';

export function ScreenshotsTab() {
  const { t } = useI18n();
  const selected = useResearchStore((s) => s.selectedExperiment);
  const screenshots = useResearchStore((s) => s.screenshots);
  const loadScreenshots = useResearchStore((s) => s.loadScreenshots);
  const uploadScreenshot = useResearchStore((s) => s.uploadScreenshot);
  const deleteScreenshot = useResearchStore((s) => s.deleteScreenshot);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<Record<number, string>>({});

  useEffect(() => {
    if (selected?.id) void loadScreenshots();
  }, [selected?.id, loadScreenshots]);

  useEffect(() => {
    const load = async () => {
      const map: Record<number, string> = {};
      for (const s of screenshots) {
        const base64 = await window.electronAPI.getScreenshotImage(s.filePath);
        if (base64) map[s.id] = `data:image/png;base64,${base64}`;
      }
      setPreview(map);
    };
    void load();
  }, [screenshots]);

  if (!selected) {
    return (
      <div className="p-4 text-sm text-content-muted">{t('research.common.selectExperiment')}</div>
    );
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadScreenshot(file, caption || undefined);
    e.target.value = '';
    setCaption('');
  };

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-4 flex items-end gap-2">
        <label className="text-xs">
          {t('research.screenshots.caption')}
          <input
            className="win-input mt-1 block w-48"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <label className="win-button cursor-pointer text-xs">
          {t('research.screenshots.upload')}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {screenshots.map((s) => (
          <div key={s.id} className="rounded border border-border p-2">
            {preview[s.id] ? (
              <img
                src={preview[s.id]}
                alt={s.filename}
                className="mb-2 max-h-48 w-full object-contain"
              />
            ) : (
              <div className="mb-2 flex h-32 items-center justify-center bg-surface-muted text-xs text-content-muted">
                {t('research.screenshots.loading')}
              </div>
            )}
            <div className="text-xs font-medium">{s.filename}</div>
            {s.caption && <div className="text-xs text-content-muted">{s.caption}</div>}
            <button
              type="button"
              className="win-button mt-2 text-xs"
              onClick={() => void deleteScreenshot(s.id)}
            >
              {t('research.common.delete')}
            </button>
          </div>
        ))}
      </div>
      {screenshots.length === 0 && (
        <p className="text-sm text-content-muted">{t('research.screenshots.empty')}</p>
      )}
    </div>
  );
}
