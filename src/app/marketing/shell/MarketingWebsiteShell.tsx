import { type ReactNode, useEffect } from 'react';
import { Button, Link, Text } from '@/app/components/primitives';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';
import { getMarketingWebsitePath, MARKETING_URLS } from '@/app/marketing/constants/marketingLinks';
import { GithubMark } from '@/app/marketing/icons/GithubMark';

function WebsiteNavLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http');
  const { theme } = useTheme();

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className={cn(
        'text-sm font-medium transition-colors',
        theme === 'light' ? 'text-slate-700 hover:text-slate-950' : 'text-white/72 hover:text-white'
      )}
    >
      {children}
    </a>
  );
}

export function MarketingWebsiteShell({
  children,
  currentPathname,
}: {
  children: ReactNode;
  currentPathname: string;
}) {
  const { theme, accentColor } = useTheme();
  const isLightTheme = theme === 'light';

  useEffect(() => {
    document.documentElement.style.setProperty('--navet-accent', accentColor);
    return () => {
      document.documentElement.style.removeProperty('--navet-accent');
    };
  }, [accentColor]);

  return (
    <div
      className={cn(
        'min-h-screen',
        isLightTheme
          ? 'bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2f7_100%)] text-slate-950'
          : 'bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#080c13_0%,#06080d_100%)] text-white'
      )}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-12 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header
          className={cn(
            'sticky top-4 z-20 rounded-full px-5 py-3 backdrop-blur-xl',
            isLightTheme
              ? 'border border-slate-200 bg-white/80'
              : 'border border-white/10 bg-black/20'
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a href={getMarketingWebsitePath('/')} className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}logo-horizontal-light.svg`}
                alt="Navet"
                className="h-8 w-auto"
              />
            </a>
            <nav className="flex flex-wrap items-center gap-5">
              <WebsiteNavLink href={getMarketingWebsitePath('/')}>Home</WebsiteNavLink>
              <WebsiteNavLink href={getMarketingWebsitePath('/install/')}>Install</WebsiteNavLink>
              <WebsiteNavLink href={getMarketingWebsitePath('/roadmap/')}>Roadmap</WebsiteNavLink>
              <WebsiteNavLink href={MARKETING_URLS.demo}>Demo</WebsiteNavLink>
              <WebsiteNavLink href={MARKETING_URLS.storybook}>Storybook</WebsiteNavLink>
            </nav>
            <div className="flex items-center gap-3">
              {currentPathname !== '/install/' ? (
                <Button
                  size="small"
                  onClick={() => {
                    window.location.assign(getMarketingWebsitePath('/install/'));
                  }}
                >
                  Install Navet
                </Button>
              ) : null}
              <Link href={MARKETING_URLS.github} target="_blank" rel="noreferrer" showExternalIcon>
                <GithubMark className="h-4 w-4" />
                GitHub
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-16 pb-10 md:space-y-20">{children}</main>

        <footer
          className={cn(
            'space-y-6 border-t pt-8',
            isLightTheme ? 'border-slate-200' : 'border-white/10'
          )}
        >
          <div className="flex flex-wrap gap-5">
            <WebsiteNavLink href={MARKETING_URLS.demo}>Demo</WebsiteNavLink>
            <WebsiteNavLink href={getMarketingWebsitePath('/install/')}>Install</WebsiteNavLink>
            <WebsiteNavLink href={MARKETING_URLS.github}>GitHub</WebsiteNavLink>
            <WebsiteNavLink href={getMarketingWebsitePath('/roadmap/')}>Roadmap</WebsiteNavLink>
            <WebsiteNavLink href={MARKETING_URLS.storybook}>Storybook</WebsiteNavLink>
          </div>
          <Text tone="muted">
            Navet keeps Home Assistant as the engine and focuses on a cleaner smart-home frontend
            for wall panels, tablets, desktops, and phones.
          </Text>
        </footer>
      </div>
    </div>
  );
}
