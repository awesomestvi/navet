import { ArrowLeft, Sparkles } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Button, SheetSurface } from '@/app/components/primitives';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { type Section, useI18n, useTheme } from '@/app/hooks';
import { MobileRoomDropdown, type MobileRoomNavigation } from './mobile-room-dropdown';
import {
  getOrderedSectionNavigationItems,
  getRecentSectionNavigationItems,
  MOBILE_SECTION_ORBIT_ORDER,
} from './section-navigation';

interface MobileSectionOrbitSheetProps {
  activeSection: Section;
  currentRoomNavigation?: MobileRoomNavigation;
  isOpen: boolean;
  lastNonHomeSection: Section | null;
  onOpenChange: (open: boolean) => void;
  onSelectSection: (section: Section) => void;
  recentSections: Section[];
}

export const MobileSectionOrbitSheet = memo(function MobileSectionOrbitSheet({
  activeSection,
  currentRoomNavigation,
  isOpen,
  lastNonHomeSection,
  onOpenChange,
  onSelectSection,
  recentSections,
}: MobileSectionOrbitSheetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const orbitItems = useMemo(
    () => getOrderedSectionNavigationItems(t, MOBILE_SECTION_ORBIT_ORDER),
    [t]
  );
  const featuredRecentSections = useMemo(() => {
    return getRecentSectionNavigationItems(t, recentSections, lastNonHomeSection);
  }, [lastNonHomeSection, recentSections, t]);

  const handleSelectSection = (section: Section) => {
    onSelectSection(section);
    onOpenChange(false);
  };

  return (
    <SheetSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('sidebar.orbitTitle')}
      description={t('sidebar.orbitDescription')}
      accentColor={accentColor}
      overlayClassName={`animate-in fade-in bg-black/45 backdrop-blur-[2px] md:hidden ${surface.dialogBackdrop}`}
      contentClassName={`${surface.panel} ${surface.border}`}
      bodyClassName="px-4"
    >
      <div className="space-y-4 pb-1">
        <div className="flex items-start justify-between gap-3 py-1">
          <div className="min-w-0">
            <p
              className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              {t('sidebar.orbit')}
            </p>
            <p className={`mt-1 text-base font-semibold ${surface.textPrimary}`}>
              {t('sidebar.orbitTitle')}
            </p>
            <p className={`mt-1 text-xs ${surface.textSecondary}`}>
              {t('sidebar.orbitDescription')}
            </p>
          </div>
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px]',
              surface.subtleBg
            )}
          >
            <Sparkles className={`h-5 w-5 ${surface.textSecondary}`} />
          </span>
        </div>

        {featuredRecentSections.length > 0 ? (
          <section className="space-y-2">
            <p
              className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              {t('sidebar.recentSections')}
            </p>
            <div className="flex flex-wrap gap-2">
              {featuredRecentSections.map((item) => (
                <Button
                  key={item.section}
                  variant={activeSection === item.section ? 'primary' : 'secondary'}
                  size="small"
                  leading={<item.icon className="h-4 w-4 shrink-0" />}
                  onClick={() => handleSelectSection(item.section)}
                  className={cn(
                    'rounded-[18px]',
                    activeSection !== item.section && surface.textPrimary
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <p
            className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
          >
            {t('sidebar.allSections')}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {orbitItems.map((item) => {
              const isActive = activeSection === item.section;

              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => handleSelectSection(item.section)}
                  className={cn(
                    'flex min-h-24 flex-col items-start justify-between rounded-[24px] border px-4 py-3.5 text-left transition-colors',
                    isActive
                      ? 'border-transparent text-white shadow-[0_18px_36px_-24px_rgba(0,0,0,0.45)]'
                      : `${surface.border} ${surface.hoverBg} ${surface.textPrimary}`
                  )}
                  style={isActive ? { backgroundColor: accentColor } : undefined}
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-[18px]',
                      isActive ? 'bg-white/16' : surface.subtleBg
                    )}
                  >
                    <item.icon
                      className={cn('h-5 w-5', isActive ? 'text-white' : surface.textSecondary)}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span
                      className={cn(
                        'mt-1 block text-xs',
                        isActive ? 'text-white/74' : surface.textSecondary
                      )}
                    >
                      {item.section === 'home' ? t('sidebar.backToHome') : t('sidebar.orbit')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {activeSection === 'home' && currentRoomNavigation ? (
          <section className="space-y-2 pt-1">
            <p
              className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              {t('sidebar.currentRoom')}
            </p>
            <div
              className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 ${surface.border} ${surface.hoverBg}`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {currentRoomNavigation.activeRoom === 'All'
                    ? t('dashboard.roomNav.all')
                    : currentRoomNavigation.activeRoom}
                </p>
                <p className={`mt-0.5 text-xs ${surface.textSecondary}`}>
                  {t('dashboard.roomNav.openRooms')}
                </p>
              </div>
              <MobileRoomDropdown navigation={currentRoomNavigation} />
            </div>
          </section>
        ) : activeSection !== 'home' ? (
          <section className="pt-1">
            <Button
              variant="secondary"
              size="small"
              leading={<ArrowLeft className="h-4 w-4 shrink-0" />}
              onClick={() => handleSelectSection('home')}
              className={`w-full justify-start rounded-[18px] ${surface.textPrimary}`}
            >
              {t('sidebar.backToHome')}
            </Button>
          </section>
        ) : null}
      </div>
    </SheetSurface>
  );
});
