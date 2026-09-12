import {
  createDeviceAuthorizationRequest,
  type DeviceAuthorizationRequest,
  loadDeviceAuthorizationState,
  redeemDeviceAuthorization,
} from '@navet/app/auth/device-authorization';
import { Button } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/i18n';
import { Check, CircleAlert, Copy, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { applyDevicePairingPreferences } from './device-pairing-preferences';

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Plain HTTP installations can reject the Clipboard API; use the browser fallback below.
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.readOnly = true;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) {
    throw new Error('Copy is unavailable');
  }
}

function reloadConnectedDevice() {
  window.location.reload();
}

export function DeviceConnectionPanel({
  onConnected = reloadConnectedDevice,
  onSignIn,
}: {
  onConnected?: () => void;
  onSignIn: () => void;
}) {
  const { t } = useI18n();
  const translateRef = useRef(t);
  translateRef.current = t;
  const [request, setRequest] = useState<DeviceAuthorizationRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'creating' | 'pending' | 'approved' | 'declined' | 'expired'>(
    'creating'
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  const start = () => {
    setState('creating');
    setError(null);
    setCopied(false);
    void createDeviceAuthorizationRequest(
      t('deviceAuthorization.defaultDeviceName', {
        device: navigator.platform || t('deviceAuthorization.unknownDevice'),
      })
    )
      .then((created) => {
        setRequest(created);
        setState('pending');
      })
      .catch(() => {
        setError(t('login.errors.unexpected'));
      });
  };

  useEffect(start, []);

  useEffect(() => {
    if (!request) {
      return;
    }
    let cancelled = false;
    let interval: number | undefined;
    const stopPolling = () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
    const check = async () => {
      try {
        const status = await loadDeviceAuthorizationState(request);
        if (cancelled) return;
        if (status.state === 'approved') {
          stopPolling();
          setState('approved');
          const redemption = await redeemDeviceAuthorization(request);
          applyDevicePairingPreferences(redemption.preferences);
          if (!cancelled) onConnected();
        } else if (status.state === 'expired') {
          stopPolling();
          setState('expired');
        } else if (status.state === 'declined') {
          stopPolling();
          setState('declined');
        }
      } catch {
        if (!cancelled) {
          setError(translateRef.current('login.errors.unexpected'));
        }
      }
    };
    interval = window.setInterval(() => void check(), 2_000);
    void check();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [onConnected, request]);

  useEffect(() => {
    if (!request || state !== 'pending') return;
    const update = () =>
      setRemainingSeconds(Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [request, state]);

  const copyCode = async () => {
    if (!request) return;
    try {
      await copyText(request.code.toUpperCase());
      setCopied(true);
    } catch {
      toast.error(t('deviceAuthorization.copyFailed'), {
        description: t('deviceAuthorization.copyFailedDescription'),
      });
    }
  };

  if (state === 'creating' && !error) {
    return (
      <div className="flex min-h-56 items-center justify-center gap-3" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-orange-300" />
        <span className="text-sm text-white/68">
          {t('deviceAuthorization.preparingConnection')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      {request && state !== 'expired' && state !== 'declined' ? (
        <>
          <div>
            <p className="text-sm text-white/68">{t('deviceAuthorization.enterCode')}</p>
            <button
              type="button"
              onClick={() => void copyCode()}
              aria-label={t('deviceAuthorization.copyCodeLabel')}
              className="group mx-auto mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-3 font-mono text-xl font-semibold tracking-[0.16em] text-white transition-colors hover:border-white/10 hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
            >
              <span>{request.code.toUpperCase()}</span>
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              ) : (
                <Copy
                  className="h-4 w-4 shrink-0 text-white/50 transition-colors group-hover:text-white/80"
                  aria-hidden="true"
                />
              )}
            </button>
            <p
              className={`mt-2 text-xs ${copied ? 'text-emerald-300' : 'text-white/50'}`}
              aria-live="polite"
            >
              {copied ? t('deviceAuthorization.copied') : t('deviceAuthorization.clickToCopy')}
            </p>
          </div>
          <div
            className="flex items-center justify-center gap-2 text-sm text-white/68"
            role="status"
          >
            {state === 'approved' ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
            ) : (
              <Smartphone className="h-4 w-4 text-orange-300" />
            )}
            {state === 'approved'
              ? t('deviceAuthorization.connectingDevice')
              : t('deviceAuthorization.waitingForApproval', {
                  time: `${Math.floor(remainingSeconds / 60)}:${String(
                    remainingSeconds % 60
                  ).padStart(2, '0')}`,
                })}
          </div>
        </>
      ) : null}

      {error ? (
        <div
          className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-left text-sm text-red-100"
          role="alert"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <span>{error}</span>
        </div>
      ) : null}

      {state === 'declined' ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4" role="status">
          <p className="font-medium text-white">{t('deviceAuthorization.requestDeclined')}</p>
          <p className="mt-1 text-sm leading-6 text-white/68">
            {t('deviceAuthorization.requestDeclinedDescription')}
          </p>
        </div>
      ) : null}

      {state === 'expired' || state === 'declined' || error ? (
        <Button
          type="button"
          variant="secondary"
          leading={<RefreshCw className="h-4 w-4" />}
          onClick={start}
          className="w-full rounded-full"
        >
          {t('deviceAuthorization.createNewCode')}
        </Button>
      ) : null}
      <button
        type="button"
        onClick={onSignIn}
        className="min-h-11 w-full rounded-full border border-white/12 bg-white/6 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        {t('deviceAuthorization.signInInstead')}
      </button>
    </div>
  );
}
