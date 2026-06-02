import { I18nProvider } from '@navet/app/i18n';
import { MarketingHomePage } from '@navet/app/marketing/pages/MarketingHomePage';
import { resolveMarketingWebsiteRoute } from '@navet/app/marketing/routing/marketingWebsiteRoutes';
import { applyMarketingWebsiteMetadata } from '@navet/app/marketing/seo/marketingMetadata';
import { MarketingWebsiteShell } from '@navet/app/marketing/shell/MarketingWebsiteShell';
import { lazy, Suspense, useEffect } from 'react';

const MarketingInstallPage = lazy(async () => {
  const module = await import('@navet/app/marketing/pages/MarketingInstallPage');
  return { default: module.MarketingInstallPage };
});

const MarketingRoadmapPage = lazy(async () => {
  const module = await import('@navet/app/marketing/pages/MarketingRoadmapPage');
  return { default: module.MarketingRoadmapPage };
});

function DeferredPageFallback() {
  return <div aria-hidden="true" className="min-h-[60vh]" />;
}

function WebsiteContent() {
  const route = resolveMarketingWebsiteRoute(window.location.pathname, import.meta.env.BASE_URL);

  useEffect(() => {
    applyMarketingWebsiteMetadata(route);
  }, [route]);

  return (
    <MarketingWebsiteShell currentPathname={route.pathname}>
      {route.id === 'install' ? (
        <Suspense fallback={<DeferredPageFallback />}>
          <MarketingInstallPage />
        </Suspense>
      ) : route.id === 'roadmap' ? (
        <Suspense fallback={<DeferredPageFallback />}>
          <MarketingRoadmapPage />
        </Suspense>
      ) : (
        <MarketingHomePage />
      )}
    </MarketingWebsiteShell>
  );
}

export default function MarketingWebsiteApp() {
  return (
    <I18nProvider>
      <WebsiteContent />
    </I18nProvider>
  );
}
