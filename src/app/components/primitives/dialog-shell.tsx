import * as Dialog from '@radix-ui/react-dialog';
import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@/app/components/primitives/button';
import {
  getDialogHeightClassName,
  getDialogMaxWidthClassName,
  navetControlTokens,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';

function getDialogPanelSurfaceClassName(className: string): string {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        !/^(relative|absolute|fixed|sticky)$/.test(token) &&
        !/^overflow(?:-[xy])?(?:-.+)?$/.test(token) &&
        !/^rounded(?:-.+)?$/.test(token) &&
        !/^p[trblxy]?-.+$/.test(token) &&
        !/^border(?:-.+)?$/.test(token)
    )
    .join(' ');
}

interface DialogShellProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  overlayClassName: string;
  contentClassName: string;
  contentAriaDescribedBy?: string;
  contentTitle?: string;
  contentDescription?: string;
  disableOpenAutoFocus?: boolean;
  mobileCoverSheet?: boolean;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  bodyClassName?: string;
  children: ReactNode;
}

const mobileCoverSheetClassName = [
  'max-sm:!top-[var(--mobile-cover-sheet-top)] max-sm:!right-2 max-sm:!bottom-2 max-sm:!left-2',
  'max-sm:!mx-0 max-sm:!max-h-[calc(100dvh-1rem)] max-sm:!w-auto max-sm:!max-w-none',
  'max-sm:![translate:0_var(--mobile-cover-sheet-drag-y)] max-sm:!rounded-[30px]',
  'max-sm:!transition-[height,top,translate] max-sm:!duration-200 max-sm:!ease-out',
].join(' ');

const mobileCoverSheetFullscreenClassName = [
  'max-sm:!h-auto',
  'max-sm:!transition-[height,top,translate] max-sm:!duration-200 max-sm:!ease-out',
].join(' ');

const mobileCoverSheetDraggingClassName = 'max-sm:!transition-none';
const mobileCoverSheetTopInsetPx = 8;

