import { BaseCardDialog } from '@navet/app/components/primitives';
import {
  getAccentDialogSurface,
  type PresetPrimaryColor,
} from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { memo } from 'react';
import { iconMap } from '../sensors';
import { SENSOR_GROUP_COLOR_MAP } from './data';
import type { SensorGroupSettingsDialogProps } from './types';
import { useSensorGroupSettings } from './use-sensor-group-settings';
import { SensorGroupSettingsView } from './view';

const SENSOR_DIALOG_COLOR: Record<
  SensorGroupSettingsDialogProps['accentColor'],
  PresetPrimaryColor
> = {
  amber: 'yellow',
  blue: 'blue',
  emerald: 'green',
  purple: 'purple',
  teal: 'teal',
};

export const SensorGroupSettingsContainer = memo(function SensorGroupSettingsContainer({
  isOpen,
  onClose,
  groupName,
  roomValue,
  roomLabel,
  roomOptions,
  currentSensors,
  maxSensors,
  accentColor,
  availableSensors,
  showRoomSelector = true,
  onNameChange,
  onRoomChange,
  onSensorsUpdate,
}: SensorGroupSettingsDialogProps) {
  const colors = SENSOR_GROUP_COLOR_MAP[accentColor];
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const activeDialogColors = getAccentDialogSurface(SENSOR_DIALOG_COLOR[accentColor]);
  const dialogContentClassName = `max-h-[calc(100dvh-1rem)] min-w-0 max-w-[calc(100vw-1rem)] animate-in fade-in zoom-in duration-200 bg-linear-to-br ${activeDialogColors.from} ${activeDialogColors.to} ${activeDialogColors.border}`;
  const controller = useSensorGroupSettings({
    currentSensors,
    maxSensors,
    onClose,
    onSensorsUpdate,
    availableSensors,
  });

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          controller.handleCancel();
        }
      }}
      title={groupName}
      description="Widget"
      theme={theme}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      maxWidth="md"
      height="capped"
      bodyPadding={false}
      contentClassName={dialogContentClassName}
      bodyClassName="min-h-0 min-w-0 overflow-hidden"
    >
      <SensorGroupSettingsView
        groupName={groupName}
        roomValue={roomValue}
        roomLabel={roomLabel}
        roomOptions={roomOptions}
        showRoomSelector={showRoomSelector}
        onNameChange={onNameChange}
        onRoomChange={onRoomChange}
        selectedSensors={controller.selectedSensors}
        maxSensors={maxSensors}
        searchQuery={controller.searchQuery}
        setSearchQuery={controller.setSearchQuery}
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
        isSensorSelected={controller.isSensorSelected}
      />
    </BaseCardDialog>
  );
});
