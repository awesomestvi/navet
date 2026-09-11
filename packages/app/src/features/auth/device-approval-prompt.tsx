import {
  approveDeviceAuthorization,
  type DeviceAuthorizationPreview,
  declineDeviceAuthorization,
  previewDeviceAuthorization,
} from '@navet/app/auth/device-authorization';
import { Button, ModalSurface } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/i18n';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentDevicePairingPreferences } from './device-pairing-preferences';

function removeDeviceCodeFromAddress() {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  fragment.delete('navet_device_code');
  url.hash = fragment.toString();
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function DeviceApprovalPrompt() {
  const { t } = useI18n();
  const [code, setCode] = useState(
    () =>
      new URLSearchParams(window.location.hash.replace(/^#/, ''))
        .get('navet_device_code')
        ?.trim() ?? ''
  );
  const [state, setState] = useState<'review' | 'approving' | 'approved'>('review');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DeviceAuthorizationPreview | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void previewDeviceAuthorization(code)
      .then((value) => {
        if (!cancelled) setPreview(value);
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('login.errors.unexpected'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  if (!code) {
    return null;
  }

  const close = () => {
    removeDeviceCodeFromAddress();
    setCode('');
  };

  const approve = async () => {
    setState('approving');
    setError(null);
    try {
      await approveDeviceAuthorization(code, getCurrentDevicePairingPreferences());
      setState('approved');
      removeDeviceCodeFromAddress();
    } catch {
      setState('review');
      setError(t('login.errors.unexpected'));
    }
  };

  const decline = async () => {
    setState('approving');
    setError(null);
    try {
      await declineDeviceAuthorization(code);
      close();
    } catch {
      setState('review');
      setError(t('login.errors.unexpected'));
    }
  };

  return (
    <ModalSurface
      isOpen
      onOpenChange={(open) => {
        if (!open && state !== 'approving') close();
      }}
      title={
        state === 'approved'
          ? t('deviceAuthorization.approval.deviceApproved')
          : t('deviceAuthorization.approval.title')
      }
      description={
        state === 'approved'
          ? t('deviceAuthorization.approval.approvedDescription')
          : t('deviceAuthorization.approval.description')
      }
      bodyClassName="space-y-5 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-500">
          {state === 'approved' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{t('deviceAuthorization.approval.matchingCode')}</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.14em]">
            {code.toUpperCase()}
          </p>
          {state !== 'approved' ? (
            <div className="mt-3 space-y-1 text-sm leading-6 opacity-70">
              <p>
                {t('deviceAuthorization.approval.requestingDevice', {
                  device: preview?.deviceName ?? t('common.loading'),
                })}
              </p>
              <p>
                {t('deviceAuthorization.approval.connections', {
                  providers: preview ? preview.providers.join(', ') : t('common.loading'),
                })}
              </p>
              <p>{t('deviceAuthorization.approval.revocableSession')}</p>
            </div>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="text-sm leading-6 text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={state === 'approved' ? close : () => void decline()}
          disabled={state === 'approving'}
        >
          {state === 'approved' ? t('common.done') : t('common.cancel')}
        </Button>
        {state !== 'approved' ? (
          <Button type="button" onClick={() => void approve()} disabled={state === 'approving'}>
            {state === 'approving'
              ? t('deviceAuthorization.approval.approving')
              : t('deviceAuthorization.approval.approveDevice')}
          </Button>
        ) : null}
      </div>
    </ModalSurface>
  );
}
