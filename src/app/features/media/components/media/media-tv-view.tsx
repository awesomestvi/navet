import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gamepad2,
  House,
  Menu,
  Minus,
  Pause,
  Play,
  Plus,
  Tv2,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { TvRemoteAction } from '../../tv-remote-commands';

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
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onSelectSource: (source: string) => void;
  onRemoteCommand: (action: TvRemoteAction) => void;
  onOpenDialog: () => void;
}

/** Default D-pad (104×104) — compact through medium horizontal */
const TV_DPAD_LAYOUT_DEFAULT = {
  shell: 'h-[104px] w-[104px] rounded-[22px]',
  outerInset: 'inset-0',
  innerInset: 'inset-[27px]',
  buttonSize: 'small' as const,
  centerSize: 'medium' as const,
  edgeInset: 0,
  centerClassName: 'h-9 w-9',
  crosshairMarginPx: 32,
  edgeIconClassName: 'h-4 w-4',
  centerOkTextClassName: '!text-[11px] !font-semibold',
} as const;

/** Larger D-pad for large / extra-large TV tiles */
const TV_DPAD_LAYOUT_LARGE_CARD = {
  shell: 'h-[136px] w-[136px] rounded-[28px]',
  outerInset: 'inset-0',
  innerInset: 'inset-[35px]',
  buttonSize: 'large' as const,
  centerSize: 'large' as const,
  edgeInset: 0,
  centerClassName: 'h-11 w-11',
  crosshairMarginPx: 42,
  edgeIconClassName: 'h-5 w-5',
  centerOkTextClassName: '!text-xs !font-semibold',
} as const;

type TvDpadLayoutConfig = typeof TV_DPAD_LAYOUT_DEFAULT | typeof TV_DPAD_LAYOUT_LARGE_CARD;

function getTvDpadLayout(size: CardSize): TvDpadLayoutConfig {
  if (size === 'large' || size === 'extra-large') {
    return TV_DPAD_LAYOUT_LARGE_CARD;
  }
  return TV_DPAD_LAYOUT_DEFAULT;
}

interface TvControlButtonProps {
  theme: ThemeType;
  size?: CardSize | 'large';
  label: string;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  iconClassName?: string;
  onPress: () => void;
  children: ReactNode;
}

function TvControlButton({
  theme,
  size = 'small',
  label,
  disabled = false,
  style,
  className = '',
  iconClassName = '',
  onPress,
  children,
}: TvControlButtonProps) {
  return (
    <RoundControlButton
      theme={theme}
      size={size}
      variant="neutral"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      className={`border backdrop-blur-xl transition-colors disabled:opacity-40 ${className}`}
      iconClassName={iconClassName}
      style={style}
    >
      {children}
    </RoundControlButton>
  );
}

