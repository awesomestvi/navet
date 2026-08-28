import { FieldBlock } from '@navet/app/components/patterns';
import { Button, Input, Radio } from '@navet/app/components/primitives';
import {
  getThemeFocusRingClassName,
  getThemeSurfaceTokens,
  navetRadiusTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import {
  BUILT_IN_WALLPAPERS,
  type BuiltInWallpaperDescriptor,
} from '@navet/app/constants/built-in-wallpapers';
import { useTheme } from '@navet/app/hooks';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import type { RoomWorkspaceImageReferenceV2 } from '../room-workspace-v2';
import { RoomOperationDialogFrame } from './room-operation-dialog-frame';
import { RoomSymbolIcon } from './room-symbol-icon';
import { RoomWallpaperPreviewImage } from './room-wallpaper-preview-image';

export interface RoomSymbolChoice {
  value: string;
  label: string;
  glyph?: string;
  icon?: LucideIcon;
}

export interface RoomAppearanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  symbolLabel: string;
  symbolDescription?: string;
  symbolInputPlaceholder?: string;
  symbolInputHelp?: string;
  lucideLibraryLabel?: string;
  wallpaperLabel: string;
  wallpaperDescription?: string;
  imagePreviewAlt: string;
  wallpaperOptionLabel: (wallpaperId: string) => string;
  urlLabel: string;
  urlPlaceholder?: string;
  invalidUrlMessage: string;
  urlValidationMessage?: string;
  removeImageLabel: string;
  resetLabel: string;
  cancelLabel: string;
  confirmLabel: string;
  symbolChoices: readonly RoomSymbolChoice[];
  symbol: string | null;
  onSymbolChange: (symbol: string | null) => void;
  image: RoomWorkspaceImageReferenceV2 | null;
  onImageChange: (image: RoomWorkspaceImageReferenceV2 | null) => void;
  onReset: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
  wallpapers?: readonly BuiltInWallpaperDescriptor[];
  showWallpaper?: boolean;
}

