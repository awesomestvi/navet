import { Button, LoadingSpinner } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { openCustomExtensionUrl } from '@navet/app/utils/custom-extensions';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const IFRAME_LOAD_TIMEOUT_MS = 8_000;

interface EmbeddedSidebarPageProps {
  title: string;
  url: string;
}

function getHostnameLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function appendReloadToken(url: string, reloadKey: number): string {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('navet_reload', String(reloadKey));
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export function EmbeddedSidebarPage({ title, url }: EmbeddedSidebarPageProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'blocked'>('loading');
  const framedUrl = useMemo(() => appendReloadToken(url, reloadKey), [reloadKey, url]);
  const hostname = useMemo(() => getHostnameLabel(url), [url]);

  useEffect(() => {
    setStatus('loading');
    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === 'loaded' ? current : 'blocked'));
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [framedUrl]);

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div
        className={`relative flex min-h-[calc(100vh-7rem)] flex-1 overflow-hidden rounded-[28px] border ${surface.border} ${surface.panel}`}
      >
        {status !== 'loaded' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 px-6 text-center">
            {status === 'loading' ? (
              <LoadingSpinner message={t('common.loading')} />
            ) : (
              <div className="max-w-md space-y-4">
                <div>
                  <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>
                    This page may be blocking embedding
                  </h2>
                  <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                    {title} at {hostname} did not finish loading inside Navet. Some sites send
                    X-Frame-Options or Content-Security-Policy headers that prevent iframe
                    rendering.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    leading={<RefreshCw className="h-4 w-4" />}
                    onClick={() => setReloadKey((current) => current + 1)}
                  >
                    Retry
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    leading={<ExternalLink className="h-4 w-4" />}
                    onClick={() => openCustomExtensionUrl(url)}
                  >
                    Open externally
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <iframe
          key={framedUrl}
          title={title}
          src={framedUrl}
          className="h-full min-h-[calc(100vh-7rem)] w-full border-0 bg-transparent"
          onLoad={() => setStatus('loaded')}
        />
      </div>
    </div>
  );
}
