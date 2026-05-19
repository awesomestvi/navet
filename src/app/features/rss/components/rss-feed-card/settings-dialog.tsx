import { Palette, Plus, Sliders } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { toast } from 'sonner';
import { CardDialogBody, CardDialogHeader, CardDialogTabList } from '@/app/components/patterns';
import {
  Button,
  customCardDialogShellProps,
  DialogShell,
  InteractivePill,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CompactRoomSelector } from '@/app/components/shared/device-editor';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { RSSCardTabContent } from './rss-card-tab-content';
import { RSSFeedsTabContent } from './rss-feeds-tab-content';
import { RSSSetupTabContent } from './rss-setup-tab-content';
import { getRSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSProvider } from './types';

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
    borderColor: withTintAlpha(accentColor, isActive ? 0.34 : 0.22),
    backgroundColor: withTintAlpha(accentColor, isActive ? 0.18 : 0.1),
    boxShadow: isActive ? `inset 0 0 0 1px ${withTintAlpha(accentColor, 0.16)}` : 'none',
  };
}

interface RSSFeedSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  theme: ThemeType;
  primaryColorValue: string;
  providers: RSSProvider[];
  homeAssistantProviders: RSSProvider[];
  selectedProviderIds: string[];
  onSelectedProviderIdsChange: (providerIds: string[]) => void;
  onAddProvider: (name: string, feedUrl: string) => boolean;
  onRemoveProvider: (providerId: string) => void;
  articleCount: number;
  onArticleCountChange: (count: number) => void;
  onRoomChange?: (room: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function RSSFeedSettingsDialog({
  isOpen,
  onOpenChange,
  title,
  roomValue,
  roomLabel,
  roomOptions,
  theme,
  primaryColorValue,
  providers,
  homeAssistantProviders,
  selectedProviderIds,
  onSelectedProviderIdsChange,
  onAddProvider,
  onRemoveProvider,
  articleCount,
  onArticleCountChange,
  onRoomChange,
  tintColor,
  onTintColorChange,
}: RSSFeedSettingsDialogProps) {
  const surface = getThemeSurfaceTokens(theme);
  const { accentColor, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, accentColor, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const { t } = useI18n();
  const directProviders = providers.filter((provider) => provider.type === 'url');
  const hasProviders = providers.length > 0;
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [activeTab, setActiveTab] = useState(hasProviders ? 'feeds' : 'setup');
  const hasProviderDraft = providerName.trim().length > 0 || providerUrl.trim().length > 0;
  const canAddProvider = providerName.trim().length > 0 && providerUrl.trim().length > 0;
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    maxWidth: 'lg',
    padding: false,
    fallbackDecoration: {
      glowClassName: `bg-linear-to-br ${colors.rss.glow} to-transparent`,
      overlayClassName: rssSurface.overlayClassName,
    },
    fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl ${cardShell.backdropClassName} bg-linear-to-br ${colors.rss.gradient} ${colors.rss.border}`,
  });
  const activeAccentColor = resolvedTintColor ?? primaryColorValue;
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, activeAccentColor);
  const inputStyle = {
    ...sectionStyle,
    '--rss-placeholder-color': withTintAlpha(activeAccentColor, theme === 'light' ? 0.58 : 0.68),
  } as CSSProperties;

  const handleToggleProvider = (providerId: string) => {
    const isSelected = selectedProviderIds.includes(providerId);
    onSelectedProviderIdsChange(
      isSelected
        ? selectedProviderIds.filter((id) => id !== providerId)
        : [...selectedProviderIds, providerId]
    );
  };

  const finalizePendingProvider = () => {
    if (!hasProviderDraft) {
      return true;
    }

    if (!canAddProvider) {
      setActiveTab('setup');
      toast.error(t('rss.feedback.finishAddingFeed'));
      return false;
    }

    const wasAdded = onAddProvider(providerName, providerUrl);
    if (wasAdded) {
      setProviderName('');
      setProviderUrl('');
      setActiveTab('feeds');
    }

    return wasAdded;
  };

  const handleAddProvider = () => {
    void finalizePendingProvider();
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      onOpenChange(true);
      return;
    }

    if (finalizePendingProvider()) {
      onOpenChange(false);
    }
  };

  const doneLabel = canAddProvider ? t('rss.settings.addFeedAndClose') : t('common.done');

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <div className="h-full overflow-x-hidden overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] max-sm:max-h-[calc(100dvh-3rem)] [&::-webkit-scrollbar]:hidden">
        <CardDialogBody>
          <CardDialogHeader
            title={title}
            description={t('rss.settings.title')}
            className="max-sm:mb-3"
            eyebrow={
              <CompactRoomSelector
                value={roomValue}
                label={roomLabel}
                options={roomOptions}
                onChange={onRoomChange}
              />
            }
          />

          <Tabs
            value={activeTab}
            defaultValue={hasProviders ? 'feeds' : 'setup'}
            onValueChange={setActiveTab}
          >
            <CardDialogTabList className="max-sm:flex max-sm:flex-wrap max-sm:gap-1.5">
              <InteractivePill
                active={activeTab === 'feeds'}
                size="compact"
                icon={Sliders}
                className="text-xs"
                style={getRSSDialogPillStyle({
                  accentColor: activeAccentColor,
                  isActive: activeTab === 'feeds',
                  textPrimaryColor: rssSurface.textPrimaryColor,
                  textSecondaryColor: rssSurface.sourceColor,
                })}
                onClick={() => setActiveTab('feeds')}
              >
                Feeds
              </InteractivePill>
              <InteractivePill
                active={activeTab === 'setup'}
                size="compact"
                icon={Plus}
                className="text-xs"
                style={getRSSDialogPillStyle({
                  accentColor: activeAccentColor,
                  isActive: activeTab === 'setup',
                  textPrimaryColor: rssSurface.textPrimaryColor,
                  textSecondaryColor: rssSurface.sourceColor,
                })}
                onClick={() => setActiveTab('setup')}
              >
                Setup
              </InteractivePill>
              <InteractivePill
                active={activeTab === 'card'}
                size="compact"
                icon={Palette}
                className="text-xs"
                style={getRSSDialogPillStyle({
                  accentColor: activeAccentColor,
                  isActive: activeTab === 'card',
                  textPrimaryColor: rssSurface.textPrimaryColor,
                  textSecondaryColor: rssSurface.sourceColor,
                })}
                onClick={() => setActiveTab('card')}
              >
                {t('common.customize')}
              </InteractivePill>
            </CardDialogTabList>

            <TabPanel value="feeds" className="mt-5 space-y-4 max-sm:mt-3">
              <RSSFeedsTabContent
                hasProviders={hasProviders}
                homeAssistantProviders={homeAssistantProviders}
                directProviders={directProviders}
                selectedProviderIds={selectedProviderIds}
                onToggleProvider={handleToggleProvider}
                onRemoveProvider={onRemoveProvider}
                accentColorValue={activeAccentColor}
                textPrimaryColor={rssSurface.textPrimaryColor}
                textSecondaryColor={rssSurface.sourceColor}
                sectionStyle={sectionStyle}
                surface={rssSurface}
                t={t}
              />
            </TabPanel>

            <TabPanel value="setup" className="mt-5 space-y-4 max-sm:mt-3">
              <RSSSetupTabContent
                providerName={providerName}
                providerUrl={providerUrl}
                onProviderNameChange={setProviderName}
                onProviderUrlChange={setProviderUrl}
                onAddProvider={handleAddProvider}
                articleCount={articleCount}
                onArticleCountChange={onArticleCountChange}
                canAddProvider={canAddProvider}
                inputStyle={inputStyle}
                surface={rssSurface}
                accentColor={activeAccentColor}
                textPrimaryColor={rssSurface.textPrimaryColor}
                textSecondaryColor={rssSurface.sourceColor}
                t={t}
              />
            </TabPanel>

            <TabPanel value="card" className="mt-5 space-y-4 max-sm:mt-3">
              <RSSCardTabContent
                tintColor={tintColor}
                onTintColorChange={onTintColorChange}
                defaultColor="#06b6d4"
                surface={rssSurface}
              />
            </TabPanel>
          </Tabs>

          <div className="mt-6 flex justify-end max-sm:mt-3">
            <Button variant="soft" size="small" onClick={() => handleOpenChange(false)}>
              {doneLabel}
            </Button>
          </div>
        </CardDialogBody>
      </div>
    </DialogShell>
  );
}
