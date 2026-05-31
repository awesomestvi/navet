import {
  CardDialogBody,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@navet/app/components/primitives/dialog-shell';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@navet/app/components/shared/device-editor';
import { getCustomCardTintSurface } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { type LucideIcon, Palette, Sliders } from 'lucide-react';
import type { ReactNode } from 'react';

export interface CardSettingsDialogTab {
  key: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

export interface CardSettingsDialogProps {
  /** Dialog open state */
  isOpen: boolean;
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Card/entity title */
  title: string;
  /** Entity ID (e.g., 'light.living_room') */
  entityId?: string;
  /** Entity type label (e.g., 'Light') */
  entityType?: string;
  /** Tabs to render */
  tabs: CardSettingsDialogTab[];
  /** Custom tint color */
  tintColor?: string;
  /** Called when custom tint changes */
  onTintColorChange?: (color: string) => void;
  /** Default accent color for tint picker */
  defaultTintAccent?: string;
  /** Theme type */
  theme: ThemeType;
  /** Additional content after tabs */
  footerContent?: ReactNode;
  /** Disable open auto focus */
  disableOpenAutoFocus?: boolean;
  /** Max width of dialog */
  maxWidth?: 'sm' | 'md' | 'lg';
}

/**
 * CardSettingsDialog provides a standardized settings dialog for card configuration.
 *
 * Features:
 * - Consistent header with entity info
 * - Tabbed interface (Controls, Customize)
 * - Built-in custom tint picker
 * - Standard done footer
 * - Surface theming integration
 */
export function CardSettingsDialog({
  isOpen,
  onOpenChange,
  title,
  entityId,
  entityType,
  tabs,
  tintColor,
  theme,
  footerContent,
  disableOpenAutoFocus = false,
  maxWidth = 'md',
}: CardSettingsDialogProps) {
  const surface = getThemeSurfaceTokens(theme);
  const resolvedTintSurface = getCustomCardTintSurface(theme, tintColor);
  const dialogShell = customCardDialogShellProps(surface, resolvedTintSurface, {
    maxWidth,
    padding: false,
  });

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus={disableOpenAutoFocus}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <CustomScrollbar isOn={theme !== 'light'} className="max-sm:min-h-0 max-sm:flex-1">
        <CardDialogBody>
          <CardDialogHeader title={title} description={entityType} entityId={entityId} />

          <Tabs value={tabs[0]?.key} defaultValue={tabs[0]?.key}>
            <CardDialogTabList>
              {tabs.map((tab) => (
                <CardDialogTabTrigger
                  key={tab.key}
                  active={false}
                  icon={tab.icon}
                  onClick={() => {}}
                >
                  {tab.label}
                </CardDialogTabTrigger>
              ))}
            </CardDialogTabList>

            {tabs.map((tab) => (
              <TabPanel key={tab.key} value={tab.key}>
                {tab.content}
              </TabPanel>
            ))}
          </Tabs>

          {footerContent ? (
            <div className="mt-4">{footerContent}</div>
          ) : (
            <DialogDoneFooter label="common.done" />
          )}
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
}

export interface CardSettingsDialogWithStateProps extends Omit<CardSettingsDialogProps, 'tabs'> {
  /** Controls tab content */
  controlsTabContent: ReactNode;
  /** Customize tab content (optional, shows tint picker if provided) */
  customizeTabContent?: ReactNode;
  /** Additional tabs */
  extraTabs?: CardSettingsDialogTab[];
}

/**
 * CardSettingsDialogWithState provides a simpler API for common two-tab dialogs.
 * Automatically creates "Controls" and "Customize" tabs with managed state.
 */
export function CardSettingsDialogWithState({
  controlsTabContent,
  customizeTabContent,
  extraTabs = [],
  ...props
}: CardSettingsDialogWithStateProps) {
  const { t } = useI18n();

  const tabs: CardSettingsDialogTab[] = [
    {
      key: 'controls',
      label: t('common.open'),
      icon: Sliders,
      content: controlsTabContent,
    },
    ...(customizeTabContent || props.onTintColorChange
      ? [
          {
            key: 'card',
            label: t('common.cardUnavailable'),
            icon: Palette,
            content: (
              <>
                {customizeTabContent}
                {props.onTintColorChange ? (
                  <CardDialogSection>
                    <CustomCardTintPicker
                      value={props.tintColor}
                      onChange={props.onTintColorChange}
                      defaultColor={props.defaultTintAccent ?? '#3b82f6'}
                      className={getThemeSurfaceTokens(props.theme).textMuted}
                    />
                  </CardDialogSection>
                ) : null}
              </>
            ),
          } as CardSettingsDialogTab,
        ]
      : []),
    ...(extraTabs || []),
  ];

  return <CardSettingsDialog {...props} tabs={tabs} />;
}
