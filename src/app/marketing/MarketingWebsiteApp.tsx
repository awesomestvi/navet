import { useEffect } from 'react';
import { I18nProvider } from '@/app/i18n';
import { MarketingHomePage } from '@/app/marketing/pages/MarketingHomePage';
import { MarketingInstallPage } from '@/app/marketing/pages/MarketingInstallPage';
import { MarketingRoadmapPage } from '@/app/marketing/pages/MarketingRoadmapPage';
import { resolveMarketingWebsiteRoute } from '@/app/marketing/routing/marketingWebsiteRoutes';
import { applyMarketingWebsiteMetadata } from '@/app/marketing/seo/marketingMetadata';
import { MarketingWebsiteShell } from '@/app/marketing/shell/MarketingWebsiteShell';

function WebsiteContent() {
  const route = resolveMarketingWebsiteRoute(window.location.pathname, import.meta.env.BASE_URL);

  useEffect(() => {
    applyMarketingWebsiteMetadata(route);
  }, [route]);

  return (
    <MarketingWebsiteShell currentPathname={route.pathname}>
      {route.id === 'install' ? (
        <MarketingInstallPage />
      ) : route.id === 'roadmap' ? (
        <MarketingRoadmapPage />
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
