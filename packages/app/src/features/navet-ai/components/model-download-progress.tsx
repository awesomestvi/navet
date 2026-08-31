import { InteractivePill } from '@navet/app/components/primitives';
import { useI18n, useThemeMode } from '@navet/app/hooks';

interface ModelDownloadProgressProps {
  downloadedBytes?: number;
  totalBytes?: number;
  disabled?: boolean;
  onCancel: () => void;
}

export function ModelDownloadProgress({
  downloadedBytes = 0,
  totalBytes = 0,
  disabled = false,
  onCancel,
}: ModelDownloadProgressProps) {
  const { t, formatNumber } = useI18n();
  const theme = useThemeMode();
  const boundedBytes = Math.max(0, Math.min(downloadedBytes, totalBytes));
  const progress =
    totalBytes > 0 ? Math.min(100, Math.round((boundedBytes / totalBytes) * 100)) : 0;
  const downloadedMb = Math.round(boundedBytes / 1024 ** 2);
  const totalMb = Math.ceil(totalBytes / 1024 ** 2);
  const progressText = t('navetAi.settings.downloadProgress', {
    percent: formatNumber(progress),
    downloaded: formatNumber(downloadedMb),
    total: formatNumber(totalMb),
  });

  return (
    <div className="grid min-w-0 gap-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span>{t('navetAi.model.downloading')}</span>
        <span className="tabular-nums text-current/70">{progressText}</span>
      </div>
      <div
        role="progressbar"
        aria-label={t('navetAi.settings.downloadProgressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={progressText}
        className={`h-1.5 overflow-hidden rounded-full ${
          theme === 'light' ? 'bg-slate-200' : 'bg-white/10'
        }`}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%`, backgroundColor: 'var(--navet-accent)' }}
        />
      </div>
      <div>
        <InteractivePill intent="action" size="small" disabled={disabled} onClick={onCancel}>
          {t('navetAi.settings.cancelDownload')}
        </InteractivePill>
      </div>
    </div>
  );
}
