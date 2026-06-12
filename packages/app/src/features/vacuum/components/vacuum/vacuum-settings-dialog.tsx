import {
  CardDialogBody,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { Button, DialogFooter, ModalSurface } from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@navet/app/components/shared/device-editor';
import {
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
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
  onStartCleaning,
  onStartAreaCleaning,
  onReturnHome,
  onLocate,
  onCleanSpot,
  onSetFanSpeed,
  name,
  theme,
  accentColorValue,
  currentStatus = 'idle',
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
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const isActive =
    currentStatus === 'cleaning' || currentStatus === 'mopping' || currentStatus === 'returning';
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
        backgroundColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.14 : 0.18),
        borderColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.24 : 0.34),
        boxShadow: `inset 0 0 0 1px ${withTintAlpha(activeControlColor, theme === 'light' ? 0.14 : 0.2)}`,
      }
    : sectionStyle;
  const softControlStyle = activeControlColor
    ? {
        backgroundColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.08 : 0.12),
        borderColor: withTintAlpha(activeControlColor, theme === 'light' ? 0.16 : 0.22),
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
      bodyClassName="p-6 max-sm:px-3.5 max-sm:pt-2 max-sm:pb-3"
      overlayClassName={surface.dialogBackdrop}
      contentClassName="h-auto max-h-[85vh] max-w-md"
    >
      <CustomScrollbar isOn={isActive} className="max-sm:min-h-0 max-sm:flex-1">
        <CardDialogBody className="p-0">
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={handleTabChange}>
            <CardDialogTabList>
              {shouldShowControlsTab ? (
                <CardDialogTabTrigger
                  active={activeTab === 'controls'}
                  icon={Sliders}
                  onClick={() => setActiveTab('controls')}
                >
                  {t('common.controls')}
                </CardDialogTabTrigger>
              ) : null}
              {shouldShowMapTab ? (
                <CardDialogTabTrigger
                  active={activeTab === 'map'}
                  icon={MapIcon}
                  onClick={() => setActiveTab('map')}
                >
                  {t('vacuum.settings.map')}
                </CardDialogTabTrigger>
              ) : null}
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                {t('common.customize')}
              </CardDialogTabTrigger>
            </CardDialogTabList>

            {shouldShowControlsTab ? (
              <TabPanel value="controls" className="mt-5 space-y-5">
                <VacuumCleaningControls
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
                  activePillStyle={activePillStyle}
                />
              </TabPanel>
            ) : null}

            {shouldShowMapTab ? (
              <TabPanel value="map" className="mt-5">
                <CardDialogSection className="mb-0">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-white">
                      {t('vacuum.settings.plan')}
                    </div>
                  </div>
                  <VacuumPlannerSection
                    availableAreas={cleaningAreas}
                    selectedAreaIds={selectedAreaIds}
                    onSelectedAreaIdsChange={setSelectedAreaIds}
                    canOrderAreaCleaning={capabilities?.canOrderAreaCleaning ?? false}
                  />
                </CardDialogSection>
              </TabPanel>
            ) : null}

            <TabPanel value="card" className="mt-5">
              <CustomCardTintPicker
                value={resolvedTintColor}
                onChange={handleTintChange}
                isOn={theme !== 'light'}
                defaultColor={accentColorValue}
              />
            </TabPanel>
          </Tabs>

          <DialogFooter>
            <Button
              variant="secondary"
              size="small"
              onClick={handlePlannerStart}
              className={theme !== 'light' ? 'border-white/10 bg-white/8 hover:bg-white/12' : ''}
              style={softControlStyle}
            >
              {t('vacuum.action.startCleaning')}
            </Button>
            <Button variant="soft" size="small" onClick={onClose}>
              {t('common.done')}
            </Button>
          </DialogFooter>
        </CardDialogBody>
      </CustomScrollbar>
    </ModalSurface>
  );
});
