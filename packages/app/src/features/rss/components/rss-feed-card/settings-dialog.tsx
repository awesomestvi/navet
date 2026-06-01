import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { Button, customCardDialogShellProps, DialogShell } from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CompactRoomSelector, CustomScrollbar } from '@navet/app/components/shared/device-editor';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Palette, Plus, Sliders } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { toast } from 'sonner';
import { RSSCardTabContent } from './rss-card-tab-content';
import { RSSFeedsTabContent } from './rss-feeds-tab-content';
import { RSSSetupTabContent } from './rss-setup-tab-content';
import { getRSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSProvider } from './types';

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
  const isOn = theme !== 'light';

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
      <CustomScrollbar
        isOn={isOn}
        className="max-sm:max-h-[calc(100dvh-3rem)] max-sm:min-h-0 max-sm:flex-1"
      >
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
              <CardDialogTabTrigger
                active={activeTab === 'feeds'}
                icon={Sliders}
                onClick={() => setActiveTab('feeds')}
              >
                Feeds
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'setup'}
                icon={Plus}
                onClick={() => setActiveTab('setup')}
              >
                Setup
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                {t('common.customize')}
              </CardDialogTabTrigger>
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
                theme={theme}
                textPrimaryColor={rssSurface.textPrimaryColor}
                textSecondaryColor={rssSurface.textSecondaryColor}
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
                theme={theme}
                accentColor={activeAccentColor}
                textPrimaryColor={rssSurface.textPrimaryColor}
                textSecondaryColor={rssSurface.textSecondaryColor}
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
        </CardDialogBody>
        <CardDialogFooter className="px-6 pb-6 max-sm:px-3.5 max-sm:pb-3">
          <Button variant="soft" size="small" onClick={() => handleOpenChange(false)}>
            {doneLabel}
          </Button>
        </CardDialogFooter>
      </CustomScrollbar>
    </DialogShell>
  );
}
