import { I18nProvider } from '@navet/app/i18n';
import { MarketingHomePage } from '@navet/app/marketing/pages/MarketingHomePage';
import { MarketingInstallPage } from '@navet/app/marketing/pages/MarketingInstallPage';
import { MarketingRoadmapPage } from '@navet/app/marketing/pages/MarketingRoadmapPage';
import { resolveMarketingWebsiteRoute } from '@navet/app/marketing/routing/marketingWebsiteRoutes';
import { applyMarketingWebsiteMetadata } from '@navet/app/marketing/seo/marketingMetadata';
import { MarketingWebsiteShell } from '@navet/app/marketing/shell/MarketingWebsiteShell';
import { useEffect } from 'react';

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
