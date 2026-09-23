import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { SecurityCameraDashboard } from '@navet/app/features/security/components/security-camera-dashboard';
import { buildSecurityCameraDashboardModel } from '@navet/app/features/security/utils/security-camera-dashboard-model';
import { useTheme } from '@navet/app/hooks';
import { useEditModeStore } from '@navet/app/stores/edit-mode-store';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import { useState } from 'react';
import type { CameraDevice, LockDevice, SensorDevice } from '../types/device.types';

interface DemoSecurityShotProps {
  cameras: CameraDevice[];
  locks: LockDevice[];
  sensors: SensorDevice[];
  alarms: NavetAlarmEntity[];
}

export function DemoSecurityShot({ cameras, locks, sensors, alarms }: DemoSecurityShotProps) {
  const isEditMode = useEditModeStore((state) => state.isEditMode);
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>({});
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const model = buildSecurityCameraDashboardModel({ cameras, locks, sensors });

  return (
    <SecurityCameraDashboard
      model={model}
      isEditMode={isEditMode}
      alarms={alarms}
      cardSizes={cardSizes}
      updateCardSize={(id, size) => setCardSizes((previous) => ({ ...previous, [id]: size }))}
      surface={surface}
    />
  );
}
