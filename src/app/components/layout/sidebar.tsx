import {
  Clipboard,
  Home,
  Lightbulb,
  Lock,
  Search,
  Settings,
  Tv,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { memo, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { HeaderSearchInput } from '@/app/components/layout/header-search-input';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type Section, useI18n, useMediaQuery, useNavigation, useTheme } from '@/app/hooks';
import { useSettingsStore } from '@/app/stores';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface SidebarProps {
  activeColorValue?: string;
  handleClearSearch?: () => void;
  handleSearchChange?: (value: string) => void;
  handleToggleMobileSearch?: () => void;
  hoverBg?: string;
  inputBg?: string;
  isMobileSearchOpen?: boolean;
  isSearchActive?: boolean;
  isSearchFocused?: boolean;
  mobileSearchInputRef?: RefObject<HTMLInputElement | null>;
  searchQuery?: string;
  setIsSearchFocused?: (focused: boolean) => void;
  textPrimary?: string;
  textSecondary?: string;
}

export const Sidebar = memo(function Sidebar({
  activeColorValue,
  handleClearSearch = () => {},
  handleSearchChange = () => {},
  handleToggleMobileSearch = () => {},
  hoverBg,
  inputBg,
  isMobileSearchOpen = false,
  isSearchActive = false,
  isSearchFocused = false,
  mobileSearchInputRef,
  searchQuery = '',
  setIsSearchFocused = () => {},
  textPrimary,
  textSecondary,
}: SidebarProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { activeSection, setActiveSection } = useNavigation();
  const { effectsQuality, lowPowerMode } = useSettingsStore(
    useShallow((state) => ({
      effectsQuality: state.effectsQuality,
      lowPowerMode: state.lowPowerMode,
    }))
  );
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, lowPowerMode);
  const surface = useMemo(
    () => getThemeSurfaceTokens(theme, resolvedEffectsQuality),
    [resolvedEffectsQuality, theme]
  );
  const isGlass = theme === 'glass';
  const isBlack = theme === 'black';
  const isLight = theme === 'light';
  const isHighEffects = resolvedEffectsQuality === 'high';
  const resolvedHoverBg = hoverBg ?? surface.hoverBg;
  const resolvedInputBg = inputBg ?? surface.inputBg;
  const resolvedTextPrimary = textPrimary ?? surface.textPrimary;
  const resolvedTextSecondary = textSecondary ?? surface.textSecondary;
  const inactiveColor = `${surface.textMuted} ${resolvedHoverBg}`;
  const [isMobileNavHidden, setIsMobileNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (!isMobile) {
      setIsMobileNavHidden(false);
      return;
    }

    const showThreshold = 96;
    const hideThreshold = 120;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= showThreshold) {
        setIsMobileNavHidden(false);
      } else if (currentScrollY > lastScrollYRef.current && currentScrollY > hideThreshold) {
        setIsMobileNavHidden(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const menuItems = [
    {
      icon: Home,
      label: t('sidebar.home'),
      section: 'home' as Section,
      onClick: () => setActiveSection('home'),
    },
    {
      icon: Zap,
      label: t('sidebar.energy'),
      section: 'energy' as Section,
      onClick: () => setActiveSection('energy'),
    },
    {
      icon: Video,
      label: t('sidebar.security'),
      section: 'security' as Section,
      onClick: () => setActiveSection('security'),
    },
    {
      icon: Clipboard,
      label: t('sidebar.tasks'),
      section: 'tasks' as Section,
      onClick: () => setActiveSection('tasks'),
    },
    {
      icon: Lock,
      label: t('sidebar.locks'),
      section: 'locks' as Section,
      onClick: () => setActiveSection('locks'),
    },
    {
      icon: Lightbulb,
      label: t('sidebar.lights'),
      section: 'lights' as Section,
      onClick: () => setActiveSection('lights'),
    },
    {
      icon: Tv,
      label: t('sidebar.media'),
      section: 'media' as Section,
      onClick: () => setActiveSection('media'),
    },
    {
      icon: Settings,
      label: t('sidebar.settings'),
      section: 'settings' as Section,
      onClick: () => setActiveSection('settings'),
    },
  ];
  const mobileMenuItems = menuItems.filter((item) =>
    ['home', 'energy', 'security', 'settings'].includes(item.section)
  );
  const mobileDockBackground = isGlass
    ? isHighEffects
      ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)), rgba(12,18,32,0.76)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)), rgba(10,16,28,0.88)'
    : isLight
      ? 'rgba(255,255,255,0.94)'
      : isBlack
        ? 'rgba(0,0,0,0.94)'
        : 'rgba(10,10,10,0.96)';
  const searchAccessoryBackground = isGlass
    ? isHighEffects
      ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)), rgba(12,18,32,0.8)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)), rgba(10,16,28,0.9)'
    : mobileDockBackground;
  const mobileDockShadow = isGlass
    ? isHighEffects
      ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 34px -24px rgba(0,0,0,0.55)'
      : undefined
    : isLight
      ? '0 16px 32px -26px rgba(15,23,42,0.18)'
      : '0 18px 36px -28px rgba(0,0,0,0.58)';
  const mobileSearchFieldBg = isLight ? resolvedInputBg : 'bg-white/92';
  const mobileSearchFieldText = isLight ? resolvedTextPrimary : 'text-slate-950';
  const mobileSearchFieldIcon = isLight ? 'text-slate-500' : 'text-slate-500';
  const mobileAccessoryBorder = 'border-transparent';
  const mobileAccessoryBg = isLight ? 'bg-white/86' : isBlack ? 'bg-white/4' : 'bg-zinc-900/92';
  const activeTabClassName = isLight
    ? 'border-slate-300/80 bg-white text-slate-950 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.24)]'
    : isBlack
      ? 'border-white/12 bg-white/8 text-white'
      : isGlass
        ? 'border-white/14 bg-white/10 text-white'
        : 'border-zinc-700/90 bg-zinc-800 text-white';
  const inactiveTabClassName = isLight
    ? 'border-transparent text-slate-600'
    : isBlack
      ? 'border-transparent text-zinc-300'
      : isGlass
        ? 'border-transparent text-white/76'
        : 'border-transparent text-zinc-300';

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`fixed left-0 top-0 hidden h-full w-16 ${surface.shellPanel} border-r md:flex z-50`}
      >
        <div className="flex w-full justify-center safe-area-pt-5">
          <div className="flex h-10 w-10 items-center justify-center">
            <ImageWithFallback
              src="./logo.svg"
              alt={t('sidebar.brandLogoAlt')}
              className="h-10 w-10"
            />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col gap-4">
            {menuItems.map((item, index) => (
              <InteractivePill
                key={index}
                onClick={item.onClick}
                aria-label={item.label}
                aria-current={activeSection === item.section ? 'page' : undefined}
                title={item.label}
                active={activeSection === item.section}
                variant="ghost"
                className={`flex h-10 w-10 items-center justify-center rounded-[22px] px-0 py-0 transition-colors ${
                  activeSection === item.section ? '' : inactiveColor
                }`}
              >
                <item.icon className="h-5 w-5" />
              </InteractivePill>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.3125rem)] z-50 px-[1.3125rem] transition-transform duration-300 md:hidden"
        style={{
          transform: isMobileNavHidden
            ? 'translateY(calc(100% + max(env(safe-area-inset-bottom), 0px) + 1rem))'
            : 'translateY(0)',
        }}
      >
        {isMobileSearchOpen ? (
          <div className="flex items-center gap-[0.625rem]">
            <div className="min-w-0 flex-1">
              <HeaderSearchInput
                activeColorValue={activeColorValue ?? 'currentColor'}
                hoverBg={resolvedHoverBg}
                inputBg={mobileSearchFieldBg}
                inputRef={mobileSearchInputRef}
                isSearchActive={isSearchActive}
                isSearchFocused={isSearchFocused}
                onBlur={() => setIsSearchFocused(false)}
                onChange={handleSearchChange}
                onClear={handleClearSearch}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={t('header.searchPlaceholder')}
                query={searchQuery}
                textPrimary={mobileSearchFieldText}
                textSecondary={mobileSearchFieldIcon}
                widthClassName="w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleMobileSearch}
              aria-label={t('common.close')}
              className={`relative flex h-12.5 w-12.5 shrink-0 items-center justify-center rounded-full border transition-transform duration-200 ${mobileAccessoryBorder} ${mobileAccessoryBg}`}
              style={{
                background: searchAccessoryBackground,
                boxShadow: mobileDockShadow,
              }}
            >
              <X className={`h-4 w-4 ${resolvedTextSecondary}`} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2.5">
            <div
              className="relative min-w-0 flex-1 overflow-hidden rounded-[22px]"
              style={{ background: mobileDockBackground, boxShadow: mobileDockShadow }}
            >
              {isGlass ? (
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_42%)]" />
              ) : null}

              <div
                className={`relative flex min-h-12.5 items-stretch justify-around px-0.75 py-0.75 ${
                  isGlass ? surface.panelMuted : surface.shellPanel
                }`}
              >
                {mobileMenuItems.map((item) => (
                  <button
                    key={item.section}
                    onClick={item.onClick}
                    aria-label={item.label}
                    aria-current={activeSection === item.section ? 'page' : undefined}
                    type="button"
                    className={`flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-px rounded-[20px] transition-colors ${
                      activeSection === item.section ? activeTabClassName : inactiveTabClassName
                    }`}
                  >
                    <item.icon className="h-[0.88rem] w-[0.88rem] shrink-0" />
                    <span className="max-w-full whitespace-nowrap px-0.5 text-[11px] font-normal leading-none tracking-normal">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMobileSearch}
              aria-label={t('sidebar.search')}
              aria-expanded={isMobileSearchOpen}
              className={`relative flex h-12.5 w-12.5 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${mobileAccessoryBorder} ${mobileAccessoryBg}`}
              style={{
                background: searchAccessoryBackground,
                boxShadow: mobileDockShadow,
              }}
            >
              <Search className={`h-[0.95rem] w-[0.95rem] ${resolvedTextSecondary}`} />
            </button>
          </div>
        )}
      </div>
    </>
  );
});
