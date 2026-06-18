import { Button } from '@navet/app/components/primitives/button';
import {
  getDialogHeightClassName,
  getDialogMaxWidthClassName,
  navetControlTokens,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import * as Dialog from '@radix-ui/react-dialog';
import type { CSSProperties, ReactNode } from 'react';

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

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-6 flex flex-wrap justify-end gap-2 ${className ?? ''}`}>{children}</div>
  );
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

export function customCardDialogSurfaceProps(
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
