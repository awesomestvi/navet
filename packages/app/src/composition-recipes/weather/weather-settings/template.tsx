import { WeatherSettingsDialog } from '@navet/app/features/weather/components/weather-card/weather-settings-dialog';
import type { ComponentProps, RefObject } from 'react';

export type WeatherSettingsProps = Omit<
  ComponentProps<typeof WeatherSettingsDialog>,
  'onCloseAutoFocus'
> & {
  returnFocusRef: RefObject<HTMLElement | null>;
};

// Reuse the product's forecast choices, metric limits, translations and appearance controls.
export function WeatherSettings({ returnFocusRef, ...props }: WeatherSettingsProps) {
  return (
    <WeatherSettingsDialog
      {...props}
      onCloseAutoFocus={(event) => {
        if (returnFocusRef.current?.isConnected) {
          event.preventDefault();
          returnFocusRef.current.focus();
        }
      }}
    />
  );
}
