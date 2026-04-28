import * as Dialog from '@radix-ui/react-dialog';
import type { CSSProperties, ReactNode } from 'react';
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
  disableOpenAutoFocus?: boolean;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  children: ReactNode;
}

export function DialogShell({
  isOpen,
  onOpenChange,
  overlayClassName,
  contentClassName,
  contentAriaDescribedBy,
  disableOpenAutoFocus = false,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  children,
}: DialogShellProps) {
  const hasDecoratedContent = Boolean(
    contentGlowClassName || contentGlowStyle || contentOverlayClassName
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 z-50 ${overlayClassName}`} />
        <Dialog.Content
          className={contentClassName}
          style={contentStyle}
          aria-describedby={contentAriaDescribedBy}
          onOpenAutoFocus={
            disableOpenAutoFocus
              ? (event) => {
                  event.preventDefault();
                }
              : undefined
          }
        >
          {contentGlowClassName || contentGlowStyle ? (
            <div
              className={`absolute inset-0 ${contentGlowClassName ?? ''}`}
              style={contentGlowStyle}
            />
          ) : null}
          {contentOverlayClassName ? (
            <div className={`pointer-events-none absolute inset-0 ${contentOverlayClassName}`} />
          ) : null}
          {hasDecoratedContent ? <div className="relative z-[2]">{children}</div> : children}
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
  const centeredContentStyle: CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
  };

  if (!hasDecoration) {
    return {
      contentClassName:
        fallbackContentClassName ??
        settingsDialogContentClass(surface, { maxWidth, height, overflow, padding, animate }),
      contentStyle: centeredContentStyle,
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
      ...centeredContentStyle,
      ...resolvedDecoration?.panelStyle,
    },
    contentGlowClassName: resolvedDecoration?.glowClassName,
    contentGlowStyle: resolvedDecoration?.glowStyle,
    contentOverlayClassName: resolvedDecoration?.overlayClassName,
  };
}
