import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { DEVICE_CLASS_CONFIG } from './constants';
import type { CoverCardProps, CoverState, DeviceClass } from './types';
import { CoverCardView } from './view';

export const CoverCardContainer = memo(function CoverCardContainer({
  id,
  name,
  room,
  initialPosition = 0,
  initialDeviceClass = 'blind',
  size,
  onSizeChange,
  isEditMode,
}: CoverCardProps) {
  const [position, setPosition] = useState(initialPosition);
  const [deviceClass, setDeviceClass] = useState<DeviceClass>(initialDeviceClass);
  const [coverState, setCoverState] = useState<CoverState>(
    initialPosition === 100 ? 'open' : initialPosition === 0 ? 'closed' : 'open'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const movementRef = useRef<number | null>(null);
  const { t } = useI18n();

  const stopMovement = useCallback(() => {
    if (movementRef.current !== null) {
      clearInterval(movementRef.current);
      movementRef.current = null;
    }
  }, []);

  useEffect(() => stopMovement, [stopMovement]);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));

  useEffect(() => {
    if (!liveEntity) return;
    const attrs = liveEntity.attributes as Record<string, unknown>;
    const livePosition = typeof attrs.current_position === 'number' ? attrs.current_position : null;
    if (livePosition !== null) {
      setPosition(livePosition);
    }
    const liveState = liveEntity.state as CoverState;
    if (['open', 'closed', 'opening', 'closing'].includes(liveState)) {
      setCoverState(liveState);
    }
  }, [liveEntity]);
  const { colors, theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  // Used by the large-card slider for direct position setting.
  const handlePositionChange = (newPosition: number) => {
    stopMovement();
    setPosition(newPosition);
    setCoverState(newPosition === 100 ? 'open' : newPosition === 0 ? 'closed' : 'open');
  };

  // Step ~2% every 50 ms → ~2.5 s full travel, matching a real blind.
  const STEP = 2;
  const INTERVAL_MS = 50;

  const handleOpen = () => {
    stopMovement();
    setCoverState('opening');
    movementRef.current = window.setInterval(() => {
      setPosition((prev) => {
        const next = Math.min(100, prev + STEP);
        if (next >= 100) {
          stopMovement();
          setCoverState('open');
        }
        return next;
      });
    }, INTERVAL_MS);
  };

  const handleClose = () => {
    stopMovement();
    setCoverState('closing');
    movementRef.current = window.setInterval(() => {
      setPosition((prev) => {
        const next = Math.max(0, prev - STEP);
        if (next <= 0) {
          stopMovement();
          setCoverState('closed');
        }
        return next;
      });
    }, INTERVAL_MS);
  };

  const handleStop = () => {
    stopMovement();
    setPosition((prev) => {
      setCoverState(prev >= 100 ? 'open' : prev <= 0 ? 'closed' : 'open');
      return prev;
    });
  };

  // Get state text and color — active states use the accent color, inactive use muted
  const getStateDisplay = () => {
    switch (coverState) {
      case 'open':
        return { text: t('cover.state.open'), color: colors.cover.open.accent };
      case 'opening':
        return { text: t('cover.state.opening'), color: colors.cover.open.accent };
      case 'closed':
        return { text: t('cover.state.closed'), color: surface.textSecondary };
      case 'closing':
        return { text: t('cover.state.closing'), color: surface.textSecondary };
    }
  };

  const stateDisplay = getStateDisplay();
  const cardId = `cover-${name.toLowerCase().replace(/ /g, '-')}`;
  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: t('cover.ariaLabel', { name }),
    ariaPressed: position > 0,
    isEditMode,
    onToggle: () => {
      if (position > 0) {
        handleClose();
        return;
      }
      handleOpen();
    },
    onOpenControls: () => setIsSettingsOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  });

  return (
    <CoverCardView
      entityId={id}
      name={name}
      room={room}
      position={position}
      deviceClass={deviceClass}
      deviceClassConfig={DEVICE_CLASS_CONFIG}
      size={size}
      isEditMode={isEditMode}
      cardId={cardId}
      openColors={colors.cover.open}
      closedColors={colors.cover.closed}
      cardProps={cardInteraction.cardProps}
      iconButtonProps={cardInteraction.iconButtonProps}
      settingsButtonProps={cardInteraction.settingsButtonProps}
      theme={theme}
      stateDisplay={stateDisplay}
      isSettingsOpen={isSettingsOpen}
      setIsSettingsOpen={setIsSettingsOpen}
      onSizeChange={onSizeChange}
      handlePositionChange={handlePositionChange}
      handleOpen={handleOpen}
      handleClose={handleClose}
      handleStop={handleStop}
      setDeviceClass={setDeviceClass}
    />
  );
});
