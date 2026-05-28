import type { HassEntity } from 'home-assistant-js-websocket';
import { Music2, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Input, Select } from '@/app/components/primitives';
import { useHomeAssistant, useI18n, useServiceActionHandler } from '@/app/hooks';
import type { HomeAssistantEntityRegistryEntry } from '@/app/services/home-assistant.service';
import { integrationMediaFeatureService } from '@/app/services/integration-media-feature.service';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import type { MediaDialogController } from './use-media-dialog-controller';

const PLAY_MEDIA_FEATURE = 512;

interface SpotifyPlaybackTarget {
  entityId: string;
  name: string;
  sourceList: string[];
}

interface MediaSpotifyPlaybackProps {
  controller: MediaDialogController;
  entityId: string;
  entityName: string;
}

export function selectMediaPlaybackData(state: HomeAssistantStore) {
  return {
    entities: state.entities,
    entityRegistry: state.entityRegistry,
  };
}

function getEntityName(entityId: string, entity?: HassEntity) {
  if (typeof entity?.attributes?.friendly_name === 'string') {
    return entity.attributes.friendly_name;
  }

  return entityId
    .replace(/^media_player\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSourceList(entity?: HassEntity) {
  return Array.isArray(entity?.attributes?.source_list)
    ? entity.attributes.source_list.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : [];
}

function getSupportedFeatures(entity?: HassEntity) {
  return typeof entity?.attributes?.supported_features === 'number'
    ? entity.attributes.supported_features
    : 0;
}

function isSpotifyEntity(
  entityId: string,
  entity: HassEntity,
  registryEntry?: HomeAssistantEntityRegistryEntry
) {
  const platform = registryEntry?.platform?.toLowerCase() ?? '';
  const name = getEntityName(entityId, entity).toLowerCase();
  return (
    platform.includes('spotify') ||
    entityId.toLowerCase().includes('spotify') ||
    name.includes('spotify')
  );
}

function inferSpotifySource(entityName: string, sourceList: string[]) {
  const normalizedEntityName = entityName.trim().toLowerCase();
  return (
    sourceList.find((source) => source.trim().toLowerCase() === normalizedEntityName) ??
    sourceList.find((source) => {
      const normalizedSource = source.trim().toLowerCase();
      return (
        normalizedEntityName.includes(normalizedSource) ||
        normalizedSource.includes(normalizedEntityName)
      );
    }) ??
    sourceList[0] ??
    ''
  );
}

function inferMediaContentType(mediaContentId: string) {
  const value = mediaContentId.trim().toLowerCase();

  if (value.includes(':playlist:') || value.includes('/playlist/')) {
    return 'playlist';
  }

  if (value.includes(':episode:') || value.includes('/episode/')) {
    return 'episode';
  }

  return 'music';
}

function getSpotifyTargets(
  entities: Record<string, HassEntity> | null,
  entityRegistry: HomeAssistantEntityRegistryEntry[]
) {
  if (!entities) return [];

  return Object.entries(entities)
    .filter(([entityId, entity]) => {
      const registryEntry = entityRegistry.find((entry) => entry.entity_id === entityId);
      return (
        entityId.startsWith('media_player.') && isSpotifyEntity(entityId, entity, registryEntry)
      );
    })
    .map(([entityId, entity]) => ({
      entityId,
      name: getEntityName(entityId, entity),
      sourceList: getSourceList(entity),
    }));
}

export function hasSpotifyPlaybackControls(
  entities: Record<string, HassEntity> | null,
  entityRegistry: HomeAssistantEntityRegistryEntry[],
  entityId: string
) {
  const currentEntity = entities?.[entityId];
  return (
    getSpotifyTargets(entities, entityRegistry).length > 0 ||
    (getSupportedFeatures(currentEntity) & PLAY_MEDIA_FEATURE) === PLAY_MEDIA_FEATURE
  );
}

export function MediaSpotifyPlayback({
  controller,
  entityId,
  entityName,
}: MediaSpotifyPlaybackProps) {
  const { t } = useI18n();
  const runAction = useServiceActionHandler();
  const { entities, entityRegistry } = useHomeAssistant(selectMediaPlaybackData);
  const currentEntity = entities?.[entityId];
  const spotifyTargets = useMemo(
    () => getSpotifyTargets(entities, entityRegistry),
    [entities, entityRegistry]
  );
  const directPlaybackSupported =
    (getSupportedFeatures(currentEntity) & PLAY_MEDIA_FEATURE) === PLAY_MEDIA_FEATURE;
  const [mediaContentId, setMediaContentId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState(() => spotifyTargets[0]?.entityId ?? '');
  const selectedTarget = spotifyTargets.find((target) => target.entityId === selectedTargetId);
  const [selectedSource, setSelectedSource] = useState(() =>
    inferSpotifySource(entityName, spotifyTargets[0]?.sourceList ?? [])
  );

  if (spotifyTargets.length === 0 && !directPlaybackSupported) {
    return null;
  }

  const resolvedTarget: SpotifyPlaybackTarget | null =
    selectedTarget ?? spotifyTargets[0] ?? (directPlaybackSupported ? null : null);
  const sourceList = resolvedTarget?.sourceList ?? [];
  const resolvedSource = selectedSource || inferSpotifySource(entityName, sourceList);
  const canSubmit =
    mediaContentId.trim().length > 0 &&
    ((resolvedTarget !== null && (sourceList.length === 0 || resolvedSource.length > 0)) ||
      directPlaybackSupported);

  const handlePlay = () => {
    const trimmedMediaContentId = mediaContentId.trim();
    if (!trimmedMediaContentId) return;

    void runAction(async () => {
      if (resolvedTarget) {
        if (resolvedSource) {
          await integrationMediaFeatureService.selectMediaPlayerSource(
            resolvedTarget.entityId,
            resolvedSource
          );
        }
        await integrationMediaFeatureService.playMedia(resolvedTarget.entityId, {
          mediaContentId: trimmedMediaContentId,
          mediaContentType: inferMediaContentType(trimmedMediaContentId),
        });
        return;
      }

      await integrationMediaFeatureService.playMedia(entityId, {
        mediaContentId: trimmedMediaContentId,
        mediaContentType: inferMediaContentType(trimmedMediaContentId),
      });
    }, t('media.feedback.playMediaFailed'));
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${controller.surface.border} ${
        controller.isGlass ? 'bg-white/8' : 'bg-white/5'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Music2 className={`h-4 w-4 ${controller.surface.textSecondary}`} aria-hidden="true" />
        <span className={`text-sm font-semibold ${controller.surface.textPrimary}`}>
          {t('media.spotify.title')}
        </span>
      </div>

      <div className="space-y-3">
        {spotifyTargets.length > 1 ? (
          <Select
            size="small"
            value={resolvedTarget?.entityId ?? ''}
            onChange={(event) => {
              const target = spotifyTargets.find((entry) => entry.entityId === event.target.value);
              setSelectedTargetId(event.target.value);
              setSelectedSource(inferSpotifySource(entityName, target?.sourceList ?? []));
            }}
            aria-label={t('media.spotify.player')}
          >
            {spotifyTargets.map((target) => (
              <option key={target.entityId} value={target.entityId}>
                {target.name}
              </option>
            ))}
          </Select>
        ) : null}

        {sourceList.length > 0 ? (
          <Select
            size="small"
            value={resolvedSource}
            onChange={(event) => setSelectedSource(event.target.value)}
            aria-label={t('media.spotify.output')}
          >
            {sourceList.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="flex min-w-0 gap-2">
          <Input
            type="text"
            size="small"
            value={mediaContentId}
            onChange={(event) => setMediaContentId(event.target.value)}
            placeholder={t('media.spotify.uriPlaceholder')}
            aria-label={t('media.spotify.uri')}
            inputClassName="text-sm"
          />
          <Button
            type="button"
            size="small"
            variant="primary"
            disabled={!canSubmit}
            onClick={handlePlay}
            leading={<Play className="h-4 w-4" fill="currentColor" />}
          >
            {t('media.spotify.play')}
          </Button>
        </div>
      </div>
    </div>
  );
}
