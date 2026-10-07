import { useTheme } from '@navet/app/hooks';
import { BaseCardDialog } from '@navet/app/ui-kit/primitives';
import { Settings2, Sliders } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';

export interface ControlsFirstDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  controlsLabel: string;
  settingsLabel: string;
  controls: ReactNode;
  settings: ReactNode;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function ControlsFirstDialog({
  isOpen,
  onOpenChange,
  title,
  controlsLabel,
  settingsLabel,
  controls,
  settings,
  returnFocusRef,
}: ControlsFirstDialogProps) {
  const { theme } = useTheme();
  return (
    <BaseCardDialog
      variant="card"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={(event) => {
        if (returnFocusRef.current?.isConnected) {
          event.preventDefault();
          returnFocusRef.current.focus();
        }
      }}
      title={title}
      theme={theme}
      navigation="overflow"
      height="capped"
      tabs={[
        { key: 'controls', label: controlsLabel, icon: Sliders, content: controls },
        { key: 'settings', label: settingsLabel, icon: Settings2, content: settings },
      ]}
    />
  );
}
