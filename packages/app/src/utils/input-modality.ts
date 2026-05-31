type PointerModality = 'mouse' | 'touch';

type InputModalityController = {
  cleanup: () => void;
};

const FINE_POINTER_QUERY = '(any-pointer: fine)';

function setPointerModality(modality: PointerModality) {
  document.documentElement.dataset.pointerModality = modality;
}

function getInitialPointerModality() {
  if (typeof window.matchMedia !== 'function') {
    return 'touch';
  }

  return window.matchMedia(FINE_POINTER_QUERY).matches ? 'mouse' : 'touch';
}

export function initializeInputModality(): InputModalityController {
  setPointerModality(getInitialPointerModality());

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

  window.addEventListener('pointerdown', handlePointerActivity, { passive: true });
  window.addEventListener('pointermove', handlePointerActivity, { passive: true });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });

  return {
    cleanup: () => {
      window.removeEventListener('pointerdown', handlePointerActivity);
      window.removeEventListener('pointermove', handlePointerActivity);
      window.removeEventListener('touchstart', handleTouchStart);
      delete document.documentElement.dataset.pointerModality;
    },
  };
}