function blurActiveElement() {
  if (typeof document === 'undefined') {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

function getMobileCoverSheetStyle(
  contentStyle: CSSProperties | undefined,
  dragOffset: number,
  topInset: string
): CSSProperties {
  return {
    ...contentStyle,
    '--mobile-cover-sheet-drag-y': `${dragOffset}px`,
    '--mobile-cover-sheet-top': topInset,
  } as CSSProperties;
}

export function DialogShell({
  isOpen,
  onOpenChange,
  overlayClassName,
  contentClassName,
  contentAriaDescribedBy,
  contentTitle,
  contentDescription,
  disableOpenAutoFocus = false,
  mobileCoverSheet = true,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  bodyClassName,
  children,
}: DialogShellProps) {
  const generatedDescriptionId = useId();
  const [isMobileCoverSheetFullscreen, setIsMobileCoverSheetFullscreen] = useState(false);
  const [mobileCoverSheetDragOffset, setMobileCoverSheetDragOffset] = useState(0);
  const [mobileCoverSheetTopInset, setMobileCoverSheetTopInset] = useState('auto');
  const [isMobileCoverSheetDragging, setIsMobileCoverSheetDragging] = useState(false);
  const mobileCoverSheetContentRef = useRef<HTMLDivElement | null>(null);
  const mobileCoverSheetDragStartYRef = useRef(0);
  const mobileCoverSheetDragStartTopRef = useRef(0);
  const mobileCoverSheetRestingTopRef = useRef(0);
  const mobileCoverSheetDragDeltaRef = useRef(0);
  const mobileCoverSheetPointerIdRef = useRef<number | null>(null);
  const suppressMobileCoverSheetHandleClickRef = useRef(false);
  const hasDecoratedContent = Boolean(
    contentGlowClassName || contentGlowStyle || contentOverlayClassName
  );
  const resolvedBodyClassName = bodyClassName ?? (mobileCoverSheet ? 'min-h-0' : '');
  const resolvedAriaDescribedBy = contentDescription
    ? generatedDescriptionId
    : contentAriaDescribedBy;

  useLayoutEffect(() => {
    if (isOpen) {
      blurActiveElement();
    }
  }, [isOpen]);

  const resetMobileCoverSheetDragState = useCallback(() => {
    mobileCoverSheetDragDeltaRef.current = 0;
    mobileCoverSheetPointerIdRef.current = null;
    suppressMobileCoverSheetHandleClickRef.current = false;
    setMobileCoverSheetDragOffset(0);
    setMobileCoverSheetTopInset(isMobileCoverSheetFullscreen ? '0.5rem' : 'auto');
    setIsMobileCoverSheetDragging(false);
  }, [isMobileCoverSheetFullscreen]);

  useEffect(() => {
    if (!isOpen) {
      resetMobileCoverSheetDragState();
      setMobileCoverSheetTopInset('auto');
      setIsMobileCoverSheetFullscreen(false);
    }
  }, [isOpen, resetMobileCoverSheetDragState]);

  useEffect(() => {
    if (!mobileCoverSheet || !isMobileCoverSheetDragging) {
      return;
    }

    const closeThresholdPx = isMobileCoverSheetFullscreen
      ? Math.max(360, window.innerHeight * 0.7)
      : 72;
    const collapseThresholdPx = isMobileCoverSheetFullscreen
      ? Math.max(56, window.innerHeight * 0.1)
      : 72;
    const fullscreenThresholdPx = 56;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== mobileCoverSheetPointerIdRef.current) {
        return;
      }

      const deltaY = event.clientY - mobileCoverSheetDragStartYRef.current;
      if (Math.abs(deltaY) > 6) {
        suppressMobileCoverSheetHandleClickRef.current = true;
      }

      mobileCoverSheetDragDeltaRef.current = deltaY;
      if (isMobileCoverSheetFullscreen && deltaY > 0) {
        const restingTop =
          mobileCoverSheetRestingTopRef.current || mobileCoverSheetDragStartTopRef.current;
        const topInset = Math.min(restingTop, mobileCoverSheetTopInsetPx + deltaY);
        setMobileCoverSheetTopInset(`${Math.max(mobileCoverSheetTopInsetPx, topInset)}px`);
        setMobileCoverSheetDragOffset(
          Math.max(0, deltaY - (restingTop - mobileCoverSheetTopInsetPx))
        );
        return;
      }

      setMobileCoverSheetDragOffset(Math.max(0, deltaY));
      setMobileCoverSheetTopInset(
        deltaY < 0
          ? `${Math.max(
              mobileCoverSheetTopInsetPx,
              mobileCoverSheetDragStartTopRef.current + deltaY
            )}px`
          : 'auto'
      );
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== mobileCoverSheetPointerIdRef.current) {
        return;
      }

      const dragDelta = mobileCoverSheetDragDeltaRef.current;
      setIsMobileCoverSheetDragging(false);
      mobileCoverSheetPointerIdRef.current = null;
      mobileCoverSheetDragDeltaRef.current = 0;
      setMobileCoverSheetDragOffset(0);

      if (dragDelta >= closeThresholdPx) {
        blurActiveElement();
        onOpenChange(false);
        return;
      }

      if (isMobileCoverSheetFullscreen && dragDelta >= collapseThresholdPx) {
        setIsMobileCoverSheetFullscreen(false);
        setMobileCoverSheetTopInset('auto');
        return;
      }

      if (dragDelta <= -fullscreenThresholdPx) {
        setMobileCoverSheetTopInset('0.5rem');
        setIsMobileCoverSheetFullscreen(true);
      } else {
        setMobileCoverSheetTopInset(isMobileCoverSheetFullscreen ? '0.5rem' : 'auto');
      }

      window.setTimeout(() => {
        suppressMobileCoverSheetHandleClickRef.current = false;
      }, 0);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [isMobileCoverSheetDragging, isMobileCoverSheetFullscreen, mobileCoverSheet, onOpenChange]);

  const handleMobileCoverSheetPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    mobileCoverSheetPointerIdRef.current = event.pointerId;
    mobileCoverSheetDragStartYRef.current = event.clientY;
    mobileCoverSheetDragStartTopRef.current =
      mobileCoverSheetContentRef.current?.getBoundingClientRect().top ?? mobileCoverSheetTopInsetPx;
    if (!isMobileCoverSheetFullscreen) {
      mobileCoverSheetRestingTopRef.current = mobileCoverSheetDragStartTopRef.current;
    }
    mobileCoverSheetDragDeltaRef.current = 0;
    suppressMobileCoverSheetHandleClickRef.current = false;
    setIsMobileCoverSheetDragging(true);
    setMobileCoverSheetDragOffset(0);
  };

  const handleMobileCoverSheetHandleClick = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    if (suppressMobileCoverSheetHandleClickRef.current) {
      suppressMobileCoverSheetHandleClickRef.current = false;
      return;
    }

    onOpenChange(false);
  };

  const resolvedContentClassName = [
    contentClassName,
    mobileCoverSheet ? mobileCoverSheetClassName : '',
    mobileCoverSheet && isMobileCoverSheetFullscreen ? mobileCoverSheetFullscreenClassName : '',
    mobileCoverSheet && isMobileCoverSheetDragging ? mobileCoverSheetDraggingClassName : '',
  ]
    .filter(Boolean)
    .join(' ');
  const resolvedContentStyle = mobileCoverSheet
    ? getMobileCoverSheetStyle(contentStyle, mobileCoverSheetDragOffset, mobileCoverSheetTopInset)
    : contentStyle;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        blurActiveElement();
        onOpenChange(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 z-50 ${overlayClassName}`} />
        <Dialog.Content
          ref={mobileCoverSheetContentRef}
          className={resolvedContentClassName}
          style={resolvedContentStyle}
          aria-describedby={resolvedAriaDescribedBy}
          onOpenAutoFocus={
            disableOpenAutoFocus
              ? (event) => {
                  event.preventDefault();
                  blurActiveElement();
                }
              : undefined
          }
        >
          {contentTitle ? <Dialog.Title className="sr-only">{contentTitle}</Dialog.Title> : null}
          {contentDescription ? (
            <Dialog.Description id={generatedDescriptionId} className="sr-only">
              {contentDescription}
            </Dialog.Description>
          ) : null}
          {mobileCoverSheet ? (
            <button
              type="button"
              onPointerDown={handleMobileCoverSheetPointerDown}
              onClick={handleMobileCoverSheetHandleClick}
              className="relative z-[3] mx-auto mt-3 mb-1 hidden h-5 w-20 touch-none items-center justify-center max-sm:flex"
              aria-label={
                isMobileCoverSheetFullscreen ? 'Close dialog' : 'Drag dialog to fullscreen or close'
              }
            >
              <span className="h-1 w-16 rounded-full bg-white/20" aria-hidden="true" />
            </button>
          ) : null}
          {contentGlowClassName || contentGlowStyle ? (
            <div
              className={`absolute inset-0 ${contentGlowClassName ?? ''}`}
              style={contentGlowStyle}
            />
          ) : null}
          {contentOverlayClassName ? (
            <div className={`pointer-events-none absolute inset-0 ${contentOverlayClassName}`} />
          ) : null}
          {hasDecoratedContent ? (
            <div className={`relative z-[2] ${resolvedBodyClassName}`}>{children}</div>
          ) : mobileCoverSheet ? (
            <div className={resolvedBodyClassName}>{children}</div>
          ) : (
            children
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end">{children}</div>;
}

export function DialogDoneFooter({ label }: { label: string }) {
  return (
    <DialogFooter>
      <Dialog.Close asChild>
        <Button variant="soft" size="small">
          {label}
        </Button>
      </Dialog.Close>
    </DialogFooter>
  );
}

interface DialogDoneButtonProps {
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function DialogDoneButton({ label, className, style }: DialogDoneButtonProps) {
  return (
    <Dialog.Close asChild>
      <button
        type="button"
        className={
          className ??
          `${navetRadiusTokens.action} px-4 py-2 ${navetTypographyTokens.control} text-white transition-opacity hover:opacity-90`
        }
        style={style}
      >
        {label}
      </button>
    </Dialog.Close>
  );
}

interface SettingsDialogDoneButtonProps {
  label: string;
  surface: {
    textPrimary: string;
    subtleBg: string;
    hoverBg: string;
  };
  className?: string;
  style?: CSSProperties;
}

export function SettingsDialogDoneButton({
  label,
  surface,
  className,
  style,
}: SettingsDialogDoneButtonProps) {
  return (
    <DialogDoneButton
      label={label}
      className={
        className ??
        `${navetRadiusTokens.action} px-4 py-2 ${navetTypographyTokens.control} ${surface.textPrimary} ${surface.subtleBg} ${surface.hoverBg}`
      }
      style={style}
    />
  );
}

interface CustomDialogDoneButtonProps {
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function CustomDialogDoneButton({ label, className, style }: CustomDialogDoneButtonProps) {
  return (
    <Dialog.Close asChild>
      <Button variant="soft" size="small" className={className} style={style}>
        {label}
      </Button>
    </Dialog.Close>
  );
}

export function settingsDialogContentClass(
  surface: { panel: string; border: string },
  options?: {
    maxWidth?: 'sm' | 'md' | 'lg';
    height?: 'tall' | 'capped';
    overflow?: boolean;
    padding?: boolean;
    animate?: boolean;
  }
): string {
  const {
    maxWidth = 'md',
    height,
    overflow = Boolean(height),
    padding = false,
    animate = false,
  } = options ?? {};

  const maxWidthClass = getDialogMaxWidthClassName(maxWidth);
  const heightClassName = getDialogHeightClassName(height);
  const panelClassName = getDialogPanelSurfaceClassName(surface.panel);

  const parts = [
    'fixed top-1/2 left-1/2 z-50',
    `w-[90vw] ${maxWidthClass}`,
    '-translate-x-1/2 -translate-y-1/2',
    overflow ? 'overflow-hidden' : '',
    `${navetControlTokens.dialog.radiusClassName} border shadow-2xl backdrop-blur-xl`,
    heightClassName,
    padding ? navetControlTokens.dialog.bodyPaddingClassName : '',
    animate ? 'animate-in fade-in zoom-in duration-200' : '',
    panelClassName,
    surface.border,
  ];

  return parts.filter(Boolean).join(' ');
}

export function customCardDialogShellProps(
  surface: { panel: string; border: string },
  decoration: {
    panelStyle?: CSSProperties;
    glowClassName?: string;
    glowStyle?: CSSProperties;
    overlayClassName?: string | null;
  },
  options?: {
    maxWidth?: 'sm' | 'md' | 'lg';
    height?: 'tall' | 'capped';
    overflow?: boolean;
    padding?: boolean;
    animate?: boolean;
    fallbackContentClassName?: string;
    fallbackDecoration?: {
      panelStyle?: CSSProperties;
      glowClassName?: string;
      glowStyle?: CSSProperties;
      overlayClassName?: string | null;
    };
  }
) {
  const {
    maxWidth = 'md',
    height,
    overflow = Boolean(height),
    padding = true,
    animate = false,
    fallbackContentClassName,
    fallbackDecoration,
  } = options ?? {};
  const usesFallbackDecoration =
    !decoration.panelStyle &&
    !decoration.glowClassName &&
    !decoration.glowStyle &&
    !decoration.overlayClassName &&
    Boolean(fallbackDecoration);
  const resolvedDecoration =
    decoration.panelStyle ||
    decoration.glowClassName ||
    decoration.glowStyle ||
    decoration.overlayClassName
      ? decoration
      : fallbackDecoration;
  const hasDecoration = Boolean(
    resolvedDecoration?.panelStyle ||
      resolvedDecoration?.glowClassName ||
      resolvedDecoration?.glowStyle ||
      resolvedDecoration?.overlayClassName
  );
  if (!hasDecoration) {
    return {
      contentClassName:
        fallbackContentClassName ??
        settingsDialogContentClass(surface, { maxWidth, height, overflow, padding, animate }),
      contentStyle: undefined,
      contentGlowClassName: undefined,
      contentGlowStyle: undefined,
      contentOverlayClassName: undefined,
    };
  }

  const maxWidthClass = getDialogMaxWidthClassName(maxWidth);
  const heightClassName = getDialogHeightClassName(height);
  const panelClassName = getDialogPanelSurfaceClassName(surface.panel);

  return {
    contentClassName:
      usesFallbackDecoration && fallbackContentClassName
        ? fallbackContentClassName
        : [
            'fixed top-1/2 left-1/2 z-50',
            `w-[90vw] ${maxWidthClass}`,
            '-translate-x-1/2 -translate-y-1/2',
            overflow ? 'overflow-hidden' : '',
            `${navetControlTokens.dialog.radiusClassName} border shadow-2xl backdrop-blur-xl`,
            heightClassName,
            padding ? navetControlTokens.dialog.bodyPaddingClassName : '',
            animate ? 'animate-in fade-in zoom-in duration-200' : '',
            panelClassName,
            surface.border,
          ]
            .filter(Boolean)
            .join(' '),
    contentStyle: {
      ...resolvedDecoration?.panelStyle,
    },
    contentGlowClassName: resolvedDecoration?.glowClassName,
    contentGlowStyle: resolvedDecoration?.glowStyle,
    contentOverlayClassName: resolvedDecoration?.overlayClassName,
  };
}