function TvDpad({
  theme,
  remoteAvailable,
  style,
  shellStyle,
  layout,
  onRemoteCommand,
}: {
  theme: ThemeType;
  remoteAvailable: boolean;
  style: CSSProperties;
  shellStyle: CSSProperties;
  layout: TvDpadLayoutConfig;
  onRemoteCommand: (action: TvRemoteAction) => void;
}) {
  const d = layout;

  const iconClassName = theme === 'light' ? '!text-slate-800' : '!text-white/90';
  const disabled = !remoteAvailable;
  const crosshairStyle = {
    backgroundColor: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)',
  };

  return (
    <div className={`relative shrink-0 ${d.shell}`}>
      <div
        className={`pointer-events-none absolute ${d.outerInset} rounded-full border`}
        style={shellStyle}
      />
      <div
        className={`pointer-events-none absolute ${d.innerInset} rounded-full border`}
        style={shellStyle}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{
          borderColor: theme === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.05)',
        }}
      />

      <div className="absolute inset-0">
        <TvControlButton
          theme={theme}
          size={d.buttonSize}
          label="Up"
          disabled={disabled}
          className="absolute left-1/2 -translate-x-1/2"
          style={{ ...style, top: d.edgeInset }}
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('up')}
        >
          <ChevronUp className={d.edgeIconClassName} />
        </TvControlButton>
        <TvControlButton
          theme={theme}
          size={d.buttonSize}
          label="Left"
          disabled={disabled}
          style={{ ...style, left: d.edgeInset }}
          className="absolute top-1/2 -translate-y-1/2"
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('left')}
        >
          <ChevronLeft className={d.edgeIconClassName} />
        </TvControlButton>
        <TvControlButton
          theme={theme}
          size={d.buttonSize}
          label="Right"
          disabled={disabled}
          style={{ ...style, right: d.edgeInset }}
          className="absolute top-1/2 -translate-y-1/2"
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('right')}
        >
          <ChevronRight className={d.edgeIconClassName} />
        </TvControlButton>
        <TvControlButton
          theme={theme}
          size={d.buttonSize}
          label="Down"
          disabled={disabled}
          style={{ ...style, bottom: d.edgeInset }}
          className="absolute left-1/2 -translate-x-1/2"
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('down')}
        >
          <ChevronDown className={d.edgeIconClassName} />
        </TvControlButton>
        <TvControlButton
          theme={theme}
          size={d.centerSize}
          label="Select"
          disabled={disabled}
          style={style}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${d.centerClassName}`}
          iconClassName={`${iconClassName} ${d.centerOkTextClassName}`}
          onPress={() => onRemoteCommand('select')}
        >
          OK
        </TvControlButton>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 w-px -translate-x-1/2 -translate-y-1/2"
        style={{
          ...crosshairStyle,
          opacity: 0.4,
          height: `calc(100% - ${d.crosshairMarginPx}px)`,
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-px -translate-x-1/2 -translate-y-1/2"
        style={{
          ...crosshairStyle,
          opacity: 0.4,
          width: `calc(100% - ${d.crosshairMarginPx}px)`,
        }}
      />
    </div>
  );
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
  const tvTextTokens = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'pink' : 'neutral',
    baseColor: isOn ? '#d946ef' : '#64748b',
    backgroundColor: isOn
      ? theme === 'light'
        ? '#fdf4ff'
        : theme === 'glass'
          ? '#3b2448'
          : theme === 'black'
            ? '#14040f'
            : '#2a1038'
      : theme === 'light'
        ? '#f8fafc'
        : theme === 'glass'
          ? '#334155'
          : theme === 'black'
            ? '#000000'
            : '#18181b',
  });
  const isCompact = isCompactCardSize(size);
  const isSmallTvCard = size === 'small';
  const isMediumVerticalTv = size === 'medium-vertical';
  const tvDpadLayout = getTvDpadLayout(size);
  const [dpadOpen, setDpadOpen] = useState(false);
  /** Tight gaps: small card and medium-vertical (match small control rhythm) */
  const tvControlClusterGap = isSmallTvCard || isMediumVerticalTv ? 'gap-1' : 'gap-2';
  const tvSectionStackGap = isSmallTvCard || isMediumVerticalTv ? 'gap-2' : 'gap-3';
  const tvIconClass = isSmallTvCard ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const tvCardActionRowSize = isSmallTvCard ? 'small' : 'medium';
  const iconClassName = theme === 'light' ? '!text-slate-800' : '!text-white/90';
  const sourceLabel =
    source &&
    source.trim().length > 0 &&
    source !== t('media.nothingPlaying') &&
    source !== t('media.nothingPlayingDescription')
      ? source
      : 'Source';
  const separatorColor = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';

  const controlStyle: CSSProperties =
    theme === 'light'
      ? {
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderColor: 'rgba(15,23,42,0.08)',
          boxShadow: '0 10px 24px -18px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.86)',
        }
      : {
          backgroundColor: isOn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          borderColor: isOn ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        };
  const panelStyle: CSSProperties =
    theme === 'light'
      ? {
          backgroundColor: 'rgba(255,255,255,0.56)',
          borderColor: 'rgba(15,23,42,0.07)',
          boxShadow: '0 14px 36px -28px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.86)',
        }
      : {
          backgroundColor: isOn ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          borderColor: isOn ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        };
  const navShellStyle: CSSProperties =
    theme === 'light'
      ? {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)',
          borderColor: 'rgba(15,23,42,0.08)',
          boxShadow: '0 18px 36px -28px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.92)',
        }
      : {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        };

  const updateVolume = (nextVolume: number) => {
    onVolumeInteractionStart();
    onVolumeChange(nextVolume);
    onVolumeInteractionEnd();
  };

  const handleVolumeUp = () => updateVolume(Math.min(100, volume + 10));
  const handleVolumeDown = () => updateVolume(Math.max(0, volume - 10));

  const sourceDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={`flex min-w-0 max-w-32 items-center rounded-full border backdrop-blur-xl ${
            isSmallTvCard ? 'h-8 gap-1 px-2.5' : 'gap-1.5 px-3 py-1.5'
          }`}
          style={panelStyle}
        >
          <span
            className="min-w-0 truncate text-[11px] font-medium"
            style={{ color: tvTextTokens.titleColor }}
          >
            {sourceLabel}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" style={{ color: tvTextTokens.subtitleColor }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44 rounded-xl border border-white/12 bg-zinc-950/96 text-white backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {sourceList.length > 0 ? (
          sourceList.map((entry) => (
            <DropdownMenuItem key={entry} onClick={() => onSelectSource(entry)}>
              {entry}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>{sourceLabel}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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

  const tvDpadToggleButton = isSmallTvCard ? (
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

  const transportActionButtons = (
    <>
      <TvControlButton
        theme={theme}
        size="small"
        label="Menu"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('menu')}
      >
        <Menu className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Home"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('home')}
      >
        <House className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Back"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('back')}
      >
        <Undo2 className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={onTogglePlay}
      >
        {isPlaying ? (
          <Pause className={tvIconClass} fill="currentColor" />
        ) : (
          <Play className={tvIconClass} fill="currentColor" />
        )}
      </TvControlButton>
    </>
  );

  const quickRow = (
    <CardActionRow
      theme={theme}
      size={tvCardActionRowSize}
      leftContent={transportActionButtons}
      rightContent={
        <div className={`flex items-center ${tvControlClusterGap}`}>
          {sourceDropdown}
          {tvSettingsButton}
        </div>
      }
    />
  );

  const volumeButtons = (
    <div className={`flex min-w-0 items-center ${tvControlClusterGap}`}>
      <TvControlButton
        theme={theme}
        size="small"
        label="Volume down"
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={handleVolumeDown}
      >
        <Minus className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={onToggleMute}
      >
        {isMuted ? <VolumeX className={tvIconClass} /> : <Volume2 className={tvIconClass} />}
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Volume up"
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={handleVolumeUp}
      >
        <Plus className={tvIconClass} />
      </TvControlButton>
    </div>
  );

  const channelButtons = (
    <div
      className={`flex min-w-0 items-center ${tvControlClusterGap} ${!remoteAvailable ? 'opacity-70' : ''}`}
    >
      <TvControlButton
        theme={theme}
        size="small"
        label="Channel down"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('channelDown')}
      >
        <ChevronDown className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Channel up"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('channelUp')}
      >
        <ChevronUp className={tvIconClass} />
      </TvControlButton>
    </div>
  );

  const utilityControls =
    size === 'medium-vertical' ? (
      <div className={`flex flex-col ${tvSectionStackGap}`}>
        <div className="flex items-center justify-center">{volumeButtons}</div>
        <div className="h-px w-full" style={{ backgroundColor: separatorColor }} />
        <div className="flex items-center justify-center">{channelButtons}</div>
      </div>
    ) : (
      <div className={`flex min-w-0 items-center justify-start ${tvControlClusterGap}`}>
        {volumeButtons}
        {!isSmallTvCard ? (
          <div className="h-6 w-px shrink-0" style={{ backgroundColor: separatorColor }} />
        ) : null}
        {channelButtons}
      </div>
    );

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

  const renderDpadOverlay = () => (
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
  );

  /** D-pad in document flow (no absolute overlay); align with parent `justify-*`. */
  const renderDpadInline = () => (
    <TvDpad
      theme={theme}
      remoteAvailable={remoteAvailable}
      style={controlStyle}
      shellStyle={navShellStyle}
      layout={tvDpadLayout}
      onRemoteCommand={onRemoteCommand}
    />
  );

  const renderBottomActionRow = () => (
    <div className={isSmallTvCard ? 'pt-2' : 'pt-3'}>{quickRow}</div>
  );

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
              {utilityControls}
              {isSmallTvCard ? (
                <>
                  <div className={`flex min-w-0 flex-wrap items-center ${tvControlClusterGap}`}>
                    {transportActionButtons}
                  </div>
                  <div className="relative flex w-full min-w-0 items-center justify-between">
                    <div className="relative z-10 shrink-0">{tvDpadToggleButton}</div>
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 justify-center">
                      <div className="pointer-events-auto min-w-0 max-w-32">{sourceDropdown}</div>
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
          <div className="flex min-h-0 flex-1 items-end justify-center">{renderDpadInline()}</div>
          <div className={`flex flex-col ${tvSectionStackGap}`}>
            {utilityControls}
            <div
              className={`mt-3 flex flex-wrap items-center justify-center ${tvControlClusterGap}`}
            >
              {transportActionButtons}
            </div>
            <div
              className={`mt-3 flex w-full min-w-0 items-center justify-center ${tvControlClusterGap}`}
            >
              <div className="min-w-0 max-w-36">{sourceDropdown}</div>
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
      {renderBottomActionRow()}
    </div>
  );
}
