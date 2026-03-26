import { useEffect } from 'react';

/**
 * Subscribes to window + visualViewport resize and batches callback execution
 * into a single animation frame.
 */
export function useViewportResize(onResize: () => void) {
  useEffect(() => {
    let frameId: number | null = null;

    const handleResize = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        onResize();
      });
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [onResize]);
}
