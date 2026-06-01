import { Input, InteractivePill } from '@navet/app/components/primitives';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import type { TranslateFn } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';

interface RSSSetupTabContentProps {
  providerName: string;
  providerUrl: string;
  onProviderNameChange: (name: string) => void;
  onProviderUrlChange: (url: string) => void;
  onAddProvider: () => void;
  articleCount: number;
  onArticleCountChange: (count: number) => void;
  canAddProvider: boolean;
  inputStyle: CSSProperties;
  surface: RSSFeedCardSurfaceTokens;
  theme: ThemeType;
  accentColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  t: TranslateFn;
}

export function RSSSetupTabContent({
  providerName,
  providerUrl,
  onProviderNameChange,
  onProviderUrlChange,
  onAddProvider,
  articleCount,
  onArticleCountChange,
  canAddProvider,
  inputStyle,
  surface,
  theme,
  accentColor,
  textPrimaryColor,
  textSecondaryColor,
  t,
}: RSSSetupTabContentProps) {
  return (
    <div className="space-y-4">
      <DialogSectionRow
        label={t('rss.settings.addFeed')}
        helperText={t('rss.settings.addFeedDescription')}
      >
        <div className="space-y-3">
          <Input
            type="text"
            value={providerName}
            onChange={(event) => onProviderNameChange(event.target.value)}
            placeholder={t('rss.settings.providerName')}
            inputClassName={`${surface.surface.inputBg} ${surface.surface.border} ${surface.surface.textPrimary} placeholder:text-[var(--rss-placeholder-color)] rounded-2xl`}
            style={inputStyle}
          />
          <Input
            type="url"
            value={providerUrl}
            onChange={(event) => onProviderUrlChange(event.target.value)}
            placeholder={t('rss.settings.providerUrl')}
            inputClassName={`${surface.surface.inputBg} ${surface.surface.border} ${surface.surface.textPrimary} placeholder:text-[var(--rss-placeholder-color)] rounded-2xl`}
            style={inputStyle}
          />
          <div className="flex items-center gap-2">
            <InteractivePill
              active={canAddProvider}
              intent="action"
              onClick={onAddProvider}
              disabled={!canAddProvider}
              className="min-h-9 px-4 text-sm"
              style={getRSSDialogPillStyle({
                theme,
                accentColor,
                isActive: canAddProvider,
                textPrimaryColor,
                textSecondaryColor,
              })}
            >
              <Plus className="h-4 w-4" />
              {t('rss.settings.addFeed')}
            </InteractivePill>
          </div>
        </div>
      </DialogSectionRow>

      <DialogSectionRow label={t('rss.settings.articleCount')}>
        <div className="flex gap-2">
          {[5, 10, 20, 30].map((count) => (
            <InteractivePill
              key={count}
              onClick={() => onArticleCountChange(count)}
              active={articleCount === count}
              size="compact"
              className="text-xs"
              style={getRSSDialogPillStyle({
                theme,
                accentColor,
                isActive: articleCount === count,
                textPrimaryColor,
                textSecondaryColor,
              })}
            >
              {count}
            </InteractivePill>
          ))}
        </div>
      </DialogSectionRow>
    </div>
  );
}

function getRSSDialogPillStyle({
  theme,
  accentColor,
  isActive,
  textPrimaryColor,
  textSecondaryColor,
}: {
  theme: ThemeType;
  accentColor: string;
  isActive: boolean;
  textPrimaryColor: string;
  textSecondaryColor: string;
}): CSSProperties {
  const activeBorderAlpha = theme === 'light' ? 0.24 : 0.34;
  const idleBorderAlpha = theme === 'light' ? 0.16 : 0.22;
  const activeBackgroundAlpha = theme === 'light' ? 0.14 : 0.18;
  const idleBackgroundAlpha = theme === 'light' ? 0.08 : 0.12;
  const activeShadowAlpha = theme === 'light' ? 0.14 : 0.2;

  return {
    color: isActive ? textPrimaryColor : textSecondaryColor,
    borderColor: `rgba(${hexToRgb(accentColor)}, ${isActive ? activeBorderAlpha : idleBorderAlpha})`,
    backgroundColor: `rgba(${hexToRgb(accentColor)}, ${isActive ? activeBackgroundAlpha : idleBackgroundAlpha})`,
    boxShadow: isActive
      ? `inset 0 0 0 1px rgba(${hexToRgb(accentColor)}, ${activeShadowAlpha})`
      : 'none',
  };
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}
