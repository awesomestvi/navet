import { Clipboard, Home, Lightbulb, Lock, Settings, Tv, Video, Zap } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type Section, useI18n, useMediaQuery, useNavigation, useTheme } from '@/app/hooks';
import { useSettingsStore } from '@/app/stores';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export const Sidebar = memo(function Sidebar() {
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
  const isHighEffects = resolvedEffectsQuality === 'high';
  const inactiveColor = `${surface.textMuted} ${surface.hoverBg}`;
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
        className="safe-area-bottom-offset fixed inset-x-0 z-50 px-2 pb-2 transition-transform duration-300 md:hidden"
        style={{
          transform: isMobileNavHidden
            ? 'translateY(calc(100% + max(env(safe-area-inset-bottom), 0px) + 1rem))'
            : 'translateY(0)',
        }}
      >
        <div
          className={`relative overflow-hidden rounded-[28px] border ${surface.borderStrong} ${isGlass && isHighEffects ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]' : ''}`}
          style={
            isGlass
              ? {
                  background: isHighEffects
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06)), rgba(12,18,32,0.78)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), rgba(10,16,28,0.88)',
                }
              : undefined
          }
        >
          {isGlass ? (
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_44%)]" />
          ) : null}

          <div
            className={`relative flex min-h-12.25 items-stretch justify-around px-1 py-1 ${
              isGlass ? surface.panelMuted : surface.shellPanel
            }`}
          >
            {menuItems
              .filter((item) =>
                ['home', 'energy', 'security', 'lights', 'media', 'settings'].includes(item.section)
              )
              .map((item, index) => (
                <InteractivePill
                  key={index}
                  onClick={item.onClick}
                  aria-label={item.label}
                  aria-current={activeSection === item.section ? 'page' : undefined}
                  active={activeSection === item.section}
                  variant="ghost"
                  className={`flex h-12.25 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.75 rounded-3xl px-1 py-1 transition-colors ${
                    activeSection === item.section ? '' : inactiveColor
                  }`}
                >
                  <item.icon className="h-[1.2rem] w-[1.2rem] shrink-0" />
                  <span className="max-w-full truncate text-[0.64rem] font-medium leading-none tracking-[-0.01em]">
                    {item.label}
                  </span>
                </InteractivePill>
              ))}
          </div>
        </div>
      </div>
    </>
  );
});
