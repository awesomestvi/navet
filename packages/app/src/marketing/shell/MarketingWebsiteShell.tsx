import { Text } from '@navet/app/components/primitives';
import {
  getThemeFocusRingClassName,
  navetSpacingTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  getMarketingWebsitePath,
  MARKETING_URLS,
} from '@navet/app/marketing/constants/marketingLinks';
import { GithubMark } from '@navet/app/marketing/icons/GithubMark';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { storage } from '@navet/app/utils/storage';
import { Menu, Star, X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatedGridPattern } from '../../../../../apps/website/src/components/effects/animated-grid-pattern';
import logoHorizontalLight from '../../../../../assets/public/logo-horizontal-light.svg';

const GITHUB_STARS_CACHE_KEY = 'marketing:github-stars';
const GITHUB_STARS_CACHE_TTL_MS = 60 * 60 * 1000;

const WEBSITE_PRIMARY_NAV_ITEMS = [
  { href: MARKETING_URLS.demo, label: 'Demo' },
  { href: MARKETING_URLS.storybook, label: 'Storybook' },
] as const;

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

function resolveNavigationHref(href: string) {
  if (typeof window === 'undefined') {
    return { href, isExternal: /^https?:\/\//.test(href) };
  }

  try {
    const resolvedUrl = new URL(href, window.location.href);
    const isHttp = resolvedUrl.protocol === 'http:' || resolvedUrl.protocol === 'https:';
    const isExternal = isHttp && resolvedUrl.origin !== window.location.origin;

    return {
      href: isExternal
        ? resolvedUrl.toString()
        : `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`,
      isExternal,
    };
  } catch {
    return { href, isExternal: /^https?:\/\//.test(href) };
  }
}

function WebsiteNavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  const resolvedLink = useMemo(() => resolveNavigationHref(href), [href]);

  return (
    <a
      href={resolvedLink.href}
      target={resolvedLink.isExternal ? '_blank' : undefined}
      rel={resolvedLink.isExternal ? 'noreferrer' : undefined}
      className={cn(
        navetTypographyTokens.control,
        getThemeFocusRingClassName(theme),
        'inline-flex min-h-9 items-center rounded-full px-3.5 transition-[color,background-color,border-color,opacity]',
        theme === 'light'
          ? 'text-slate-700 hover:bg-slate-950/5 hover:text-slate-950'
          : 'text-white/68 hover:bg-white/7 hover:text-white',
        className
      )}
    >
      {children}
    </a>
  );
}

function GithubNavLink({
  href,
  starCount,
  className,
}: {
  href: string;
  starCount: string | null;
  className?: string;
}) {
  const { theme } = useTheme();
  const resolvedLink = useMemo(() => resolveNavigationHref(href), [href]);

  return (
    <a
      href={resolvedLink.href}
      target={resolvedLink.isExternal ? '_blank' : undefined}
      rel={resolvedLink.isExternal ? 'noreferrer' : undefined}
      className={cn(
        navetTypographyTokens.control,
        getThemeFocusRingClassName(theme),
        'inline-flex min-h-9 items-center rounded-full border px-3.5 transition-[color,background-color,border-color,opacity]',
        theme === 'light'
          ? 'border-slate-200 bg-white/78 text-slate-900 hover:border-slate-300 hover:bg-white'
          : 'border-white/10 bg-white/[0.045] text-white/88 hover:border-white/14 hover:bg-white/[0.075]',
        className
      )}
    >
      <span className={`inline-flex items-center ${navetSpacingTokens.inline.sm}`}>
        <GithubMark className="h-3.5 w-3.5 shrink-0" />
        <span>GitHub</span>
        {starCount ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.01em]',
              theme === 'light' ? 'text-slate-500' : 'text-white/52'
            )}
          >
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            <span>{starCount}</span>
          </span>
        ) : null}
      </span>
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const mobileNavId = useId();
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

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setIsMobileNavOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentPathname]);

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-x-hidden',
        isLightTheme
          ? 'bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2f7_100%)] text-slate-950'
          : 'bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(180deg,#080c13_0%,#06080d_100%)] text-white'
      )}
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="marketing-aurora marketing-aurora--amber" />
        <div className="marketing-aurora marketing-aurora--blue" />
        <div className="marketing-glow marketing-glow--center" />
        <div className="marketing-glow marketing-glow--lower" />
        <div className="marketing-beam" />
        <AnimatedGridPattern className="marketing-grid-mask" width={64} height={64} duration={24} />
      </div>
      <div className="relative z-[1] mx-auto min-h-screen w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <header
          ref={headerRef}
          className={cn(
            'absolute inset-x-4 top-4 z-20 px-4 py-2.5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.72)] backdrop-blur-xl transition-[border-radius,background-color,border-color,box-shadow] sm:inset-x-6 sm:px-4 lg:inset-x-8 lg:top-6 lg:px-5',
            isMobileNavOpen ? 'rounded-[28px]' : 'rounded-full',
            isLightTheme
              ? 'border border-slate-200/90 bg-white/78'
              : 'border border-white/10 bg-black/24'
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <a
              href={getMarketingWebsitePath('/')}
              className={cn(
                getThemeFocusRingClassName(theme),
                'inline-flex min-w-0 shrink-0 items-center rounded-full transition-opacity hover:opacity-95'
              )}
              aria-label="Navet home"
            >
              <img src={logoHorizontalLight} alt="Navet" className="h-10 w-auto sm:h-11" />
            </a>

            <nav aria-label="Primary" className="hidden items-center gap-1.5 md:flex">
              {WEBSITE_PRIMARY_NAV_ITEMS.map((item) => (
                <WebsiteNavLink key={item.label} href={item.href}>
                  {item.label}
                </WebsiteNavLink>
              ))}
              <GithubNavLink href={MARKETING_URLS.github} starCount={githubStarCount} />
            </nav>

            <button
              type="button"
              onClick={() => setIsMobileNavOpen((open) => !open)}
              aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileNavOpen}
              aria-controls={mobileNavId}
              className={cn(
                getThemeFocusRingClassName(theme),
                'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-[background-color,border-color,color] md:hidden',
                isLightTheme
                  ? 'border-slate-200 bg-white/72 text-slate-900 hover:bg-white'
                  : 'border-white/10 bg-white/[0.05] text-white/88 hover:bg-white/[0.08]'
              )}
            >
              {isMobileNavOpen ? (
                <X className="h-[18px] w-[18px]" />
              ) : (
                <Menu className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>

          <div
            id={mobileNavId}
            aria-hidden={!isMobileNavOpen}
            className={cn(
              'overflow-hidden transition-[max-height,opacity,margin] duration-200 md:hidden',
              isMobileNavOpen ? 'mt-3 max-h-64 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div
              className={cn(
                'border-t pt-3',
                isLightTheme ? 'border-slate-200/90' : 'border-white/10'
              )}
            >
              <nav aria-label="Mobile primary" className="flex flex-col gap-1">
                {WEBSITE_PRIMARY_NAV_ITEMS.map((item) => (
                  <WebsiteNavLink key={item.label} href={item.href} className="justify-start px-3">
                    {item.label}
                  </WebsiteNavLink>
                ))}
                <GithubNavLink
                  href={MARKETING_URLS.github}
                  starCount={githubStarCount}
                  className="justify-start px-3"
                />
              </nav>
            </div>
          </div>
        </header>

        <main
          className={cn(
            'pb-14 md:pb-16',
            isHomePage
              ? 'space-y-24 pt-0 md:space-y-28 lg:space-y-32'
              : 'space-y-24 pt-28 md:space-y-28 lg:space-y-32 lg:pt-36'
          )}
        >
          {children}
        </main>

        <footer
          className={cn(
            'space-y-6 border-t pt-8 pb-16 md:pb-20',
            isLightTheme ? 'border-slate-200' : 'border-white/10'
          )}
        >
          <div className="flex flex-wrap gap-5">
            <WebsiteNavLink href={MARKETING_URLS.demo} className="min-h-0 px-0">
              Demo
            </WebsiteNavLink>
            <WebsiteNavLink href={getMarketingWebsitePath('/install/')} className="min-h-0 px-0">
              Install
            </WebsiteNavLink>
            <WebsiteNavLink href={MARKETING_URLS.github} className="min-h-0 px-0">
              GitHub
            </WebsiteNavLink>
            <WebsiteNavLink href={getMarketingWebsitePath('/roadmap/')} className="min-h-0 px-0">
              Roadmap
            </WebsiteNavLink>
            <WebsiteNavLink href={MARKETING_URLS.storybook} className="min-h-0 px-0">
              Storybook
            </WebsiteNavLink>
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
