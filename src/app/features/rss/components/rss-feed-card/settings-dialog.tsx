import * as Dialog from '@radix-ui/react-dialog';
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  CompactRoomSelector,
  DialogHeader,
  DialogSectionRow,
} from '@/app/components/shared/device-editor';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type TranslateFn, useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
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
}: RSSFeedSettingsDialogProps) {
  const surface = getThemeSurfaceTokens(theme);
  const { t } = useI18n();
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);
  const canAddProvider = providerName.trim().length > 0 && providerUrl.trim().length > 0;

  const directProviders = providers.filter((provider) => provider.type === 'url');
  const hasProviders = providers.length > 0;

  const handleToggleProvider = (providerId: string) => {
    const isSelected = selectedProviderIds.includes(providerId);
    onSelectedProviderIdsChange(
      isSelected
        ? selectedProviderIds.filter((id) => id !== providerId)
        : [...selectedProviderIds, providerId]
    );
  };

  const handleAddProvider = () => {
    const wasAdded = onAddProvider(providerName, providerUrl);
    if (wasAdded) {
      setProviderName('');
      setProviderUrl('');
      setIsAddFeedOpen(false);
    }
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={`fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
    >
      <DialogHeader
        title={t('rss.settings.title')}
        description={t('rss.settings.description', { title })}
        isOn={theme !== 'light'}
      />
      <DialogSectionRow label={t('common.room')}>
        <CompactRoomSelector
          value={roomValue}
          label={roomLabel}
          options={roomOptions}
          onChange={onRoomChange}
        />
      </DialogSectionRow>

      <div className="mb-5 space-y-4">
        {hasProviders ? (
          <div className="space-y-4">
            {homeAssistantProviders.length > 0 ? (
              <RSSProviderGroup
                title="Available Home Assistant feeds"
                providers={homeAssistantProviders}
                selectedProviderIds={selectedProviderIds}
                onToggleProvider={handleToggleProvider}
                primaryColorValue={primaryColorValue}
                surface={surface}
                t={t}
              />
            ) : null}

            {directProviders.length > 0 ? (
              <RSSProviderGroup
                title="Saved direct feeds"
                providers={directProviders}
                selectedProviderIds={selectedProviderIds}
                onToggleProvider={handleToggleProvider}
                onRemoveProvider={onRemoveProvider}
                primaryColorValue={primaryColorValue}
                surface={surface}
                t={t}
              />
            ) : null}
          </div>
        ) : (
          <div
            className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${surface.border} ${surface.textSecondary}`}
          >
            No RSS sources yet. Add a direct feed to get started.
          </div>
        )}

        <div className={`rounded-2xl border ${surface.border} ${surface.subtleBg}`}>
          <button
            type="button"
            onClick={() => setIsAddFeedOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <div className={`text-sm font-medium ${surface.textPrimary}`}>Add feed</div>
              <div className={`mt-1 text-xs ${surface.textSecondary}`}>
                Add a custom RSS URL and select it automatically for this card.
              </div>
            </div>
            {isAddFeedOpen ? (
              <ChevronUp className={`h-4 w-4 ${surface.textSecondary}`} />
            ) : (
              <ChevronDown className={`h-4 w-4 ${surface.textSecondary}`} />
            )}
          </button>

          {isAddFeedOpen ? (
            <div className="space-y-3 border-t px-4 py-4">
              <input
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder={t('rss.settings.providerName')}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${surface.inputBg} ${surface.border} ${surface.textPrimary} ${surface.placeholder}`}
              />
              <input
                value={providerUrl}
                onChange={(event) => setProviderUrl(event.target.value)}
                placeholder={t('rss.settings.providerUrl')}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${surface.inputBg} ${surface.border} ${surface.textPrimary} ${surface.placeholder}`}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddProvider}
                  disabled={!canAddProvider}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: primaryColorValue }}
                >
                  <Plus className="h-4 w-4" />
                  Add feed
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddFeedOpen(false)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <div className={`mb-2 text-xs font-medium ${surface.textSecondary}`}>
          {t('rss.settings.articleCount')}
        </div>
        <div className="flex gap-2">
          {[5, 10, 20, 30].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onArticleCountChange(count)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                articleCount === count
                  ? `${surface.textPrimary} ${surface.subtleBg} ring-1 ring-inset ring-white/20`
                  : `${surface.textSecondary} ${surface.hoverBg}`
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Dialog.Close asChild>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${surface.textPrimary} ${surface.subtleBg} ${surface.hoverBg}`}
          >
            {t('common.done')}
          </button>
        </Dialog.Close>
      </div>
    </DialogShell>
  );
}

function RSSProviderGroup({
  title,
  providers,
  selectedProviderIds,
  onToggleProvider,
  onRemoveProvider,
  primaryColorValue,
  surface,
  t,
}: {
  title: string;
  providers: RSSProvider[];
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  onRemoveProvider?: (providerId: string) => void;
  primaryColorValue: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  t: TranslateFn;
}) {
  return (
    <div className="space-y-2">
      <div className={`text-xs font-medium ${surface.textSecondary}`}>{title}</div>
      {providers.map((provider) => {
        const isSelected = selectedProviderIds.includes(provider.id);
        const secondaryLabel =
          provider.type === 'home-assistant-feedreader' ? provider.entityId : provider.feedUrl;
        const isRemovable = provider.type === 'url' && onRemoveProvider;

        return (
          <div
            key={provider.id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${surface.border} ${surface.subtleBg}`}
          >
            <button
              type="button"
              onClick={() => onToggleProvider(provider.id)}
              className="min-w-0 flex flex-1 items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                  {provider.name}
                </div>
                <div className={`mt-0.5 truncate text-xs ${surface.textSecondary}`}>
                  {secondaryLabel}
                </div>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  !isSelected ? `${surface.border} bg-transparent` : ''
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: primaryColorValue,
                        backgroundColor: primaryColorValue,
                        color: '#ffffff',
                      }
                    : undefined
                }
              >
                {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
              </div>
            </button>

            {isRemovable ? (
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    onRemoveProvider?.(provider.id);
                  }}
                  className={`rounded-xl p-2 ${surface.textSecondary} ${surface.hoverBg}`}
                  aria-label={t('rss.settings.removeProvider', { name: provider.name })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
