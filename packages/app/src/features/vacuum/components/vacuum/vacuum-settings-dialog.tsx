import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { Button, coverSheetHeaderClassName, ModalSurface } from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomCardTintPicker } from '@navet/app/components/shared/device-editor';
import {
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { Map as MapIcon, Palette, Sliders } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { hasVacuumDialogControls, VacuumCleaningControls } from './vacuum-cleaning-controls';
import type { VacuumCleaningArea } from './vacuum-features';
import { VacuumPlannerSection } from './vacuum-planner-section';
import type { VacuumStatus } from './vacuum-utils';

const DEFAULT_VACUUM_ACCENT_COLOR = '#06b6d4';
type VacuumSettingsTab = 'controls' | 'map' | 'card';

function isVacuumSettingsTab(value: string): value is VacuumSettingsTab {
  return value === 'controls' || value === 'map' || value === 'card';
}

function getDefaultVacuumSettingsTab({
  shouldShowControlsTab,
  shouldShowMapTab,
}: {
  shouldShowControlsTab: boolean;
  shouldShowMapTab: boolean;
}): VacuumSettingsTab {
  if (shouldShowControlsTab) {
    return 'controls';
  }

  if (shouldShowMapTab) {
    return 'map';
  }

  return 'card';
}

interface VacuumSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
  isLawnMower?: boolean;
  onStartCleaning: () => void;
  onStartAreaCleaning?: (areaIds: string[]) => void;
  onPauseCleaning?: () => void;
  onStopCleaning?: () => void;
  onReturnHome: () => void;
  onLocate?: () => void;
  onCleanSpot?: () => void;
  onSetFanSpeed?: (fanSpeed: string) => void;
  name: string;
  room: string;
  theme: ThemeType;
  accentColorValue: string;
  currentStatus?: VacuumStatus;
  fanSpeed?: string;
  fanSpeeds?: string[];
  supportsFanSpeed?: boolean;
  isUpdatingFanSpeed?: boolean;
  capabilities?: import('./vacuum-features').VacuumCapabilities;
  availableCleaningAreas?: VacuumCleaningArea[];
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export const VacuumSettingsDialog = memo(function VacuumSettingsDialog({
  entityId,
  isOpen,
  onClose,
  isLawnMower = false,
  onStartCleaning,
  onStartAreaCleaning,
  onReturnHome,
  onLocate,
  onCleanSpot,
  onSetFanSpeed,
  name,
  room,
  theme,
  accentColorValue,
  fanSpeed,
  fanSpeeds,
  supportsFanSpeed = true,
  isUpdatingFanSpeed = false,
  capabilities,
  availableCleaningAreas,
  tintColor,
  onTintColorChange,
}: VacuumSettingsDialogProps) {
  const { t } = useI18n();
  const startActionLabel = t(
    isLawnMower ? 'lawnMower.action.startMowing' : 'vacuum.action.startCleaning'
  );
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const cleaningAreas = useMemo(
    () => availableCleaningAreas ?? capabilities?.availableCleaningAreas ?? [],
    [availableCleaningAreas, capabilities?.availableCleaningAreas]
  );
  const shouldShowMapTab = (capabilities?.canShowMap ?? false) || cleaningAreas.length > 0;
  const speedOptions = useMemo(() => {
    if (!supportsFanSpeed) {
      return [];
    }

    return fanSpeeds?.length
      ? fanSpeeds
      : [t('vacuum.speed.quiet'), t('vacuum.speed.standard'), t('vacuum.speed.max')];
  }, [fanSpeeds, supportsFanSpeed, t]);
  const shouldShowControlsTab = hasVacuumDialogControls({
    supportsFanSpeed,
    fanSpeedOptions: speedOptions,
    capabilities,
  });
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [selectedFanSpeed, setSelectedFanSpeed] = useState<string>(
    fanSpeed ?? speedOptions[1] ?? speedOptions[0] ?? ''
  );
  const [localTintColor, setLocalTintColor] = useState<string>(tintColor ?? accentColorValue);
  const [activeTab, setActiveTab] = useState<VacuumSettingsTab>(() =>
    getDefaultVacuumSettingsTab({ shouldShowControlsTab, shouldShowMapTab })
  );
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    setSelectedFanSpeed(fanSpeed ?? speedOptions[1] ?? speedOptions[0] ?? '');
  }, [fanSpeed, speedOptions]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;

    if (isOpen && !wasOpen) {
      setSelectedAreaIds([]);
      setSelectedFanSpeed(fanSpeed ?? speedOptions[1] ?? speedOptions[0] ?? '');
      setLocalTintColor(tintColor ?? accentColorValue);
      setActiveTab(getDefaultVacuumSettingsTab({ shouldShowControlsTab, shouldShowMapTab }));
    }

    wasOpenRef.current = isOpen;
  }, [
    accentColorValue,
    fanSpeed,
    isOpen,
    shouldShowControlsTab,
    shouldShowMapTab,
    speedOptions,
    tintColor,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (activeTab === 'controls' && !shouldShowControlsTab) {
      setActiveTab(shouldShowMapTab ? 'map' : 'card');
      return;
    }

    if (activeTab === 'map' && !shouldShowMapTab) {
      setActiveTab(shouldShowControlsTab ? 'controls' : 'card');
    }
  }, [activeTab, isOpen, shouldShowControlsTab, shouldShowMapTab]);

  const resolvedTintColor =
    normalizeCustomCardTint(tintColor) ?? normalizeCustomCardTint(localTintColor);
  const sectionStyle = getInheritedDialogSectionStyle(theme, resolvedTintColor, accentColorValue);
  const activeControlColor =
    resolvedTintColor ?? normalizeCustomCardTint(accentColorValue) ?? DEFAULT_VACUUM_ACCENT_COLOR;
  const activePillStyle = activeControlColor
    ? {
        backgroundColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.14 : 0.22),
        borderColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.24 : 0.42),
        color: theme === 'light' ? undefined : withTintAlpha(activeControlColor, 0.96),
        boxShadow: `inset 0 0 0 1px ${withTintAlpha(activeControlColor, theme === 'light' ? 0.14 : 0.26)}`,
      }
    : sectionStyle;
  const softControlStyle = activeControlColor
    ? {
        backgroundColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.08 : 0.14),
        borderColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.16 : 0.26),
        color: theme === 'light' ? undefined : withTintAlpha(activeControlColor, 0.92),
      }
    : sectionStyle;
  const handleTintChange = (color: string) => {
    setLocalTintColor(color);
    onTintColorChange?.(color);
  };

  const handleTabChange = (nextTab: string) => {
    if (isVacuumSettingsTab(nextTab)) {
      setActiveTab(nextTab);
    }
  };

  const handlePlannerStart = () => {
    if (selectedAreaIds.length > 0) {
      onStartAreaCleaning?.(selectedAreaIds);
      onClose();
      return;
    }

    onStartCleaning();
    onClose();
  };

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={name}
      description={entityType}
      disableOpenAutoFocus
      mobileCoverSheet
      bodyClassName="vacuum-settings-dialog-body relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      overlayClassName={surface.dialogBackdrop}
      contentClassName="flex h-auto max-h-[85vh] max-w-md flex-col"
    >
      <Tabs value={activeTab} defaultValue="controls" onValueChange={handleTabChange}>
        <header
          data-card-dialog-header
          className={cn(
            coverSheetHeaderClassName,
            'shrink-0 border-b max-sm:pt-2 max-sm:pr-4',
            surface.border
          )}
        >
          <CardDialogHeader
            title={name}
            description={entityType}
            entityId={entityId}
            roomSelectorFallbackRoomName={room}
            theme={theme}
            className="mb-0 max-sm:pr-0"
          />

          <CardDialogTabList className="mt-3 mb-0 flex flex-wrap gap-2">
            {shouldShowControlsTab ? (
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                accentColor={activeControlColor}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                {t('common.controls')}
              </CardDialogTabTrigger>
            ) : null}
            {shouldShowMapTab ? (
              <CardDialogTabTrigger
                active={activeTab === 'map'}
                accentColor={activeControlColor}
                icon={MapIcon}
                onClick={() => setActiveTab('map')}
              >
                {t('vacuum.settings.map')}
              </CardDialogTabTrigger>
            ) : null}
            <CardDialogTabTrigger
              active={activeTab === 'card'}
              accentColor={activeControlColor}
              icon={Palette}
              onClick={() => setActiveTab('card')}
            >
              {t('common.customize')}
            </CardDialogTabTrigger>
          </CardDialogTabList>
        </header>

        <CardDialogBody>
          {shouldShowControlsTab ? (
            <TabPanel value="controls" className="space-y-5">
              <VacuumCleaningControls
                isLawnMower={isLawnMower}
                fanSpeed={selectedFanSpeed}
                onFanSpeedChange={(speed) => {
                  setSelectedFanSpeed(speed);
                  onSetFanSpeed?.(speed);
                }}
                fanSpeedOptions={speedOptions}
                supportsFanSpeed={supportsFanSpeed}
                isUpdatingFanSpeed={isUpdatingFanSpeed}
                onReturnHome={onReturnHome}
                onLocate={onLocate}
                onCleanSpot={onCleanSpot}
                capabilities={capabilities}
                accentColor={activeControlColor}
              />
            </TabPanel>
          ) : null}

          {shouldShowMapTab ? (
            <TabPanel value="map">
              <CardDialogSection className="mb-0">
                <div className="mb-0">
                  <div className="text-sm font-medium text-white">{t('vacuum.settings.plan')}</div>
                </div>
                <VacuumPlannerSection
                  availableAreas={cleaningAreas}
                  selectedAreaIds={selectedAreaIds}
                  onSelectedAreaIdsChange={setSelectedAreaIds}
                  canOrderAreaCleaning={capabilities?.canOrderAreaCleaning ?? false}
                  accentColor={activeControlColor}
                  activePillStyle={activePillStyle}
                />
              </CardDialogSection>
            </TabPanel>
          ) : null}

          <TabPanel value="card">
            <CustomCardTintPicker
              value={resolvedTintColor}
              onChange={handleTintChange}
              isOn={theme !== 'light'}
              defaultColor={accentColorValue}
            />
          </TabPanel>

          <CardDialogFooter className="mt-6 items-center justify-end gap-2">
            <Button variant="soft" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="secondary"
              onClick={handlePlannerStart}
              className={theme !== 'light' ? 'border-white/10 bg-white/8 hover:bg-white/12' : ''}
              style={softControlStyle}
            >
              {startActionLabel}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </Tabs>
    </ModalSurface>
  );
});
