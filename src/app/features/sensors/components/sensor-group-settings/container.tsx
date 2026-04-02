import { memo } from 'react';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import { CustomScrollbar } from '@/app/components/shared/device-editor';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { iconMap } from '../sensors';
import { SENSOR_GROUP_COLOR_MAP } from './data';
import type { SensorGroupSettingsDialogProps } from './types';
import { useSensorGroupSettings } from './use-sensor-group-settings';
import { SensorGroupSettingsView } from './view';

export const SensorGroupSettingsContainer = memo(function SensorGroupSettingsContainer({
  entityId,
  isOpen,
  onClose,
  groupName,
  currentSensors,
  maxSensors,
  accentColor,
  onSensorsUpdate,
}: SensorGroupSettingsDialogProps) {
  const colors = SENSOR_GROUP_COLOR_MAP[accentColor];
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const controller = useSensorGroupSettings({
    currentSensors,
    maxSensors,
    onClose,
    onSensorsUpdate,
  });

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          controller.handleCancel();
        }
      }}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName="fixed top-1/2 left-1/2 z-50 h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl animate-in fade-in zoom-in duration-200"
    >
      <SensorGroupSettingsView
        entityId={entityId}
        groupName={groupName}
        selectedSensors={controller.selectedSensors}
        maxSensors={maxSensors}
        searchQuery={controller.searchQuery}
        setSearchQuery={controller.setSearchQuery}
        isDropdownOpen={controller.isDropdownOpen}
        setIsDropdownOpen={controller.setIsDropdownOpen}
        highlightedIndex={controller.highlightedIndex}
        setHighlightedIndex={controller.setHighlightedIndex}
        inputRef={controller.inputRef}
        colors={colors}
        theme={theme}
        filteredSensors={controller.filteredSensors}
        iconMap={iconMap}
        handleAddSensor={controller.handleAddSensor}
        handleRemoveSensor={controller.handleRemoveSensor}
        handleSave={controller.handleSave}
        handleCancel={controller.handleCancel}
        isSensorSelected={controller.isSensorSelected}
        CustomScrollbar={CustomScrollbar}
      />
    </DialogShell>
  );
});
