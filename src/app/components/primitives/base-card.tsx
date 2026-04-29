import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardTitleBlock } from '@/app/components/primitives/entity-card-title-block';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import {
  type CardSize,
  getStandardCardPadding,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@/app/components/shared/card-size-selector';
import {
  type CardTextTone,
  getCardReadableTextTokens,
} from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceStyleTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  getBaseCardGapClassName,
  getBaseCardRadiusClassName,
} from '@/app/components/system/tokens';
import { useTheme } from '@/app/hooks';
import { getGradientColors } from '@/app/utils/color-utils';

export type BaseCardSurfaceVariant = 'default' | 'muted';
export type BaseCardFooterMode = 'action-row' | 'settings-icon';

export interface BaseCardActionRowOverflowItem {
  key: string;
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface BaseCardActionRowConfig {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  overflowItems?: BaseCardActionRowOverflowItem[];
  size?: 'small' | 'default' | 'medium' | 'large';
}

export interface BaseCardSettingsActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  tone?: 'default' | 'muted';
  variant?: 'neutral' | 'soft';
}

export interface BaseCardProps extends HTMLAttributes<HTMLDivElement> {
  size: CardSize;
  children: ReactNode;
  className?: string;
  frameClassName?: string;
  contentClassName?: string;
  innerClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  interactive?: boolean;
  isActive?: boolean;
  activeColor?: string | null;
  surfaceVariant?: BaseCardSurfaceVariant;
  tone?: CardTextTone;
  accentColor?: string | null;
  backgroundColor?: string | null;
  backgroundClassName?: string;
  header?: ReactNode;
  title?: string;
  subtitle?: string;
  headerLeading?: ReactNode;
  headerTrailing?: ReactNode;
  headerLayout?: 'title-first' | 'eyebrow-first';
  headerAlign?: 'start' | 'center';
  headerTone?: CardTextTone;
  footer?: ReactNode;
  actionRow?: BaseCardActionRowConfig;
  settingsAction?: BaseCardSettingsActionProps;
  footerMode?: BaseCardFooterMode;
  fullBleed?: boolean;
  underlay?: ReactNode;
  overlay?: ReactNode;
  disableDefaultSheen?: boolean;
  disableDefaultLightOverlay?: boolean;
}

interface BaseCardSurfaceTokens {
  borderClassName: string;
  backgroundClassName: string;
  readableBackgroundColor: string;
}

function getBaseCardSurfaceTokens({
  theme,
  surfaceVariant,
  surface,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  surfaceVariant: BaseCardSurfaceVariant;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}): BaseCardSurfaceTokens {
  if (theme === 'light') {
    return {
      borderClassName: `border ${surface.border}`,
      backgroundClassName:
        surfaceVariant === 'muted'
          ? 'bg-linear-to-br from-slate-100 to-white'
          : 'bg-linear-to-br from-white to-slate-50',
      readableBackgroundColor: surfaceVariant === 'muted' ? '#e2e8f0' : '#f8fafc',
    };
  }

  if (theme === 'glass') {
    return {
      borderClassName: `border ${surface.border}`,
      backgroundClassName: `${surface.panel} ${surface.cardShadow}`,
      readableBackgroundColor: surfaceVariant === 'muted' ? '#334155' : '#1e293b',
    };
  }

  if (theme === 'black') {
    return {
      borderClassName: `border ${surface.border}`,
      backgroundClassName:
        surfaceVariant === 'muted'
          ? 'bg-linear-to-br from-black via-black to-zinc-950'
          : 'bg-linear-to-br from-black via-black to-black',
      readableBackgroundColor: '#000000',
    };
  }

  return {
    borderClassName:
      surfaceVariant === 'muted' ? 'border border-zinc-800' : 'border border-zinc-700',
    backgroundClassName:
      surfaceVariant === 'muted'
        ? 'bg-linear-to-br from-zinc-900 via-zinc-950 to-black'
        : 'bg-linear-to-br from-zinc-900 to-zinc-950',
    readableBackgroundColor: surfaceVariant === 'muted' ? '#09090b' : '#18181b',
  };
}

