import { useEntityCardInteractionController } from '@navet/app/components/shared/entity-card-interaction-controller';
import { useCallback } from 'react';

interface UseLightCardInteractionParams {
  name: string;
  isOn: boolean;
  isEditMode: boolean;
  isSmall: boolean;
  cardTapAction?: 'toggle' | 'controls';
  toggleLightState: (nextIsOn: boolean) => void;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLightCardInteraction({
  name,
  isOn,
  isEditMode,
  isSmall,
  cardTapAction,
  toggleLightState,
  setIsOpen,
}: UseLightCardInteractionParams) {
  const handleSettingsClick = useCallback(() => setIsOpen(true), [setIsOpen]);

  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: name,
    ariaPressed: isOn,
    isEditMode,
    cardTapAction,
    onToggle: () => toggleLightState(!isOn),
    onOpenControls: handleSettingsClick,
    onOpenSettings: handleSettingsClick,
  });

  const showSettingsButton =
    cardTapAction !== 'controls' && cardInteraction.interactionMode !== 'control-first';
  const showPresetOverflow = showSettingsButton || isSmall;

  return {
    cardInteraction,
    showPresetOverflow,
    showSettingsButton,
  };
}
