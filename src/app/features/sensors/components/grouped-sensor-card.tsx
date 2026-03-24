import { Gauge } from 'lucide-react';
import { memo } from 'react';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { SensorGroupSettingsDialog } from './sensor-group-settings';
import {
  darkColorMap,
  GridSensorDisplay,
  iconMap,
  lightColorMap,
  type SensorReading,
  SmallSensorDisplay,
  useSensorGroup,
} from './sensors';

interface GroupedSensorCardProps {
  id: string;
  name: string;
  room: string;
  sensors: SensorReading[];
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  accentColor?: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';
}

export const GroupedSensorCard = memo(function GroupedSensorCard({
  id,
  name,
  room: _room,
  sensors,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
  accentColor = 'teal',
}: GroupedSensorCardProps) {
  const {
    selectedSensors,
    isSettingsOpen,
    setIsSettingsOpen,
    handleSensorsUpdate,
    visibleSensors,
  } = useSensorGroup({ initialSensors: sensors });
  const { theme } = useTheme();
  const { t } = useI18n();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);

  // Size-specific styling with intelligent layout adaptation
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const padding = isSmall ? 'p-4' : 'p-5';

  const colors = theme === 'light' ? lightColorMap[accentColor] : darkColorMap[accentColor];
  const shell = getAccentCardShellTokens(theme, accentColor);
  const textPrimary = surface.textPrimary;
  const textSecondary = surface.textSubtle;

  // Get primary icon (first sensor's icon or default)
  const PrimaryIcon = selectedSensors[0]?.icon ? iconMap[selectedSensors[0].icon] : Gauge;

  // Maximum 4 sensors allowed
  const MAX_SENSORS = 4;

  return (
    <div className="h-full w-full relative">
      <button
        type="button"
        onClick={() => setIsSettingsOpen(true)}
        className={`relative h-full w-full ${cardShell.backdropClassName} rounded-3xl ${padding} overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform text-left ${shell.containerClassName}`}
      >
        <div className={`absolute inset-0 ${shell.glowClassName}`}></div>
        {shell.overlayClassName && <div className={`absolute inset-0 ${shell.overlayClassName}`} />}

        <div className="relative h-full flex flex-col">
          <EntityCardHeader
            title={name}
            subtitle={t('sensors.group')}
            size={size}
            tone={accentColor}
            leading={
              <EntityCardHeaderIcon
                IconComponent={PrimaryIcon}
                isActive={true}
                size={size}
                tone={accentColor}
              />
            }
          />

          {/* Sensor Grid */}
          <div className="flex-1 flex items-end min-h-0">
            {isSmall ? (
              <SmallSensorDisplay
                sensors={visibleSensors}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            ) : (
              <GridSensorDisplay
                sensors={visibleSensors}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                colors={colors}
                isMedium={isMedium}
              />
            )}
          </div>
        </div>
      </button>

      {isSettingsOpen ? (
        <SensorGroupSettingsDialog
          entityId={id}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          groupName={name}
          currentSensors={selectedSensors}
          maxSensors={MAX_SENSORS}
          accentColor={accentColor}
          onSensorsUpdate={handleSensorsUpdate}
        />
      ) : null}
    </div>
  );
});