function resolveActionRowSize(size: CardSize): BaseCardActionRowConfig['size'] {
  return isTinyCardSize(size) || isExtraSmallCardSize(size) ? 'small' : 'default';
}

function resolveSettingsActionSize(size: CardSize): CardSize {
  if (isTinyCardSize(size) || isExtraSmallCardSize(size) || size === 'small') {
    return 'small';
  }

  return 'medium';
}

export function BaseCard({
  size,
  children,
  className = '',
  frameClassName = '',
  contentClassName = '',
  innerClassName = '',
  headerClassName = '',
  footerClassName = '',
  interactive = false,
  isActive = false,
  activeColor = null,
  surfaceVariant = 'default',
  tone = 'neutral',
  accentColor,
  backgroundColor,
  backgroundClassName = '',
  header,
  title,
  subtitle,
  headerLeading,
  headerTrailing,
  headerLayout = 'eyebrow-first',
  headerAlign = 'start',
  headerTone,
  footer,
  actionRow,
  settingsAction,
  footerMode = 'action-row',
  fullBleed = false,
  underlay,
  overlay,
  disableDefaultSheen = false,
  disableDefaultLightOverlay = false,
  style,
  ...props
}: BaseCardProps) {
  const { theme, accentColor: themeAccentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const shell = getCardShellSurfaceTokens(theme);
  const resolvedSurface = getBaseCardSurfaceTokens({ theme, surfaceVariant, surface });
  const baseCardRadiusClassName = getBaseCardRadiusClassName(size);
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const resolvedHeaderTone = headerTone ?? tone;
  const resolvedAccentColor = accentColor ?? themeAccentColor;
  const readableTextTokens = getCardReadableTextTokens({
    theme,
    tone: resolvedHeaderTone,
    accentColor: resolvedAccentColor,
    baseColor: resolvedHeaderTone === 'primary' ? resolvedAccentColor : undefined,
    backgroundColor: backgroundColor ?? resolvedSurface.readableBackgroundColor,
  });
  const activeGradient = getGradientColors(isActive, activeColor, theme);
  const activeSurfaceStyle =
    isActive && theme === 'black'
      ? getCardStateSurfaceStyleTokens({
          theme,
          isActive: true,
          baseColor: activeColor ?? activeGradient.glow ?? '#ff8800',
        })
      : null;

  const headerNode =
    header ??
    (isTiny && (title || subtitle) ? (
      <div className={headerClassName}>
        <EntityCardTitleBlock
          title={title ?? ''}
          subtitle={subtitle ?? ''}
          layout={headerLayout}
          titleClassName="mt-0.5 line-clamp-2 text-xs font-semibold leading-tight"
          subtitleClassName="truncate text-xs tracking-normal"
          titleStyle={{ color: readableTextTokens.titleColor }}
          subtitleStyle={{ color: readableTextTokens.subtitleColor }}
        />
      </div>
    ) : title || subtitle ? (
      <EntityCardHeader
        title={title ?? ''}
        subtitle={subtitle ?? ''}
        size={size}
        layout={headerLayout}
        align={headerAlign}
        tone={resolvedHeaderTone}
        leading={headerLeading}
        trailing={headerTrailing}
        className={headerClassName}
        titleStyle={{ color: readableTextTokens.titleColor }}
        subtitleStyle={{ color: readableTextTokens.subtitleColor }}
      />
    ) : null);

  const settingsActionNode = settingsAction ? (
    <CardSettingsActionButton
      {...settingsAction}
      theme={theme}
      size={resolveSettingsActionSize(size)}
      tone={settingsAction.tone ?? 'default'}
      variant={settingsAction.variant ?? 'soft'}
    />
  ) : null;

  let footerNode = footer;
  if (!isTiny && !isExtraSmall && !footerNode && (actionRow || settingsActionNode)) {
    if (footerMode === 'settings-icon' && settingsActionNode) {
      footerNode = <div className="flex items-center justify-end">{settingsActionNode}</div>;
    } else {
      footerNode = (
        <CardActionRow
          theme={theme}
          size={actionRow?.size ?? resolveActionRowSize(size)}
          leftContent={actionRow?.leftContent}
          rightContent={actionRow?.rightContent ?? settingsActionNode ?? undefined}
          overflowItems={actionRow?.overflowItems}
        />
      );
    }
  }

  const sheenOverlay =
    !disableDefaultSheen && shell.sheenOverlayClassName ? (
      <div className={shell.sheenOverlayClassName} />
    ) : null;
  const lightOverlay =
    !disableDefaultLightOverlay && surface.lightOverlay ? (
      <div className={`absolute inset-0 ${surface.lightOverlay}`} />
    ) : null;
  const contentTextStyle: CSSProperties = {
    color: readableTextTokens.titleColor,
  };
  const hasContent = children !== null && children !== undefined && children !== false;
  const paddingClassName = fullBleed ? '' : getStandardCardPadding(size);
  const gapClassName = fullBleed ? '' : getBaseCardGapClassName(size);
  const centerStandaloneExtraSmallContent = isExtraSmall && !headerNode && !footerNode;
  const contentContainerClassName = fullBleed
    ? 'h-full'
    : centerStandaloneExtraSmallContent
      ? `min-h-0 h-full ${contentClassName}`
      : `min-h-0 flex-1 ${contentClassName}`;
  const hasCustomFrameBackground =
    frameClassName.includes('bg-') ||
    backgroundClassName.includes('bg-') ||
    Boolean(style?.background) ||
    Boolean(style?.backgroundImage) ||
    Boolean(style?.backgroundColor);
  const surfaceBackgroundClassName = hasCustomFrameBackground
    ? ''
    : resolvedSurface.backgroundClassName;
  const mergedStyle =
    activeSurfaceStyle?.cardStyle || style
      ? {
          ...(activeSurfaceStyle?.cardStyle ?? {}),
          ...(style ?? {}),
        }
      : undefined;
  const activeStateUnderlay = isActive ? (
    <div
      className={`pointer-events-none absolute inset-0 ${
        activeGradient.customGradient
          ? ''
          : `bg-linear-to-br ${activeGradient.from} ${activeGradient.to}`
      }`}
      style={
        activeGradient.customGradient ? { background: activeGradient.customGradient } : undefined
      }
    />
  ) : null;
  const activeStateOverlay = activeSurfaceStyle?.innerOverlayClassName ? (
    <div
      className={activeSurfaceStyle.innerOverlayClassName}
      style={activeSurfaceStyle.innerOverlayStyle}
    />
  ) : null;
  const activeStateShine = activeSurfaceStyle?.shineOverlayClassName ? (
    <div className={activeSurfaceStyle.shineOverlayClassName} />
  ) : null;

  return (
    <div
      {...props}
      style={mergedStyle}
      className={`relative flex h-full w-full flex-col overflow-hidden ${baseCardRadiusClassName} ${paddingClassName} ${gapClassName} ${resolvedSurface.borderClassName} ${surfaceBackgroundClassName} ${shell.backdropClassName} ${backgroundClassName} ${frameClassName} ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      {activeStateUnderlay}
      {underlay}
      {sheenOverlay}
      {lightOverlay}
      {activeStateOverlay}
      {activeStateShine}
      {overlay}

      <div className={`relative flex h-full min-h-0 flex-col ${innerClassName}`}>
        {isTiny ? (
          <div className="flex h-full w-full flex-col justify-between text-left">
            <div className="min-w-0 w-full">{headerNode}</div>
            {hasContent ? (
              <div className={contentContainerClassName} style={contentTextStyle}>
                {children}
              </div>
            ) : (
              <span />
            )}
          </div>
        ) : isExtraSmall ? (
          <div className="flex flex-1 items-center">{headerNode}</div>
        ) : (
          headerNode
        )}
        {!isTiny && hasContent ? (
          <div className={contentContainerClassName} style={contentTextStyle}>
            {children}
          </div>
        ) : null}
        {footerNode ? (
          <div className={`mt-3 ${footerClassName}`} style={contentTextStyle}>
            {footerNode}
          </div>
        ) : null}
      </div>
    </div>
  );
}
