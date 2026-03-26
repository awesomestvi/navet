import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useViewportResize } from '@/app/hooks/use-viewport-resize';

const FLOATING_LIBRARY_WIDTH = 360;
const FLOATING_LIBRARY_DOCK_GAP = 20;
const FLOATING_LIBRARY_MIN_MARGIN = 8;
const FLOATING_LIBRARY_MIN_TOP = 88;
const FLOATING_LIBRARY_BOTTOM_OFFSET = 120;

function getExpandedLibraryX() {
  return Math.max(16, window.innerWidth - FLOATING_LIBRARY_WIDTH - 32);
}

function getDockedLibraryX() {
  return window.innerWidth - FLOATING_LIBRARY_DOCK_GAP;
}

export interface UseLibraryPanelReturn {
  libraryPanelRef: React.RefObject<HTMLDivElement | null>;
  isLibraryVisible: boolean;
  isLibraryCollapsed: boolean;
  libraryPosition: { x: number; y: number };
  handleStartLibraryDrag: (event: ReactPointerEvent<HTMLElement>) => void;
  toggleLibraryVisibility: () => void;
  expandLibrary: () => void;
  collapseLibraryToDock: () => void;
}

export function useLibraryPanel(): UseLibraryPanelReturn {
  const libraryPanelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isLibraryVisible, setIsLibraryVisible] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [libraryPosition, setLibraryPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const panel = libraryPanelRef.current;
    if (!panel || !isLibraryVisible || isLibraryCollapsed) {
      return;
    }

    panel.style.transform = `translate(${libraryPosition.x}px, ${libraryPosition.y}px)`;
  }, [isLibraryCollapsed, isLibraryVisible, libraryPosition]);

  const placePanel = useCallback(() => {
    const x = isLibraryCollapsed ? getDockedLibraryX() : getExpandedLibraryX();
    const y = 170;
    setLibraryPosition((current) => (current.x === 0 && current.y === 0 ? { x, y } : current));
  }, [isLibraryCollapsed]);

  useViewportResize(placePanel);

  const handleStartLibraryDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (isLibraryCollapsed) return;

    const panel = libraryPanelRef.current;
    if (!panel) return;
    event.preventDefault();

    const rect = panel.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    let lastX = rect.left;
    let lastY = rect.top;
    let nextX = rect.left;
    let nextY = rect.top;
    let frameId: number | null = null;
    const previousUserSelect = document.body.style.userSelect;

    panel.style.willChange = 'transform';
    document.body.style.userSelect = 'none';

    const flushTransform = () => {
      panel.style.transform = `translate(${nextX}px, ${nextY}px)`;
      frameId = null;
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      nextX = Math.min(
        Math.max(FLOATING_LIBRARY_MIN_MARGIN, moveEvent.clientX - dragOffsetRef.current.x),
        window.innerWidth - rect.width - FLOATING_LIBRARY_MIN_MARGIN
      );
      nextY = Math.min(
        Math.max(FLOATING_LIBRARY_MIN_TOP, moveEvent.clientY - dragOffsetRef.current.y),
        window.innerHeight - FLOATING_LIBRARY_BOTTOM_OFFSET
      );

      if (frameId === null) {
        frameId = window.requestAnimationFrame(flushTransform);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        flushTransform();
      }
      panel.style.willChange = '';
      document.body.style.userSelect = previousUserSelect;
      lastX = nextX;
      lastY = nextY;
      setLibraryPosition({ x: lastX, y: lastY });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const toggleLibraryVisibility = () => {
    setIsLibraryVisible((current) => {
      if (current) {
        setIsLibraryCollapsed(false);
        return false;
      }

      setIsLibraryCollapsed(false);
      setLibraryPosition((position) => ({
        ...position,
        x: getExpandedLibraryX(),
      }));
      return true;
    });
  };

  const expandLibrary = () => {
    setIsLibraryVisible(true);
    setIsLibraryCollapsed(false);
    setLibraryPosition((position) => ({
      ...position,
      x: getExpandedLibraryX(),
    }));
  };

  const collapseLibraryToDock = () => {
    setIsLibraryVisible(true);
    setIsLibraryCollapsed(true);
    setLibraryPosition((position) => ({
      ...position,
      x: getDockedLibraryX(),
    }));
  };

  return {
    libraryPanelRef,
    isLibraryVisible,
    isLibraryCollapsed,
    libraryPosition,
    handleStartLibraryDrag,
    toggleLibraryVisibility,
    expandLibrary,
    collapseLibraryToDock,
  };
}
