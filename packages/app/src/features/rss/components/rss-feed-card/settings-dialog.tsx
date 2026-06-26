import { CardDialogFooter } from '@navet/app/components/patterns';
import { BaseCardDialog, type BaseCardDialogTab, Button } from '@navet/app/components/primitives';
import {
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Palette, Plus, Sliders } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';
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
  const { accentColor } = useTheme();
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, accentColor, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const { t } = useI18n();
  const hasProviders = providers.length > 0;
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [activeTab, setActiveTab] = useState(hasProviders ? 'feeds' : 'setup');
  const hasProviderDraft = providerName.trim().length > 0 || providerUrl.trim().length > 0;
  const canAddProvider = providerName.trim().length > 0 && providerUrl.trim().length > 0;
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

  const tabs = useMemo<BaseCardDialogTab[]>(
    () => [
      {
        key: 'feeds',
        label: 'Feeds',
        icon: Sliders,
        content: (
          <div className="space-y-4">
            <RSSFeedsTabContent
              hasProviders={hasProviders}
              providers={providers}
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
          </div>
        ),
      },
      {
        key: 'setup',
        label: 'Setup',
        icon: Plus,
        content: (
          <div className="space-y-4">
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
          </div>
        ),
      },
      {
        key: 'card',
        label: t('common.customize'),
        icon: Palette,
        content: (
          <div className="space-y-4">
            <RSSCardTabContent
              tintColor={tintColor}
              onTintColorChange={onTintColorChange}
              defaultColor="#06b6d4"
              surface={rssSurface}
            />
          </div>
        ),
      },
    ],
    [
      activeAccentColor,
      articleCount,
      canAddProvider,
      hasProviders,
      inputStyle,
      onArticleCountChange,
      onRemoveProvider,
      onTintColorChange,
      providerName,
      providers,
      providerUrl,
      rssSurface,
      sectionStyle,
      selectedProviderIds,
      t,
      theme,
      tintColor,
    ]
  );

  const doneLabel = canAddProvider ? t('rss.settings.addFeedAndClose') : t('common.done');

  return (
    <BaseCardDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      tabs={tabs}
      theme={theme}
      roomSelector={{
        value: roomValue,
        label: roomLabel,
        options: roomOptions,
        onChange: onRoomChange,
      }}
      editableTitle={false}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      maxWidth="lg"
      scrollClassName="max-sm:max-h-[calc(100dvh-3rem)] max-sm:min-h-0 max-sm:flex-1"
      headerClassName="max-sm:mb-3"
      footerContent={
        <CardDialogFooter className="px-0 max-sm:pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
          <Button variant="secondary" size="small" onClick={() => handleOpenChange(false)}>
            {doneLabel}
          </Button>
        </CardDialogFooter>
      }
    />
  );
}
