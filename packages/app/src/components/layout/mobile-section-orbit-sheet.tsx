import { SheetSurface, SheetSurfaceHeader } from '@navet/app/components/primitives';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getInteractivePillStyles } from '@navet/app/components/shared/theme/interactive-pill-styles';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { type Section, useI18n, useTheme } from '@navet/app/hooks';
import { type LucideIcon, Pencil, Plus } from 'lucide-react';
import { memo, useMemo } from 'react';
import { getOrderedSectionNavigationItems, MOBILE_SECTION_ORBIT_ORDER } from './section-navigation';

interface MobileSectionOrbitSheetProps {
  activeSection: Section;
  customItems?: Array<{
    id: string;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    onEdit?: () => void;
    section?: Section;
  }>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomizeSidebar?: () => void;
  onSelectSection: (section: Section) => void;
}

export const MobileSectionOrbitSheet = memo(function MobileSectionOrbitSheet({
  activeSection,
  customItems = [],
  isOpen,
  onOpenChange,
  onCustomizeSidebar,
  onSelectSection,
}: MobileSectionOrbitSheetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const orbitEditButtonStyles = useMemo(
    () =>
      getInteractivePillStyles({
        accentColor,
        isActive: false,
        primaryColor,
        theme,
        variant: 'default',
      }),
    [accentColor, primaryColor, theme]
  );
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
                  className="h-[38px] w-full justify-start [&_svg]:h-4 [&_svg]:w-4"
                >
                  <span className="truncate">{item.label}</span>
                </InteractivePill>
              );
            })}
            {customItems.length > 0 ? (
              <div
                aria-hidden="true"
                className={`col-span-2 my-1 h-px w-full rounded-full ${
                  theme === 'light' ? 'bg-slate-300/90' : 'bg-white/14'
                }`}
              />
            ) : null}
            {customItems.map((item) => {
              const isActive = item.section ? activeSection === item.section : false;

              return (
                <div key={item.id} className="relative">
                  <InteractivePill
                    type="button"
                    active={isActive}
                    icon={item.icon}
                    intent="navigation"
                    size="small"
                    onClick={() => {
                      item.onClick();
                      onOpenChange(false);
                    }}
                    className="h-[38px] w-full justify-start pr-9 [&_svg]:h-4 [&_svg]:w-4"
                  >
                    <span className="truncate">{item.label}</span>
                  </InteractivePill>
                  {item.onEdit ? (
                    <button
                      type="button"
                      aria-label={`Edit ${item.label}`}
                      title={`Edit ${item.label}`}
                      className={`absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full ${orbitEditButtonStyles.className}`}
                      style={orbitEditButtonStyles.style}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        item.onEdit?.();
                        onOpenChange(false);
                      }}
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {onCustomizeSidebar ? (
              <InteractivePill
                type="button"
                active={false}
                icon={Plus}
                intent="navigation"
                size="small"
                onClick={onCustomizeSidebar}
                className="h-[38px] w-full justify-start [&_svg]:h-4 [&_svg]:w-4"
              >
                <span className="truncate">Customize sidebar</span>
              </InteractivePill>
            ) : null}
          </div>
        </section>
      </div>
    </SheetSurface>
  );
});
