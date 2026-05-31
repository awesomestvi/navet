import { Button, Link, Text } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  getMarketingWebsitePath,
  MARKETING_URLS,
} from '@navet/app/marketing/constants/marketingLinks';
import { GithubMark } from '@navet/app/marketing/icons/GithubMark';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { storage } from '@navet/app/utils/storage';
import { AnimatedGridPattern } from '@website/components/magicui/animated-grid-pattern';
import { Star } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

const GITHUB_STARS_CACHE_KEY = 'marketing:github-stars';
const GITHUB_STARS_CACHE_TTL_MS = 60 * 60 * 1000;

function getGithubRepoApiUrl(repoUrl: string) {
  const { pathname } = new URL(repoUrl);
  const repoPath = pathname.replace(/^\/+|\/+$/g, '');
  return `https://api.github.com/repos/${repoPath}`;
}

function formatStarCount(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  );
}

function WebsiteNavLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http');
  const { theme } = useTheme();

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className={cn(
        'text-[13px] font-medium transition-colors',
        theme === 'light' ? 'text-slate-700 hover:text-slate-950' : 'text-white/68 hover:text-white'
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
  const isHomePage = currentPathname === '/';
  const [githubStarCount, setGithubStarCount] = useState<string | null>(() => {
    const cached = storage.get<{ count: number; expiresAt: number } | null>(
      GITHUB_STARS_CACHE_KEY,
      null
    );
    if (!cached || cached.expiresAt <= Date.now()) {
      return null;
    }

    return formatStarCount(cached.count);
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--navet-accent', accentColor);
    return () => {
      document.documentElement.style.removeProperty('--navet-accent');
    };
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    const previousEffectsQuality = root.dataset.effectsQuality;
    const previousNoAnimation = root.dataset.noAnimation;
    const previousLowPower = root.dataset.lowPower;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousTemperatureUnit = useSettingsStore.getState().temperatureUnit;
    const previousUse24HourTime = useSettingsStore.getState().use24HourTime;

    root.dataset.effectsQuality = 'high';
    root.dataset.lowPower = 'false';
    root.dataset.noAnimation = prefersReducedMotion ? 'true' : 'false';
    useSettingsStore.setState({
      temperatureUnit: 'celsius',
      use24HourTime: true,
    });

    return () => {
      if (previousEffectsQuality) {
        root.dataset.effectsQuality = previousEffectsQuality;
      } else {
        delete root.dataset.effectsQuality;
      }

      if (previousLowPower) {
        root.dataset.lowPower = previousLowPower;
      } else {
        delete root.dataset.lowPower;
      }

      if (previousNoAnimation) {
        root.dataset.noAnimation = previousNoAnimation;
      } else {
        delete root.dataset.noAnimation;
      }

      useSettingsStore.setState({
        temperatureUnit: previousTemperatureUnit,
        use24HourTime: previousUse24HourTime,
      });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const cached = storage.get<{ count: number; expiresAt: number } | null>(
      GITHUB_STARS_CACHE_KEY,
      null
    );
    if (cached && cached.expiresAt > Date.now()) {
      setGithubStarCount(formatStarCount(cached.count));
      return () => controller.abort();
    }

    const loadGithubStars = async () => {
      try {
        const response = await fetch(getGithubRepoApiUrl(MARKETING_URLS.github), {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { stargazers_count?: number };
        if (typeof payload.stargazers_count !== 'number') {
          return;
        }

        storage.set(GITHUB_STARS_CACHE_KEY, {
          count: payload.stargazers_count,
          expiresAt: Date.now() + GITHUB_STARS_CACHE_TTL_MS,
        });
        setGithubStarCount(formatStarCount(payload.stargazers_count));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        if (import.meta.env.DEV) {
          console.warn('[marketing] failed to load GitHub stars', error);
        }
      }
    };

    void loadGithubStars();

    return () => controller.abort();
  }, []);

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden',
        isLightTheme
          ? 'bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2f7_100%)] text-slate-950'
          : 'bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#080c13_0%,#06080d_100%)] text-white'
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="marketing-aurora marketing-aurora--amber" />
        <div className="marketing-aurora marketing-aurora--blue" />
        <AnimatedGridPattern className="marketing-grid-mask" width={64} height={64} duration={24} />
      </div>
      <div className="relative mx-auto min-h-screen w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <header
          className={cn(
            'absolute inset-x-4 top-4 z-20 rounded-full px-4 py-2.5 backdrop-blur-xl sm:inset-x-6 sm:px-4 lg:inset-x-8 lg:top-6 lg:px-5',
            isLightTheme
              ? 'border border-slate-200 bg-white/80'
              : 'border border-white/10 bg-black/20'
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <a href={getMarketingWebsitePath('/')} className="flex shrink-0 items-center gap-2.5">
              <img
                src={`${import.meta.env.BASE_URL}logo-horizontal-light.svg`}
                alt="Navet"
                className="h-9 w-auto"
              />
            </a>
            <nav className="hidden items-center gap-4 lg:flex xl:gap-5">
              <WebsiteNavLink href={getMarketingWebsitePath('/')}>Home</WebsiteNavLink>
              <WebsiteNavLink href={getMarketingWebsitePath('/install/')}>Install</WebsiteNavLink>
              <WebsiteNavLink href={getMarketingWebsitePath('/roadmap/')}>Roadmap</WebsiteNavLink>
              <WebsiteNavLink href={MARKETING_URLS.demo}>Demo</WebsiteNavLink>
              <WebsiteNavLink href={MARKETING_URLS.storybook}>Storybook</WebsiteNavLink>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={MARKETING_URLS.github}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'hidden h-9 items-center gap-2 rounded-full px-3 text-[13px] no-underline backdrop-blur-sm hover:no-underline lg:inline-flex',
                  isLightTheme
                    ? 'border border-slate-200 bg-white/80 text-slate-900'
                    : 'border border-white/10 bg-white/6 text-white/88'
                )}
              >
                <GithubMark className="h-3.5 w-3.5" />
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {githubStarCount ?? '...'}
                </span>
              </Link>
              {currentPathname !== '/install/' ? (
                <Button
                  size="small"
                  className="h-9 px-4 text-[13px]"
                  onClick={() => {
                    window.location.assign(getMarketingWebsitePath('/install/'));
                  }}
                >
                  Install Navet
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <main
          className={cn(
            'space-y-24 pb-10 md:space-y-28 lg:space-y-32',
            isHomePage ? 'pt-0' : 'pt-28 lg:pt-36'
          )}
        >
          {children}
        </main>

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
            Navet is a provider-neutral smart-home dashboard focused on a cleaner product experience
            for wall panels, tablets, desktops, and phones.
          </Text>
        </footer>
      </div>
    </div>
  );
}
