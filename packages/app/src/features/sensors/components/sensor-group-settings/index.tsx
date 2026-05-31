import { memo } from 'react';
import { SensorGroupSettingsContainer } from './container';
import type { SensorGroupSettingsDialogProps } from './types';

export const SensorGroupSettingsDialog = memo(function SensorGroupSettingsDialog(
  props: SensorGroupSettingsDialogProps
) {
  return <SensorGroupSettingsContainer {...props} />;
});
