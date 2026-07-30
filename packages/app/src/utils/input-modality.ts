type PointerModality = 'mouse' | 'touch';

type InputModalityController = {
  cleanup: () => void;
};

const FINE_POINTER_QUERY = '(any-pointer: fine)';

function getInitialPointerModality() {
  if (typeof window.matchMedia !== 'function') {
    return 'touch';
  }

  return window.matchMedia(FINE_POINTER_QUERY).matches ? 'mouse' : 'touch';
}

export function initializeInputModality(): InputModalityController {
  let currentModality: PointerModality | null = null;
  let isMouseMoveDetectionArmed = false;

  const disarmMouseMoveDetection = () => {
    if (!isMouseMoveDetectionArmed) {
      return;
    }

    window.removeEventListener('pointermove', handleMousePointerMove);
    isMouseMoveDetectionArmed = false;
  };

  const armMouseMoveDetection = () => {
    if (isMouseMoveDetectionArmed) {
      return;
    }

    window.addEventListener('pointermove', handleMousePointerMove, { passive: true });
    isMouseMoveDetectionArmed = true;
  };

  const setPointerModality = (modality: PointerModality) => {
    if (currentModality === modality) {
      return;
    }

    currentModality = modality;
    document.documentElement.dataset.pointerModality = modality;

    if (modality === 'touch') {
      armMouseMoveDetection();
    } else {
      disarmMouseMoveDetection();
    }
  };

  function handleMousePointerMove(event: PointerEvent) {
    if (event.pointerType === 'mouse') {
      setPointerModality('mouse');
    }
  }

  const handlePointerActivity = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      setPointerModality('mouse');
      return;
    }

    if (event.pointerType) {
      setPointerModality('touch');
    }
  };

  const handleTouchStart = () => {
    setPointerModality('touch');
  };

  setPointerModality(getInitialPointerModality());
  window.addEventListener('pointerdown', handlePointerActivity, { passive: true });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });

  return {
    cleanup: () => {
      window.removeEventListener('pointerdown', handlePointerActivity);
      window.removeEventListener('touchstart', handleTouchStart);
      disarmMouseMoveDetection();
      currentModality = null;
      delete document.documentElement.dataset.pointerModality;
    },
  };
}
