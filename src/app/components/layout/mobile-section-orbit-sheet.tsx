import { memo, useMemo } from 'react';
import { SheetSurface, SheetSurfaceHeader } from '@/app/components/primitives';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type Section, useI18n, useTheme } from '@/app/hooks';
import { getOrderedSectionNavigationItems, MOBILE_SECTION_ORBIT_ORDER } from './section-navigation';

interface MobileSectionOrbitSheetProps {
  activeSection: Section;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSection: (section: Section) => void;
}

export const MobileSectionOrbitSheet = memo(function MobileSectionOrbitSheet({
  activeSection,
  isOpen,
  onOpenChange,
  onSelectSection,
}: MobileSectionOrbitSheetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const orbitItems = useMemo(
    () => getOrderedSectionNavigationItems(t, MOBILE_SECTION_ORBIT_ORDER),
    [t]
  );

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
      <div className="space-y-3 pb-1">
        <SheetSurfaceHeader
          eyebrow={t('sidebar.orbit')}
          title={t('sidebar.orbitTitle')}
          description={t('sidebar.orbitDescription')}
          closeLabel={t('common.close')}
          onClose={() => onOpenChange(false)}
        />

        <section>
          <div className="grid grid-cols-2 gap-2">
            {orbitItems.map((item) => {
              const isActive = activeSection === item.section;

              return (
                <InteractivePill
                  key={item.section}
                  type="button"
                  active={isActive}
                  icon={item.icon}
                  intent="navigation"
                  size="small"
                  onClick={() => handleSelectSection(item.section)}
                  className="w-full justify-start"
                >
                  <span className="truncate">{item.label}</span>
                </InteractivePill>
              );
            })}
          </div>
        </section>
      </div>
    </SheetSurface>
  );
});
