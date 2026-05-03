import { Compass, Search, X } from 'lucide-react';
import { memo, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { HeaderSearchInput } from '@/app/components/layout/header-search-input';
import { MobileSectionOrbitSheet } from '@/app/components/layout/mobile-section-orbit-sheet';
import { Button } from '@/app/components/primitives';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getInteractivePillStyles } from '@/app/components/shared/theme/interactive-pill-styles';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useMediaQuery, useTheme } from '@/app/hooks';
import { useNavigationStore, useSettingsStore } from '@/app/stores';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { MobileRoomNavigation } from './mobile-room-dropdown';
import {
  getOrderedSectionNavigationItems,
  getSectionNavigationItems,
  MOBILE_SECTION_DOCK_ORDER,
} from './section-navigation';

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
  mobileRoomNavigation?: MobileRoomNavigation;
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
  mobileRoomNavigation,
  mobileSearchInputRef,
  searchQuery = '',
  setIsSearchFocused = () => {},
  textPrimary,
  textSecondary,
}: SidebarProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const { activeSection, lastNonHomeSection, recentSections, setActiveSection } =
    useNavigationStore(
      useShallow((state) => ({
        activeSection: state.activeSection,
        lastNonHomeSection: state.lastNonHomeSection,
        recentSections: state.recentSections,
        setActiveSection: state.setActiveSection,
      }))
    );
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
  const cardShell = useMemo(() => getCardShellSurfaceTokens(theme), [theme]);
  const isGlass = theme === 'glass';
  const isLight = theme === 'light';
  const isHighEffects = resolvedEffectsQuality === 'high';
  const resolvedHoverBg = hoverBg ?? surface.hoverBg;
  const resolvedInputBg = inputBg ?? surface.inputBg;
  const resolvedTextPrimary = textPrimary ?? surface.textPrimary;
  const resolvedTextSecondary = textSecondary ?? surface.textSecondary;
  const inactiveColor = `${surface.textMuted} ${resolvedHoverBg}`;
  const [isMobileNavHidden, setIsMobileNavHidden] = useState(false);
  const [isOrbitOpen, setIsOrbitOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (!isMobile) {
      setIsMobileNavHidden(false);
      setIsOrbitOpen(false);
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

  const menuItems = useMemo(
    () =>
      getSectionNavigationItems(t).map((item) => ({
        ...item,
        onClick: () => setActiveSection(item.section),
      })),
    [setActiveSection, t]
  );
  const dockItems = useMemo(
    () =>
      getOrderedSectionNavigationItems(t, MOBILE_SECTION_DOCK_ORDER).map((item) => ({
        ...item,
        onClick: () => setActiveSection(item.section),
      })),
    [setActiveSection, t]
  );
  const searchAccessoryBackground = undefined;
  const mobileDockShadow = isGlass
    ? isHighEffects
      ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 34px -24px rgba(0,0,0,0.55)'
      : undefined
    : isLight
      ? '0 16px 32px -26px rgba(15,23,42,0.18)'
      : '0 18px 36px -28px rgba(0,0,0,0.58)';
  const mobileSearchFieldBg = isLight ? resolvedInputBg : 'bg-white/92';
  const mobileSearchFieldText = isLight ? resolvedTextPrimary : 'text-slate-950';
  const mobileSearchFieldIcon = 'text-slate-500';
  const getMobileTabPill = (isActive: boolean) =>
    getInteractivePillStyles({
      intent: 'navigation',
      isActive,
      primaryColor,
      theme,
      variant: isActive ? 'default' : 'ghost',
    });

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
            {menuItems.map((item) => (
              <InteractivePill
                key={item.section}
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
        className="mobile-bottom-dock-offset fixed inset-x-0 z-50 px-[1.3125rem] transition-[transform,opacity] duration-300 md:hidden"
        style={{
          opacity: isMobileNavHidden ? 0 : 1,
          pointerEvents: isMobileNavHidden ? 'none' : 'auto',
          transform: isMobileNavHidden
            ? 'translateY(calc(100% + var(--mobile-bottom-dock-offset) + var(--mobile-bottom-dock-viewport-overlap) + 1rem))'
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

            <Button
              iconOnly
              variant="secondary"
              size="small"
              onClick={handleToggleMobileSearch}
              label={t('common.close')}
              className="h-12.5 w-12.5 shrink-0 border-transparent! backdrop-blur-xl"
              style={{
                background: searchAccessoryBackground,
                boxShadow: mobileDockShadow,
              }}
            >
              <X className={`h-4 w-4 ${resolvedTextSecondary}`} />
            </Button>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2.5">
            <div
              className={`relative overflow-hidden rounded-[22px] border-transparent ${surface.panel} ${cardShell.backdropClassName} ${surface.cardShadow}`}
              style={{ boxShadow: mobileDockShadow }}
            >
              {isGlass ? (
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_42%)]" />
              ) : null}

              <div className="relative flex min-h-12.5 items-stretch gap-1 px-0.75 py-0.75">
                {dockItems.map((item) => (
                  <MobileDockButton
                    key={item.section}
                    icon={item.icon}
                    isActive={activeSection === item.section}
                    label={item.label}
                    onClick={item.onClick}
                    pill={getMobileTabPill(activeSection === item.section)}
                  />
                ))}

                <MobileDockButton
                  icon={Compass}
                  isActive={isOrbitOpen}
                  label={t('sidebar.orbit')}
                  onClick={() => setIsOrbitOpen(true)}
                  pill={getMobileTabPill(isOrbitOpen)}
                  ariaExpanded={isOrbitOpen}
                />
              </div>
            </div>

            <Button
              iconOnly
              variant="secondary"
              size="small"
              onClick={handleToggleMobileSearch}
              label={t('sidebar.search')}
              aria-expanded={isMobileSearchOpen}
              className="h-12.5 w-12.5 shrink-0 rounded-[999px] border-transparent! backdrop-blur-xl"
              style={{
                background: searchAccessoryBackground,
                boxShadow: mobileDockShadow,
              }}
            >
              <Search className={`h-[0.95rem] w-[0.95rem] ${resolvedTextSecondary}`} />
            </Button>
          </div>
        )}
      </div>

      <MobileSectionOrbitSheet
        activeSection={activeSection}
        currentRoomNavigation={mobileRoomNavigation}
        isOpen={isOrbitOpen}
        lastNonHomeSection={lastNonHomeSection}
        onOpenChange={setIsOrbitOpen}
        onSelectSection={setActiveSection}
        recentSections={recentSections}
      />
    </>
  );
});

function MobileDockButton({
  ariaExpanded,
  icon: Icon,
  isActive,
  label,
  onClick,
  pill,
}: {
  ariaExpanded?: boolean;
  icon: typeof Search;
  isActive: boolean;
  label: string;
  onClick: () => void;
  pill: ReturnType<typeof getInteractivePillStyles>;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={ariaExpanded}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      type="button"
      className={`flex min-h-11 min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-1.5 transition-all ${pill.className}`}
      style={pill.style}
    >
      <Icon className="h-[0.94rem] w-[0.94rem] shrink-0" />
      <span
        className={`max-w-full whitespace-nowrap px-0.5 text-[11px] leading-none tracking-[-0.01em] ${
          isActive ? 'font-semibold' : 'font-medium'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
