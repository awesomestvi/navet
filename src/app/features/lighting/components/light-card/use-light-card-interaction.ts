import { useCallback } from 'react';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';

interface UseLightCardInteractionParams {
  name: string;
  isOn: boolean;
  isEditMode: boolean;
  isSmall: boolean;
  toggleLightState: (nextIsOn: boolean) => void;
  lightTypeLabel: string;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLightCardInteraction({
  name,
  isOn,
  isEditMode,
  isSmall,
  toggleLightState,
  lightTypeLabel,
  setIsOpen,
}: UseLightCardInteractionParams) {
  const handleSettingsClick = useCallback(() => setIsOpen(true), [setIsOpen]);

  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: `${name} ${lightTypeLabel.toLowerCase()}`,
    ariaPressed: isOn,
    isEditMode,
    onToggle: () => toggleLightState(!isOn),
    onOpenControls: handleSettingsClick,
    onOpenSettings: handleSettingsClick,
  });

  const showSettingsButton = cardInteraction.interactionMode !== 'control-first';
  const showPresetOverflow = showSettingsButton || isSmall;

  return {
    cardInteraction,
    showPresetOverflow,
    showSettingsButton,
  };
}
