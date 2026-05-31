import { Input, InteractivePill } from '@navet/app/components/primitives';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import type { TranslateFn } from '@navet/app/hooks';
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
  accentColor,
  isActive,
  textPrimaryColor,
  textSecondaryColor,
}: {
  accentColor: string;
  isActive: boolean;
  textPrimaryColor: string;
  textSecondaryColor: string;
}): CSSProperties {
  return {
    color: isActive ? textPrimaryColor : textSecondaryColor,
    borderColor: `rgba(${hexToRgb(accentColor)}, ${isActive ? 0.34 : 0.22})`,
    backgroundColor: `rgba(${hexToRgb(accentColor)}, ${isActive ? 0.18 : 0.1})`,
    boxShadow: isActive ? `inset 0 0 0 1px rgba(${hexToRgb(accentColor)}, 0.16)` : 'none',
  };
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}