export function isSafeRoomImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function RoomAppearanceDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  symbolLabel,
  symbolDescription,
  symbolInputPlaceholder,
  symbolInputHelp,
  lucideLibraryLabel,
  wallpaperLabel,
  wallpaperDescription,
  imagePreviewAlt,
  wallpaperOptionLabel,
  urlLabel,
  urlPlaceholder,
  invalidUrlMessage,
  urlValidationMessage,
  removeImageLabel,
  resetLabel,
  cancelLabel,
  confirmLabel,
  symbolChoices,
  symbol,
  onSymbolChange,
  image,
  onImageChange,
  onReset,
  onConfirm,
  isConfirming = false,
  wallpapers = BUILT_IN_WALLPAPERS,
  showWallpaper = true,
}: RoomAppearanceDialogProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const symbolGroupName = useId();
  const wallpaperGroupName = useId();
  const urlInputId = useId();
  const urlValidationId = `${urlInputId}-validation`;
  const imageUrlValue = image?.kind === 'url' ? image.value : '';
  const hasUnsafeUrl = image?.kind === 'url' && !isSafeRoomImageUrl(image.value);
  const resolvedUrlValidationMessage =
    urlValidationMessage ?? (hasUnsafeUrl ? invalidUrlMessage : undefined);
  const hasUrlError = Boolean(resolvedUrlValidationMessage);
  const isConfirmDisabled = isConfirming || hasUnsafeUrl || Boolean(urlValidationMessage);

  return (
    <RoomOperationDialogFrame
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="lg"
      onSubmit={() => {
        if (!isConfirmDisabled) {
          onConfirm();
        }
      }}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button type="submit" loading={isConfirming} disabled={isConfirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-7">
        <fieldset>
          <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
            {symbolLabel}
          </legend>
          {symbolDescription ? (
            <p className={cn('mt-1', navetTypographyTokens.helper, surface.textSecondary)}>
              {symbolDescription}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {symbolChoices.map((choice, index) => {
              const isSelected = symbol === choice.value;
              const radioId = `${symbolGroupName}-${index}`;
              const ChoiceIcon = choice.icon;
              return (
                <label
                  key={choice.value}
                  htmlFor={radioId}
                  className={cn(
                    'relative flex min-h-12 cursor-pointer items-center justify-center border px-2 py-2',
                    'focus-within:ring-2 focus-within:ring-offset-2',
                    navetRadiusTokens.field,
                    surface.ringOffset,
                    surface.border,
                    surface.hoverBg,
                    isSelected ? surface.subtleBg : surface.panelMuted
                  )}
                  style={{
                    borderColor: isSelected ? accentColor : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${accentColor}55` : undefined,
                  }}
                >
                  <Radio
                    id={radioId}
                    className={cn(
                      'absolute inset-0 h-full w-full cursor-pointer opacity-0',
                      getThemeFocusRingClassName(theme)
                    )}
                    name={symbolGroupName}
                    value={choice.value}
                    checked={isSelected}
                    onChange={() => onSymbolChange(choice.value)}
                  />
                  {ChoiceIcon ? (
                    <ChoiceIcon aria-hidden="true" className={cn('h-5 w-5', surface.textPrimary)} />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn('text-lg font-semibold', surface.textPrimary)}
                    >
                      {choice.glyph ?? choice.value}
                    </span>
                  )}
                  <span className="sr-only">{choice.label}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                surface.iconBg,
                surface.borderStrong,
                surface.textPrimary
              )}
              aria-hidden="true"
            >
              {symbol ? (
                <RoomSymbolIcon value={symbol} className="h-5 w-5" />
              ) : (
                <span className="text-sm leading-none">•</span>
              )}
            </div>
            <Input
              type="text"
              value={symbol ?? ''}
              onChange={(event) => onSymbolChange(event.currentTarget.value || null)}
              aria-label={symbolInputPlaceholder ?? symbolLabel}
              placeholder={symbolInputPlaceholder}
              maxLength={32}
              containerClassName="min-w-0 flex-1"
              inputClassName="min-h-11"
            />
          </div>
          {symbolInputHelp ? (
            <p className={cn('mt-2', navetTypographyTokens.helper, surface.textSecondary)}>
              {symbolInputHelp}
            </p>
          ) : null}
          {lucideLibraryLabel ? (
            <a
              href="https://lucide.dev/icons/"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'mt-2 inline-flex text-xs font-medium underline underline-offset-4',
                surface.textSecondary
              )}
            >
              {lucideLibraryLabel}
            </a>
          ) : null}
        </fieldset>

        {showWallpaper ? (
          <>
            <fieldset>
              <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
                {wallpaperLabel}
              </legend>
              {wallpaperDescription ? (
                <p className={cn('mt-1', navetTypographyTokens.helper, surface.textSecondary)}>
                  {wallpaperDescription}
                </p>
              ) : null}

              {image && (image.kind === 'asset' || isSafeRoomImageUrl(image.value)) ? (
                <div
                  className={cn(
                    'relative mt-3 h-32 overflow-hidden border sm:h-40',
                    navetRadiusTokens.panelInset,
                    surface.border
                  )}
                >
                  <RoomWallpaperPreviewImage
                    value={image.value}
                    alt={imagePreviewAlt}
                    className="h-full w-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `linear-gradient(145deg, ${accentColor}33, transparent 56%)`,
                    }}
                  />
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {wallpapers.map((wallpaper, index) => {
                  const isSelected = image?.kind === 'asset' && image.value === wallpaper.token;
                  const optionLabel = wallpaperOptionLabel(wallpaper.id);
                  const radioId = `${wallpaperGroupName}-${index}`;
                  return (
                    <label
                      key={wallpaper.id}
                      htmlFor={radioId}
                      className={cn(
                        'relative aspect-square min-h-11 cursor-pointer overflow-hidden border',
                        'focus-within:ring-2 focus-within:ring-offset-2',
                        navetRadiusTokens.field,
                        surface.ringOffset,
                        surface.border
                      )}
                      style={{
                        borderColor: isSelected ? accentColor : undefined,
                        boxShadow: isSelected ? `0 0 0 2px ${accentColor}` : undefined,
                      }}
                    >
                      <Radio
                        id={radioId}
                        className={cn(
                          'absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0',
                          getThemeFocusRingClassName(theme)
                        )}
                        name={wallpaperGroupName}
                        value={wallpaper.token}
                        checked={isSelected}
                        onChange={() => onImageChange({ kind: 'asset', value: wallpaper.token })}
                      />
                      <RoomWallpaperPreviewImage
                        value={wallpaper.token}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="sr-only">{optionLabel}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <FieldBlock
              label={urlLabel}
              htmlFor={urlInputId}
              error={
                resolvedUrlValidationMessage ? (
                  <span id={urlValidationId} role="alert">
                    {resolvedUrlValidationMessage}
                  </span>
                ) : undefined
              }
            >
              <Input
                id={urlInputId}
                type="url"
                name="room-image-url"
                autoComplete="off"
                spellCheck={false}
                value={imageUrlValue}
                placeholder={urlPlaceholder}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  onImageChange(nextValue ? { kind: 'url', value: nextValue } : null);
                }}
                invalid={hasUrlError}
                aria-describedby={hasUrlError ? urlValidationId : undefined}
                inputClassName="min-h-11"
                maxLength={2000}
              />
            </FieldBlock>
          </>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {showWallpaper ? (
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => onImageChange(null)}
              disabled={image === null || isConfirming}
            >
              {removeImageLabel}
            </Button>
          ) : null}
          <Button variant="ghost" className="min-h-11" onClick={onReset} disabled={isConfirming}>
            {resetLabel}
          </Button>
        </div>
      </div>
    </RoomOperationDialogFrame>
  );
}
