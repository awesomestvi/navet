import { Button, ColorInputSwatch, Input, InteractivePill } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  getThemeFocusRingClassName,
  navetIconSizeTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@navet/app/components/ui/avatar';
import { cn } from '@navet/app/components/ui/utils';
import {
  isEmojiLightIcon,
  normalizeLightIconName,
  resolveLightIconComponent,
} from '@navet/app/constants/icon-map';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ExternalLink, Image as ImageIcon, ImagePlus, type LucideIcon, Shapes } from 'lucide-react';
import { type RefObject, useEffect, useId, useState } from 'react';

const FEATURED_ICON_NAMES = [
  'UserRound',
  'Smile',
  'Sparkles',
  'Heart',
  'Star',
  'Cat',
  'Leaf',
] as const;

function ProfileAvatar({
  color,
  avatarUrl,
  avatarIcon,
}: {
  color: string;
  avatarUrl: string;
  avatarIcon: string;
}) {
  const Icon = resolveLightIconComponent(avatarIcon || 'UserRound');
  return (
    <Avatar className="h-14 w-14 border-2" style={{ backgroundColor: color, borderColor: color }}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
        {avatarIcon && isEmojiLightIcon(avatarIcon) ? (
          <span aria-hidden="true">{avatarIcon.trim()}</span>
        ) : Icon ? (
          <Icon aria-hidden="true" className={navetIconSizeTokens.md} />
        ) : (
          <span aria-hidden="true">•</span>
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function LucideLibraryPicker({
  value,
  accentColor,
  onChange,
}: {
  value: string;
  accentColor: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const groupName = useId();
  const [draftIconName, setDraftIconName] = useState(value);
  useEffect(() => setDraftIconName(value), [value]);
  const choices: Array<{ name: string; icon?: LucideIcon; label: string }> =
    FEATURED_ICON_NAMES.map((name) => ({
      name,
      icon: resolveLightIconComponent(name) ?? undefined,
      label: name,
    }));
  const normalizedDraftName = normalizeLightIconName(draftIconName);
  const invalidIconName = Boolean(
    draftIconName.trim() && !resolveLightIconComponent(normalizedDraftName)
  );

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-[20px] border p-2.5',
          surface.panelMuted,
          surface.borderStrong
        )}
      >
        {choices.map((choice) => {
          const selected = (value || 'UserRound') === choice.name;
          const Icon = choice.icon;
          return (
            <label
              key={choice.name}
              className={cn(
                'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold transition-[background-color,border-color,color,transform] active:scale-95 motion-reduce:transition-none',
                surface.border,
                surface.hoverBg,
                selected ? 'text-white' : surface.textPrimary
              )}
              style={
                selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined
              }
              title={choice.label}
            >
              <input
                className={cn(
                  'absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent',
                  getThemeFocusRingClassName(theme)
                )}
                type="radio"
                name={groupName}
                value={choice.name}
                checked={selected}
                aria-label={choice.label}
                onChange={() => {
                  setDraftIconName(choice.name);
                  onChange(choice.name);
                }}
              />
              {Icon ? <Icon aria-hidden="true" className="h-[18px] w-[18px]" /> : null}
            </label>
          );
        })}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            size="small"
            value={draftIconName}
            invalid={invalidIconName}
            containerClassName="min-w-0 flex-1"
            aria-label={t('household.personDialog.avatarSearch')}
            placeholder={t('household.personDialog.avatarSearch')}
            onChange={(event) => {
              const nextDraft = event.target.value.slice(0, 64);
              const normalizedName = normalizeLightIconName(nextDraft);
              setDraftIconName(nextDraft);
              if (!nextDraft.trim()) onChange('');
              else if (resolveLightIconComponent(normalizedName)) onChange(normalizedName);
            }}
          />
          <a
            href="https://lucide.dev/icons/"
            target="_blank"
            rel="noreferrer"
            aria-label={t('household.personDialog.avatarLucideCatalog')}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium underline underline-offset-4',
              surface.textSecondary,
              surface.hoverBg,
              getThemeFocusRingClassName(theme)
            )}
          >
            <span className="hidden sm:inline">
              {t('household.personDialog.avatarLucideCatalog')}
            </span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
        {invalidIconName ? (
          <p className="text-xs text-red-400" role="alert">
            {t('household.personDialog.avatarNoIcons')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ChoreProfileAppearanceEditor({
  displayName,
  color,
  avatarUrl,
  avatarIcon,
  avatarProcessing,
  avatarUploadError,
  avatarInputRef,
  onUploadAvatar,
  onRemoveAvatar,
  onIconChange,
  onColorChange,
}: {
  displayName: string;
  color: string;
  avatarUrl: string;
  avatarIcon: string;
  avatarProcessing: boolean;
  avatarUploadError: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onUploadAvatar: (file?: File) => void;
  onRemoveAvatar: () => void;
  onIconChange: (iconName: string) => void;
  onColorChange: (color: string) => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [mode, setMode] = useState<'photo' | 'icon'>(avatarIcon && !avatarUrl ? 'icon' : 'photo');

  useEffect(() => {
    if (avatarUrl) setMode('photo');
    else if (avatarIcon) setMode('icon');
  }, [avatarIcon, avatarUrl]);

  return (
    <section
      aria-label={t('household.personDialog.avatarAppearance')}
      className={cn('rounded-[24px] border p-4', surface.subtleBg, surface.borderStrong)}
    >
      <div className="flex items-center gap-3">
        <ProfileAvatar color={color} avatarUrl={avatarUrl} avatarIcon={avatarIcon} />
        <div className="min-w-0 flex-1">
          <h3 className={cn('truncate', navetTypographyTokens.titleSm, surface.textPrimary)}>
            {displayName}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn('hidden text-xs font-medium sm:inline', surface.textSecondary)}>
            {t('household.personDialog.color')}
          </span>
          <ColorInputSwatch
            value={color}
            mode="picker"
            size="medium"
            selected
            ariaLabel={t('household.personDialog.color')}
            onChange={onColorChange}
          />
        </div>
      </div>

      <div className={cn('mt-4 border-t pt-4', surface.border)}>
        <div className="mb-3 flex gap-2">
          <InteractivePill
            active={mode === 'photo'}
            accentColor={accentColor}
            icon={ImageIcon}
            size="compact"
            onClick={() => setMode('photo')}
          >
            {t('household.personDialog.avatarModePhoto')}
          </InteractivePill>
          <InteractivePill
            active={mode === 'icon'}
            accentColor={accentColor}
            icon={Shapes}
            size="compact"
            onClick={() => setMode('icon')}
          >
            {t('household.personDialog.avatarModeIcon')}
          </InteractivePill>
        </div>

        {mode === 'photo' ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                loading={avatarProcessing}
                leading={<ImagePlus aria-hidden="true" className={navetIconSizeTokens.sm} />}
                onClick={() => avatarInputRef.current?.click()}
              >
                {t('household.personDialog.avatarUpload')}
              </Button>
              {avatarUrl ? (
                <Button type="button" variant="ghost" size="compact" onClick={onRemoveAvatar}>
                  {t('household.personDialog.avatarRemove')}
                </Button>
              ) : null}
            </div>
            <input
              ref={avatarInputRef}
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={t('household.personDialog.avatarUpload')}
              onChange={(event) => onUploadAvatar(event.target.files?.[0])}
            />
            <p className={cn('mt-2', navetTypographyTokens.compactHelper, surface.textSecondary)}>
              {t('settings.appearance.wallpaper.fileHint')}
            </p>
            {avatarUploadError ? (
              <p className="mt-2 text-xs text-red-400" role="alert">
                {avatarUploadError}
              </p>
            ) : null}
          </div>
        ) : (
          <LucideLibraryPicker value={avatarIcon} accentColor={color} onChange={onIconChange} />
        )}
      </div>
    </section>
  );
}
