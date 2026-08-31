import qwenLogo from '@navet/app/assets/models/qwen.svg';
import { Badge, Button, InteractivePill, MessageBar, Tag } from '@navet/app/components/primitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import { ModelDownloadProgress } from '@navet/app/features/navet-ai/components/model-download-progress';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { useI18n } from '@navet/app/hooks';
import { AudioLines, Brain, CameraOff, FileText, KeyRound, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

export function SettingsNavetAiSection({ controller }: { controller: SettingsSectionController }) {
  const { t, formatNumber } = useI18n();
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [removeModelConfirmationOpen, setRemoveModelConfirmationOpen] = useState(false);
  const {
    state,
    loading,
    error,
    initialize,
    consentToModelDownload,
    cancelModelDownload,
    deleteModel,
    reset,
  } = useNavetAiStore(
    useShallow((store) => ({
      state: store.state,
      loading: store.loading,
      error: store.error,
      initialize: store.initialize,
      consentToModelDownload: store.consentToModelDownload,
      cancelModelDownload: store.cancelModelDownload,
      deleteModel: store.deleteModel,
      reset: store.reset,
    }))
  );
  useEffect(() => {
    if (!state && !loading) void initialize();
  }, [initialize, loading, state]);
  const model = state?.capabilities.model;
  const modelIdentity =
    model?.selectedId === 'qwen3.5-2b'
      ? { family: 'Qwen 3.5', variant: '2B · Q4_K_M' }
      : { family: 'Qwen 3.5', variant: '0.8B · Q4_0' };
  const modelSize = model?.downloadBytes
    ? `${formatNumber(model.downloadBytes / 1024 ** 3, { maximumFractionDigits: 1 })} GB`
    : '—';
  return (
    <SettingsSectionShell
      id="navet-ai"
      icon={Brain}
      title={t('sidebar.ai')}
      description={t('navetAi.settings.description')}
      styles={controller.styles}
    >
      {error ? (
        <MessageBar tone="warning" title={t('navetAi.settings.unavailable')}>
          {error}
        </MessageBar>
      ) : null}
      <SettingsItem
        title={t('navetAi.settings.model')}
        description={t('navetAi.settings.modelHelp')}
        styles={controller.styles}
      >
        {model ? (
          <div
            className={`grid gap-4 rounded-[18px] border p-4 ${controller.styles.insetBorderColor} ${controller.styles.softBg}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-black p-2.5"
              >
                <img
                  src={qwenLogo}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-base font-semibold ${controller.styles.textColor}`}>
                  {modelIdentity.family}
                </p>
                <p className={`mt-0.5 text-sm ${controller.styles.subtleColor}`}>
                  {modelIdentity.variant}
                </p>
              </div>
              <Badge
                tone={
                  model.status === 'ready'
                    ? 'success'
                    : model.status === 'error'
                      ? 'danger'
                      : model.status === 'downloading'
                        ? 'accent'
                        : 'neutral'
                }
              >
                {t(`navetAi.model.${model.status}`)}
              </Badge>
            </div>

            <dl
              className={`grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3 ${controller.styles.dividerBorderColor}`}
            >
              {[
                [t('navetAi.settings.modelSize'), modelSize],
                [t('navetAi.settings.modelLicense'), 'Apache-2.0'],
                [t('navetAi.settings.modelStorage'), t('navetAi.settings.installedHere')],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={`text-xs ${controller.styles.subtleColor}`}>{label}</dt>
                  <dd
                    className={`mt-1 truncate text-sm font-medium ${controller.styles.textColor}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {model.status === 'downloading' ? (
              <ModelDownloadProgress
                downloadedBytes={model.downloadedBytes}
                totalBytes={model.downloadBytes}
                disabled={loading}
                onCancel={() => void cancelModelDownload()}
              />
            ) : null}
            {['not_downloaded', 'error'].includes(model.status) ? (
              <div>
                <InteractivePill
                  active
                  intent="action"
                  size="small"
                  disabled={loading}
                  onClick={() => void consentToModelDownload()}
                >
                  {model.status === 'error'
                    ? t('navetAi.settings.retry')
                    : t('navetAi.settings.download')}
                </InteractivePill>
              </div>
            ) : null}
            {model.status === 'ready' ? (
              <AlertDialog
                open={removeModelConfirmationOpen}
                onOpenChange={setRemoveModelConfirmationOpen}
              >
                <div>
                  <Button
                    variant="destructive"
                    size="small"
                    disabled={loading}
                    leading={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setRemoveModelConfirmationOpen(true)}
                  >
                    {t('navetAi.settings.removeModel')}
                  </Button>
                </div>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('navetAi.settings.removeModelConfirmTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('navetAi.settings.removeModelConfirmDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        void deleteModel();
                        setRemoveModelConfirmationOpen(false);
                      }}
                    >
                      {t('navetAi.settings.removeModelAction')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        ) : (
          <p className={`text-sm ${controller.styles.subtleColor}`}>
            {t('navetAi.settings.checking')}
          </p>
        )}
      </SettingsItem>
      <SettingsItem
        title={t('navetAi.settings.retentionTitle')}
        description={t('navetAi.settings.retentionHelp')}
        styles={controller.styles}
      >
        <div className="grid max-w-lg grid-cols-2 gap-2">
          <div
            className={`rounded-[16px] border p-3 ${controller.styles.insetBorderColor} ${controller.styles.softBg}`}
          >
            <p className={`text-lg font-semibold tabular-nums ${controller.styles.textColor}`}>
              30 <span className="text-sm font-medium">{t('navetAi.settings.days')}</span>
            </p>
            <p className={`mt-1 text-xs ${controller.styles.subtleColor}`}>
              {t('navetAi.settings.rawObservations')}
            </p>
          </div>
          <div
            className={`rounded-[16px] border p-3 ${controller.styles.insetBorderColor} ${controller.styles.softBg}`}
          >
            <p className={`text-lg font-semibold tabular-nums ${controller.styles.textColor}`}>
              12 <span className="text-sm font-medium">{t('navetAi.settings.months')}</span>
            </p>
            <p className={`mt-1 text-xs ${controller.styles.subtleColor}`}>
              {t('navetAi.settings.aggregatedPatterns')}
            </p>
          </div>
        </div>
      </SettingsItem>
      <SettingsItem
        title={t('navetAi.settings.privateTitle')}
        description={t('navetAi.settings.privateHelp')}
        styles={controller.styles}
      >
        <div className="flex max-w-lg flex-wrap gap-2">
          <Tag tone="neutral" size="small" className="gap-1.5">
            <CameraOff className="h-3.5 w-3.5" aria-hidden="true" />
            {t('navetAi.settings.cameras')}
          </Tag>
          <Tag tone="neutral" size="small" className="gap-1.5">
            <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
            {t('navetAi.settings.audio')}
          </Tag>
          <Tag tone="neutral" size="small" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            {t('navetAi.settings.credentials')}
          </Tag>
          <Tag tone="neutral" size="small" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {t('navetAi.settings.privateText')}
          </Tag>
        </div>
      </SettingsItem>
      <SettingsItem
        title={t('navetAi.settings.resetTitle')}
        description={t('navetAi.settings.resetDescription')}
        styles={controller.styles}
      >
        <AlertDialog open={resetConfirmationOpen} onOpenChange={setResetConfirmationOpen}>
          <Button
            variant="destructive"
            size="small"
            disabled={loading}
            onClick={() => setResetConfirmationOpen(true)}
          >
            {t('common.reset')}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('navetAi.settings.resetConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('navetAi.settings.resetConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void reset();
                  setResetConfirmationOpen(false);
                }}
              >
                {t('navetAi.settings.resetAction')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
