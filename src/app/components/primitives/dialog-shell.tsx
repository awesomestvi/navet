import * as Dialog from '@radix-ui/react-dialog';
import type { CSSProperties, ReactNode } from 'react';

interface DialogShellProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  overlayClassName: string;
  contentClassName: string;
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
          'rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90'
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
        `rounded-xl px-4 py-2 text-sm font-medium ${surface.textPrimary} ${surface.subtleBg} ${surface.hoverBg}`
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
    <DialogDoneButton
      label={label}
      className={
        className ??
        'rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90'
      }
      style={style}
    />
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

  const maxWidthClass =
    maxWidth === 'sm' ? 'max-w-sm' : maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md';

  const parts = [
    'fixed top-1/2 left-1/2 z-50',
    `w-[90vw] ${maxWidthClass}`,
    '-translate-x-1/2 -translate-y-1/2',
    overflow ? 'overflow-hidden' : '',
    'rounded-3xl border shadow-2xl backdrop-blur-xl',
    height === 'tall' ? 'h-[85vh]' : height === 'capped' ? 'max-h-[85vh]' : '',
    padding ? 'p-6' : '',
    animate ? 'animate-in fade-in zoom-in duration-200' : '',
    surface.panel,
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
    padding?: boolean;
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
    padding = true,
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
        fallbackContentClassName ?? settingsDialogContentClass(surface, { maxWidth, padding }),
      contentStyle: undefined,
      contentGlowClassName: undefined,
      contentGlowStyle: undefined,
      contentOverlayClassName: undefined,
    };
  }

  const maxWidthClass =
    maxWidth === 'sm' ? 'max-w-sm' : maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md';

  return {
    contentClassName:
      usesFallbackDecoration && fallbackContentClassName
        ? fallbackContentClassName
        : [
            'fixed top-1/2 left-1/2 z-50',
            `w-[90vw] ${maxWidthClass}`,
            '-translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl',
            padding ? 'p-6' : '',
          ]
            .filter(Boolean)
            .join(' '),
    contentStyle: resolvedDecoration?.panelStyle,
    contentGlowClassName: resolvedDecoration?.glowClassName,
    contentGlowStyle: resolvedDecoration?.glowStyle,
    contentOverlayClassName: resolvedDecoration?.overlayClassName,
  };
}
