import { Input } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { normalizeLightIconName, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

const FEATURED_CHORE_ICON_NAMES = [
  'ListChecks',
  'Utensils',
  'Trash2',
  'SprayCan',
  'BedDouble',
  'Shirt',
  'Dog',
  'ShoppingBasket',
] as const;

export function ChoreIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const groupName = useId();
  const [draftIconName, setDraftIconName] = useState(value);

  useEffect(() => setDraftIconName(value), [value]);

  const choices: Array<{ name: string; icon: LucideIcon | null }> = FEATURED_CHORE_ICON_NAMES.map(
    (name) => ({
      name,
      icon: resolveLightIconComponent(name),
    })
  );
  const normalizedDraftName = normalizeLightIconName(draftIconName);
  const invalidIconName = Boolean(
    draftIconName.trim() && !resolveLightIconComponent(normalizedDraftName)
  );
  const PreviewIcon = resolveLightIconComponent(value);

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-[20px] border p-2.5',
          surface.panelMuted,
          surface.borderStrong
        )}
      >
        {choices.map(({ name, icon: Icon }) => {
          const selected = value === name;
          return (
            <label
              key={name}
              className={cn(
                'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] active:scale-95 motion-reduce:transition-none',
                surface.border,
                surface.hoverBg,
                selected ? 'text-white' : surface.textPrimary
              )}
              style={
                selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined
              }
              title={name}
            >
              <input
                className={cn(
                  'absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent',
                  getThemeFocusRingClassName(theme)
                )}
                type="radio"
                name={groupName}
                value={name}
                checked={selected}
                aria-label={name}
                onChange={() => {
                  setDraftIconName(name);
                  onChange(name);
                }}
              />
              {Icon ? <Icon aria-hidden="true" className="h-[18px] w-[18px]" /> : null}
            </label>
          );
        })}
      </div>
      <div className="flex items-start gap-2">
        <div
          role="img"
          aria-label={value}
          title={value}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-white',
            surface.borderStrong
          )}
          style={{ backgroundColor: accentColor, borderColor: accentColor }}
        >
          {PreviewIcon ? <PreviewIcon aria-hidden="true" className="h-[18px] w-[18px]" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <Input
            type="text"
            size="small"
            value={draftIconName}
            invalid={invalidIconName}
            aria-label={t('household.personDialog.avatarSearch')}
            placeholder={t('household.personDialog.avatarSearch')}
            onChange={(event) => {
              const nextDraft = event.target.value.slice(0, 64);
              const normalizedName = normalizeLightIconName(nextDraft);
              setDraftIconName(nextDraft);
              if (resolveLightIconComponent(normalizedName)) onChange(normalizedName);
            }}
          />
          {invalidIconName ? (
            <p className="mt-1 text-xs text-red-400" role="alert">
              {t('household.personDialog.avatarNoIcons')}
            </p>
          ) : null}
        </div>
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
    </div>
  );
}
