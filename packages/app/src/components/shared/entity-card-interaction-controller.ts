import { useI18n } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
} from 'react';

type CardAction = 'toggle' | 'controls' | 'settings';

interface UseEntityCardInteractionControllerOptions {
  ariaLabel: string;
  ariaPressed?: boolean;
  isEditMode?: boolean;
  cardTapAction?: CardAction;
  onToggle?: () => void;
  onOpenControls?: () => void;
  onOpenSettings?: () => void;
}

const NESTED_INTERACTIVE_SELECTOR = [
  '[data-card-interactive]',
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="slider"]',
  '[role="switch"]',
  '[role="button"]',
].join(', ');

export function useEntityCardInteractionController({
  ariaLabel,
  ariaPressed,
  isEditMode = false,
  cardTapAction,
  onToggle,
  onOpenControls,
  onOpenSettings,
}: UseEntityCardInteractionControllerOptions) {
  const interactionMode = useSettingsStore((state) => state.entityInteractionMode);
  const { t } = useI18n();

  const runAction = useCallback(
    (action: CardAction) => {
      if (action === 'settings') {
        if (onOpenSettings) {
          onOpenSettings();
          return;
        }
        if (onOpenControls) {
          onOpenControls();
          return;
        }
      }

      if (action === 'controls') {
        if (onOpenControls) {
          onOpenControls();
          return;
        }
        if (onToggle) {
          onToggle();
        }
        return;
      }

      if (onToggle) {
        onToggle();
        return;
      }

      if (onOpenControls) {
        onOpenControls();
      }
    },
    [onOpenControls, onOpenSettings, onToggle]
  );

  const resolvedCardTapAction: CardAction =
    cardTapAction ?? (interactionMode === 'toggle-first' ? 'toggle' : 'controls');
  const hasCardAction = Boolean(onToggle || onOpenControls);
  const shouldIgnoreNestedInteraction = useCallback(
    (target: EventTarget | null, currentTarget: EventTarget | null) => {
      if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
        return false;
      }

      const interactiveAncestor = target.closest(NESTED_INTERACTIVE_SELECTOR);
      return interactiveAncestor !== null && interactiveAncestor !== currentTarget;
    },
    []
  );

  const cardProps = useMemo(() => {
    if (isEditMode || !hasCardAction) {
      return {
        role: 'button' as const,
        'aria-label': ariaLabel,
        'aria-disabled': true,
        tabIndex: -1,
      };
    }

    return {
      role: 'button' as const,
      'aria-label': ariaLabel,
      'aria-pressed': ariaPressed,
      'aria-disabled': false,
      tabIndex: 0,
      onClick: (event: ReactMouseEvent<HTMLElement>) => {
        if (shouldIgnoreNestedInteraction(event.target, event.currentTarget)) {
          return;
        }
        runAction(resolvedCardTapAction);
      },
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          runAction(resolvedCardTapAction);
        }
      },
    };
  }, [
    ariaLabel,
    ariaPressed,
    resolvedCardTapAction,
    hasCardAction,
    isEditMode,
    runAction,
    shouldIgnoreNestedInteraction,
  ]);

  const getButtonProps = useCallback(
    (action: CardAction, ariaButtonLabel: string) => ({
      type: 'button' as const,
      'aria-label': ariaButtonLabel,
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        runAction(action);
      },
    }),
    [runAction]
  );

  const toggleButtonLabel = useMemo(
    () => t('entityCardInteraction.toggle', { name: ariaLabel }),
    [ariaLabel, t]
  );
  const settingsButtonLabel = useMemo(
    () => t('entityCardInteraction.openSettings', { name: ariaLabel }),
    [ariaLabel, t]
  );
  const iconButtonProps = useMemo(
    () => getButtonProps('toggle', toggleButtonLabel),
    [getButtonProps, toggleButtonLabel]
  );
  const settingsButtonProps = useMemo(
    () => getButtonProps('settings', settingsButtonLabel),
    [getButtonProps, settingsButtonLabel]
  );

  return {
    interactionMode,
    cardProps,
    iconButtonProps,
    settingsButtonProps,
  };
}
