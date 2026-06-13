import { CardActionRow } from '@navet/app/components/patterns/card-action-row';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getMediaTVViewSurfaceTokens } from '@navet/app/components/shared/theme/media-tv-view-surface-tokens';
import type { TvRemoteAction } from '@navet/app/features/media/tv-remote-commands';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { ChevronsUpDown, Gamepad2, Tv2, Volume2 } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { TvControlButton } from './tv-control-button';
import { getTvDpadLayout, TvDpad } from './tv-dpad';
import { TvSourceSelector } from './tv-source-selector';
import { TvTransportControls } from './tv-transport-controls';
import { TvChannelControls, TvVolumeControls } from './tv-volume-controls';

interface MediaTvViewProps {
  size: CardSize;
  playerName: string;
  source?: string;
  sourceList: string[];
  isOn: boolean;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  theme: ThemeType;
  remoteAvailable: boolean;
  canSetVolume: boolean;
  canMuteVolume: boolean;
  canSelectSource: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onSelectSource: (source: string) => void;
  onRemoteCommand: (action: TvRemoteAction) => void;
  onOpenDialog: () => void;
}

export function MediaTvView({
  size,
  playerName,
  source,
  sourceList,
  isOn,
  isPlaying,
  volume,
  isMuted,
  theme,
  remoteAvailable,
  canSetVolume,
  canMuteVolume,
  canSelectSource,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
  onSelectSource,
  onRemoteCommand,
  onOpenDialog,
}: MediaTvViewProps) {
  const { t } = useI18n();
  const tvSurface = getMediaTVViewSurfaceTokens(theme, isOn);
  const tvTextTokens = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'pink' : 'neutral',
    baseColor: tvSurface.tvBaseColor,
    backgroundColor: tvSurface.tvBackgroundColor,
  });
  const isCompact = isCompactCardSize(size);
  const isSmallTvCard = size === 'small';
  const isMediumVerticalTv = size === 'medium-vertical';
  const isCompactCardSourceSelector = isSmallTvCard || isMediumVerticalTv;
  const constrainCardSourceSelector =
    size === 'small' || size === 'medium' || size === 'medium-vertical';
  const sourceSelectorWidthClass = isSmallTvCard
    ? 'w-[72px]'
    : isMediumVerticalTv
      ? 'w-[112px]'
      : 'w-[140px]';
  const tvDpadLayout = isMediumVerticalTv
    ? {
        ...getTvDpadLayout('medium'),
        shell: 'h-[92px] w-[92px] rounded-[20px]',
        innerInset: 'inset-[23px]',
        centerClassName: 'h-8 w-8',
        crosshairMarginPx: 28,
        edgeIconClassName: 'h-3.5 w-3.5',
      }
    : getTvDpadLayout(size as 'small' | 'medium' | 'medium-vertical' | 'large' | 'extra-large');
  const [dpadOpen, setDpadOpen] = useState(false);
  const [volumeControlsOpen, setVolumeControlsOpen] = useState(false);
  const [channelControlsOpen, setChannelControlsOpen] = useState(false);
  /** 6px standard gap between TV control buttons */
  const tvControlClusterGap = 'gap-1.5';
  const tvSectionStackGap = isSmallTvCard || isMediumVerticalTv ? 'gap-2' : 'gap-3';
  const tvIconClass = isSmallTvCard ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const tvCardActionRowSize = isSmallTvCard ? 'small' : 'medium';
  const iconClassName = tvSurface.iconClassName;
  const separatorColor = tvSurface.separatorColor;
  const showRemoteControls = remoteAvailable;
  const showVolumeControls = canSetVolume || canMuteVolume;
  const showChannelControls = remoteAvailable;
  const showUtilitySeparator = showVolumeControls && showChannelControls;
  const showSourceSelector = canSelectSource;

  const controlStyle: CSSProperties = tvSurface.controlStyle;
  const panelStyle: CSSProperties = tvSurface.panelStyle;
  const navShellStyle: CSSProperties = tvSurface.navShellStyle;

  const tvSettingsButton = (
    <CardSettingsActionButton
      theme={theme}
      size={isSmallTvCard ? 'small' : 'medium'}
      variant="soft"
      onClick={(event) => {
        event.stopPropagation();
        onOpenDialog();
      }}
    />
  );

  const tvDpadToggleButton =
    isSmallTvCard && showRemoteControls ? (
      <TvControlButton
        theme={theme}
        size="small"
        label={dpadOpen ? t('media.tv.hideDpad') : t('media.tv.showDpad')}
        style={controlStyle}
        iconClassName={iconClassName}
        className={dpadOpen ? 'ring-1 ring-fuchsia-400/35' : ''}
        onPress={() => setDpadOpen((open) => !open)}
      >
        <Gamepad2 className={tvIconClass} />
      </TvControlButton>
    ) : null;

  const volumeToggleButton =
    isSmallTvCard && showVolumeControls ? (
      <TvControlButton
        theme={theme}
        size="small"
        label={volumeControlsOpen ? 'Hide volume controls' : 'Show volume controls'}
        style={controlStyle}
        iconClassName={iconClassName}
        className={volumeControlsOpen ? 'ring-1 ring-fuchsia-400/35' : ''}
        onPress={() => {
          setVolumeControlsOpen((open) => !open);
          setChannelControlsOpen(false);
        }}
      >
        <Volume2 className={tvIconClass} />
      </TvControlButton>
    ) : null;

  const channelToggleButton =
    isSmallTvCard && showChannelControls ? (
      <TvControlButton
        theme={theme}
        size="small"
        label={channelControlsOpen ? 'Hide channel controls' : 'Show channel controls'}
        style={controlStyle}
        iconClassName={iconClassName}
        className={channelControlsOpen ? 'ring-1 ring-fuchsia-400/35' : ''}
        onPress={() => {
          setChannelControlsOpen((open) => !open);
          setVolumeControlsOpen(false);
        }}
      >
        <ChevronsUpDown className={tvIconClass} />
      </TvControlButton>
    ) : null;

  const utilityControls =
    showVolumeControls || showChannelControls ? (
      isSmallTvCard ? (
        <div className={`flex flex-col ${tvSectionStackGap}`}>
          <div className={`flex min-w-0 items-center justify-start ${tvControlClusterGap}`}>
            {volumeToggleButton}
            {channelToggleButton}
          </div>
          {volumeControlsOpen ? (
            <TvVolumeControls
              theme={theme}
              isMuted={isMuted}
              volume={volume}
              canSetVolume={canSetVolume}
              canMuteVolume={canMuteVolume}
              controlStyle={controlStyle}
              iconClassName={iconClassName}
              tvIconClass={tvIconClass}
              tvControlClusterGap={tvControlClusterGap}
              onToggleMute={onToggleMute}
              onVolumeChange={onVolumeChange}
              onVolumeInteractionStart={onVolumeInteractionStart}
              onVolumeInteractionEnd={onVolumeInteractionEnd}
            />
          ) : null}
          {channelControlsOpen ? (
            <TvChannelControls
              theme={theme}
              remoteAvailable={remoteAvailable}
              controlStyle={controlStyle}
              iconClassName={iconClassName}
              tvIconClass={tvIconClass}
              tvControlClusterGap={tvControlClusterGap}
              onRemoteCommand={onRemoteCommand}
            />
          ) : null}
        </div>
      ) : (
        <div className={`flex min-w-0 items-center justify-start ${tvControlClusterGap}`}>
          <TvVolumeControls
            theme={theme}
            isMuted={isMuted}
            volume={volume}
            canSetVolume={canSetVolume}
            canMuteVolume={canMuteVolume}
            controlStyle={controlStyle}
            iconClassName={iconClassName}
            tvIconClass={tvIconClass}
            tvControlClusterGap={tvControlClusterGap}
            onToggleMute={onToggleMute}
            onVolumeChange={onVolumeChange}
            onVolumeInteractionStart={onVolumeInteractionStart}
            onVolumeInteractionEnd={onVolumeInteractionEnd}
          />
          {showUtilitySeparator ? (
            <div className="h-6 w-px shrink-0" style={{ backgroundColor: separatorColor }} />
          ) : null}
          <TvChannelControls
            theme={theme}
            remoteAvailable={remoteAvailable}
            controlStyle={controlStyle}
            iconClassName={iconClassName}
            tvIconClass={tvIconClass}
            tvControlClusterGap={tvControlClusterGap}
            onRemoteCommand={onRemoteCommand}
          />
        </div>
      )
    ) : null;

  const utilityControlsVertical =
    showVolumeControls || showChannelControls ? (
      <div className={`flex flex-col ${tvSectionStackGap}`}>
        {showVolumeControls ? (
          <div className="flex items-center justify-center">
            <TvVolumeControls
              theme={theme}
              isMuted={isMuted}
              volume={volume}
              canSetVolume={canSetVolume}
              canMuteVolume={canMuteVolume}
              controlStyle={controlStyle}
              iconClassName={iconClassName}
              tvIconClass={tvIconClass}
              tvControlClusterGap={tvControlClusterGap}
              onToggleMute={onToggleMute}
              onVolumeChange={onVolumeChange}
              onVolumeInteractionStart={onVolumeInteractionStart}
              onVolumeInteractionEnd={onVolumeInteractionEnd}
            />
          </div>
        ) : null}
        {showUtilitySeparator ? (
          <div className="h-px w-full" style={{ backgroundColor: separatorColor }} />
        ) : null}
        {showChannelControls ? (
          <div className="flex items-center justify-center">
            <TvChannelControls
              theme={theme}
              remoteAvailable={remoteAvailable}
              controlStyle={controlStyle}
              iconClassName={iconClassName}
              tvIconClass={tvIconClass}
              tvControlClusterGap={tvControlClusterGap}
              onRemoteCommand={onRemoteCommand}
            />
          </div>
        ) : null}
      </div>
    ) : null;

  const header = (
    <EntityCardHeader
      title={playerName}
      subtitle={t('media.type.tv')}
      layout="eyebrow-first"
      size={size}
      tone={isOn ? 'pink' : 'neutral'}
      accentColor={isOn ? '#d946ef' : null}
      titleClassName="text-left"
      subtitleClassName="text-left"
      leading={
        <EntityCardHeaderIcon
          IconComponent={Tv2}
          isActive={isOn}
          size={size}
          tone={isOn ? 'pink' : 'neutral'}
        />
      }
    />
  );

  const sourceSelector = showSourceSelector ? (
    <TvSourceSelector
      source={source}
      sourceList={sourceList}
      isSmallTvCard={isSmallTvCard}
      constrainCardWidth={constrainCardSourceSelector}
      compactCardSelector={isCompactCardSourceSelector}
      hideBadge={isSmallTvCard}
      theme={theme}
      panelStyle={panelStyle}
      tvTextTokens={tvTextTokens}
      onSelectSource={onSelectSource}
    />
  ) : null;

  const transportControls = (
    <TvTransportControls
      theme={theme}
      isPlaying={isPlaying}
      remoteAvailable={remoteAvailable}
      controlStyle={controlStyle}
      iconClassName={iconClassName}
      tvIconClass={tvIconClass}
      onRemoteCommand={onRemoteCommand}
      onTogglePlay={onTogglePlay}
    />
  );

  const quickRow = (
    <CardActionRow
      theme={theme}
      size={tvCardActionRowSize}
      leftContent={transportControls}
      rightContent={
        <div className={`flex min-w-0 items-center ${tvControlClusterGap}`}>
          {sourceSelector}
          {tvSettingsButton}
        </div>
      }
    />
  );

  const renderDpadOverlay = () =>
    showRemoteControls ? (
      <div className="pointer-events-none absolute right-0 top-0 z-20 flex justify-end">
        <div className="pointer-events-auto">
          <TvDpad
            theme={theme}
            remoteAvailable={remoteAvailable}
            style={controlStyle}
            shellStyle={navShellStyle}
            layout={tvDpadLayout}
            onRemoteCommand={onRemoteCommand}
          />
        </div>
      </div>
    ) : null;

  const renderDpadInline = () =>
    showRemoteControls ? (
      <TvDpad
        theme={theme}
        remoteAvailable={remoteAvailable}
        style={controlStyle}
        shellStyle={navShellStyle}
        layout={tvDpadLayout}
        onRemoteCommand={onRemoteCommand}
      />
    ) : null;

  if (isCompact) {
    return (
      <div className="relative flex h-full flex-col">
        {header}
        {!isSmallTvCard ? (
          <div className="flex shrink-0 justify-center pt-1">
            <div className="shrink-0">{renderDpadInline()}</div>
          </div>
        ) : null}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {isSmallTvCard && dpadOpen ? (
            <>
              <div className="flex min-h-0 flex-1 items-center justify-center pt-2">
                <div className="mt-3 shrink-0">{renderDpadInline()}</div>
              </div>
              <div
                className={`mt-auto flex w-full items-center justify-between pt-2 ${tvControlClusterGap}`}
              >
                {tvDpadToggleButton}
                {tvSettingsButton}
              </div>
            </>
          ) : (
            <div className={`mt-auto flex flex-col ${tvSectionStackGap}`}>
              {size === 'medium-vertical' ? utilityControlsVertical : utilityControls}
              {isSmallTvCard ? (
                <>
                  <div className={`flex min-w-0 flex-wrap items-center ${tvControlClusterGap}`}>
                    {transportControls}
                  </div>
                  <div className="relative flex w-full min-w-0 items-center justify-between">
                    <div className="relative z-10 shrink-0">{tvDpadToggleButton}</div>
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 justify-center">
                      <div className={`pointer-events-auto min-w-0 ${sourceSelectorWidthClass}`}>
                        {sourceSelector}
                      </div>
                    </div>
                    <div className="relative z-10 shrink-0">{tvSettingsButton}</div>
                  </div>
                </>
              ) : (
                quickRow
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (size === 'medium-vertical') {
    return (
      <div className="relative flex h-full flex-col">
        {header}
        <div className="relative flex min-h-0 flex-1 flex-col gap-5">
          <div className="flex min-h-0 flex-1 items-center justify-center pt-3">
            {renderDpadInline()}
          </div>
          <div className={`flex flex-col ${tvSectionStackGap}`}>
            {utilityControlsVertical}
            <div
              className={`mt-3 flex flex-wrap items-center justify-center ${tvControlClusterGap}`}
            >
              {transportControls}
            </div>
            <div
              className={`mt-3 flex w-full min-w-0 items-center justify-center ${tvControlClusterGap}`}
            >
              <div className={`min-w-0 ${sourceSelectorWidthClass}`}>{sourceSelector}</div>
              <div className="shrink-0">{tvSettingsButton}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (size === 'large' || size === 'extra-large') {
    return (
      <div className="relative flex h-full flex-col">
        {header}
        <div className="relative flex min-h-0 flex-1 flex-col gap-8">
          <div className="flex min-h-0 flex-1 items-end justify-center pb-1 pt-1">
            <div className="shrink-0">{renderDpadInline()}</div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {utilityControls}
            {quickRow}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {renderDpadOverlay()}
      {header}
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col pr-28">
          <div className="mt-auto flex flex-col gap-3">{utilityControls}</div>
        </div>
      </div>
      <div className={isSmallTvCard ? 'pt-2' : 'pt-3'}>{quickRow}</div>
    </div>
  );
}
