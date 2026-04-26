import { Check, Palette, Plus, Sliders, Trash2 } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { toast } from 'sonner';
import { CardDialogHeader, CardDialogTabList } from '@/app/components/patterns';
import {
  Button,
  customCardDialogShellProps,
  DialogFooter,
  DialogShell,
  Input,
  InteractivePill,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import {
  CompactRoomSelector,
  CustomCardTintPicker,
  CustomScrollbar,
  DialogSectionRow,
} from '@/app/components/shared/device-editor';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type TranslateFn, useI18n, useTheme } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
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
  const { colors, primaryColor } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, primaryColor, tintColor);
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
      <CustomScrollbar isOn={theme !== 'light'}>
        <div className="p-6">
          <CardDialogHeader
            title={title}
            description={t('rss.settings.title')}
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
            <CardDialogTabList>
              <InteractivePill
                active={activeTab === 'feeds'}
                size="compact"
                icon={Sliders}
                className="min-h-8 px-3 text-xs"
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
                className="min-h-8 px-3 text-xs"
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
                className="min-h-8 px-3 text-xs"
                style={getRSSDialogPillStyle({
                  accentColor: activeAccentColor,
                  isActive: activeTab === 'card',
                  textPrimaryColor: rssSurface.textPrimaryColor,
                  textSecondaryColor: rssSurface.sourceColor,
                })}
                onClick={() => setActiveTab('card')}
              >
                Customize
              </InteractivePill>
            </CardDialogTabList>

            <TabPanel value="feeds" className="mt-5 space-y-4">
              {hasProviders ? (
                <>
                  {homeAssistantProviders.length > 0 ? (
                    <RSSProviderGroup
                      title={t('rss.settings.availableHomeAssistantFeeds')}
                      providers={homeAssistantProviders}
                      selectedProviderIds={selectedProviderIds}
                      onToggleProvider={handleToggleProvider}
                      accentColorValue={activeAccentColor}
                      textPrimaryColor={rssSurface.textPrimaryColor}
                      textSecondaryColor={rssSurface.sourceColor}
                      sectionStyle={sectionStyle}
                      surface={surface}
                      t={t}
                    />
                  ) : null}

                  {directProviders.length > 0 ? (
                    <RSSProviderGroup
                      title={t('rss.settings.savedDirectFeeds')}
                      providers={directProviders}
                      selectedProviderIds={selectedProviderIds}
                      onToggleProvider={handleToggleProvider}
                      onRemoveProvider={onRemoveProvider}
                      accentColorValue={activeAccentColor}
                      textPrimaryColor={rssSurface.textPrimaryColor}
                      textSecondaryColor={rssSurface.sourceColor}
                      sectionStyle={sectionStyle}
                      surface={surface}
                      t={t}
                    />
                  ) : null}
                </>
              ) : (
                <div
                  className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${surface.border} ${surface.textSecondary}`}
                >
                  {t('rss.settings.emptyState')}
                </div>
              )}
            </TabPanel>

            <TabPanel value="setup" className="mt-5 space-y-4">
              <DialogSectionRow
                label={t('rss.settings.addFeed')}
                helperText={t('rss.settings.addFeedDescription')}
              >
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={providerName}
                    onChange={(event) => setProviderName(event.target.value)}
                    placeholder={t('rss.settings.providerName')}
                    inputClassName={`${surface.inputBg} ${surface.border} ${surface.textPrimary} placeholder:text-[var(--rss-placeholder-color)] rounded-2xl`}
                    style={inputStyle}
                  />
                  <Input
                    type="url"
                    value={providerUrl}
                    onChange={(event) => setProviderUrl(event.target.value)}
                    placeholder={t('rss.settings.providerUrl')}
                    inputClassName={`${surface.inputBg} ${surface.border} ${surface.textPrimary} placeholder:text-[var(--rss-placeholder-color)] rounded-2xl`}
                    style={inputStyle}
                  />
                  <div className="flex items-center gap-2">
                    <InteractivePill
                      active={canAddProvider}
                      intent="action"
                      onClick={handleAddProvider}
                      disabled={!canAddProvider}
                      className="min-h-9 px-4 text-sm"
                      style={getRSSDialogPillStyle({
                        accentColor: activeAccentColor,
                        isActive: canAddProvider,
                        textPrimaryColor: rssSurface.textPrimaryColor,
                        textSecondaryColor: rssSurface.sourceColor,
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
                      className="min-h-8 px-3 text-xs"
                      style={getRSSDialogPillStyle({
                        accentColor: activeAccentColor,
                        isActive: articleCount === count,
                        textPrimaryColor: rssSurface.textPrimaryColor,
                        textSecondaryColor: rssSurface.sourceColor,
                      })}
                    >
                      {count}
                    </InteractivePill>
                  ))}
                </div>
              </DialogSectionRow>
            </TabPanel>

            <TabPanel value="card" className="mt-5 space-y-4">
              {onTintColorChange ? (
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  defaultColor="#06b6d4"
                  className={surface.textMuted}
                />
              ) : null}
            </TabPanel>
          </Tabs>

          <DialogFooter>
            <Button variant="soft" size="small" onClick={() => handleOpenChange(false)}>
              {doneLabel}
            </Button>
          </DialogFooter>
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
}

function RSSProviderGroup({
  title,
  providers,
  selectedProviderIds,
  onToggleProvider,
  onRemoveProvider,
  accentColorValue,
  textPrimaryColor,
  textSecondaryColor,
  sectionStyle,
  surface,
  t,
}: {
  title: string;
  providers: RSSProvider[];
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  onRemoveProvider?: (providerId: string) => void;
  accentColorValue: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  sectionStyle?: CSSProperties;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  t: TranslateFn;
}) {
  return (
    <DialogSectionRow label={title}>
      <div className="space-y-2">
        {providers.map((provider) => {
          const isSelected = selectedProviderIds.includes(provider.id);
          const secondaryLabel =
            provider.type === 'home-assistant-feedreader' ? provider.entityId : provider.feedUrl;
          const isRemovable = provider.type === 'url' && onRemoveProvider;
          const rowStyle = {
            ...sectionStyle,
            backgroundColor: withTintAlpha(accentColorValue, isSelected ? 0.18 : 0.1),
            borderColor: withTintAlpha(accentColorValue, isSelected ? 0.38 : 0.24),
          } satisfies CSSProperties;

          return (
            <div
              key={provider.id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${surface.border}`}
              style={rowStyle}
            >
              <button
                type="button"
                onClick={() => onToggleProvider(provider.id)}
                className="min-w-0 flex flex-1 items-center gap-3 text-left"
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    !isSelected ? `${surface.border} bg-transparent` : ''
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: accentColorValue,
                          backgroundColor: accentColorValue,
                          color: '#ffffff',
                        }
                      : {
                          borderColor: withTintAlpha(accentColorValue, 0.34),
                          color: textSecondaryColor,
                        }
                  }
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" style={{ color: textPrimaryColor }}>
                    {provider.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs" style={{ color: textSecondaryColor }}>
                    {secondaryLabel}
                  </div>
                </div>
              </button>

              {isRemovable ? (
                <div className="shrink-0">
                  <InteractivePill
                    active={false}
                    intent="action"
                    size="compact"
                    className="shrink-0 min-h-8 w-8 px-0"
                    onClick={(event) => {
                      event.preventDefault();
                      onRemoveProvider?.(provider.id);
                    }}
                    style={{
                      backgroundColor: withTintAlpha(accentColorValue, 0.1),
                      color: textSecondaryColor,
                      borderColor: withTintAlpha(accentColorValue, 0.24),
                    }}
                    aria-label={t('rss.settings.removeProvider', { name: provider.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </InteractivePill>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </DialogSectionRow>
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
    borderColor: withTintAlpha(accentColor, isActive ? 0.34 : 0.22),
    backgroundColor: withTintAlpha(accentColor, isActive ? 0.18 : 0.1),
    boxShadow: isActive ? `inset 0 0 0 1px ${withTintAlpha(accentColor, 0.16)}` : 'none',
  };
}
