import { useEffect, useState } from 'react';
import { electronService } from '@/services';
import { useAppStore } from '@/app/stores';
import { useI18n } from '@/i18n/use-i18n';

interface ProgramInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProgramInfoModal({ open, onClose }: ProgramInfoModalProps) {
  const { t } = useI18n();
  const version = useAppStore((s) => s.version);
  const dbStatus = useAppStore((s) => s.dbStatus);
  const [runtimeMode, setRuntimeMode] = useState<string>('-');
  const [logPath, setLogPath] = useState<string>('-');

  useEffect(() => {
    if (!open) return;
    void electronService.getRuntimeInfo().then((info) => {
      if (info) {
        setRuntimeMode(info.dbMode);
        setLogPath(info.logPath ?? '-');
      }
    });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="win-dialog-window w-full max-w-md">
        <div className="win-titlebar flex items-center justify-between">
          <span>{t('programInfo.title')}</span>
          <button type="button" className="win-button text-xs" onClick={onClose}>
            {t('programInfo.close')}
          </button>
        </div>
        <dl className="space-y-3 p-4 text-sm text-black">
          <div>
            <dt className="text-xs text-content-muted">{t('programInfo.version')}</dt>
            <dd className="font-medium">v{version}</dd>
          </div>
          <div>
            <dt className="text-xs text-content-muted">{t('programInfo.dbPath')}</dt>
            <dd className="break-all font-mono text-xs">{dbStatus?.path || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-content-muted">{t('programInfo.mode')}</dt>
            <dd>{runtimeMode}</dd>
          </div>
          <div>
            <dt className="text-xs text-content-muted">{t('programInfo.logPath')}</dt>
            <dd className="break-all font-mono text-xs">{logPath}</dd>
          </div>
          <div>
            <dt className="text-xs text-content-muted">{t('programInfo.db')}</dt>
            <dd>
              {dbStatus?.connected ? t('toolbar.db.connected') : t('toolbar.db.disconnected')}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
