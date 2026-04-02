import { Hand, Lightbulb, MoreHorizontal, Settings2, Sun } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { getBrightnessPresetSelectedStyle } from '@/app/components/shared/device-editor/brightness-preset-styles';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getRoundControlStyles } from '@/app/components/shared/theme/round-control-styles';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { getLightCardSurfaceTokens } from '@/app/features/lighting';
import { useI18n, useTheme } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { EntityInteractionMode } from '@/app/stores';

interface InteractionPreviewCardProps {
  mode: EntityInteractionMode;
  accentColor: string;
  theme: ThemeType;
}

const PRESET_LABELS = ['25%', '60%', '100%'];

export function InteractionPreviewCard({ mode, accentColor, theme }: InteractionPreviewCardProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [isOn, setIsOn] = useState(true);
  const [brightness, setBrightness] = useState(60);
  const surface = getThemeSurfaceTokens(theme);
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const stateText = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'primary' : 'neutral',
    accentColor,
  });
  const controlStyles = getRoundControlStyles(theme);
  const actionSizes = getCardActionControlSizes('medium');
  const lightSurface = getLightCardSurfaceTokens({
    isOn,
    selectedColor: null,
    theme,
    lightColors: colors.switch.on,
    accentColor,
  });
  const preview =
    mode === 'toggle-first'
      ? {
          cardTap: t('interactionPreview.cardTap.toggle'),
          iconTap: t('interactionPreview.iconTap.toggle'),
        }
      : {
          cardTap: t('interactionPreview.cardTap.controls'),
          iconTap: t('interactionPreview.iconTap.toggle'),
        };
  const showsTrailingButton = mode === 'toggle-first';
  const frameClassName =
    theme === 'light'
      ? 'bg-gradient-to-b from-slate-100/96 to-slate-200/92'
      : theme === 'glass'
        ? 'bg-[linear-gradient(180deg,rgba(12,18,32,0.82),rgba(15,23,42,0.66))]'
        : theme === 'black'
          ? 'bg-[linear-gradient(180deg,rgba(10,10,10,0.98),rgba(0,0,0,1))]'
          : 'bg-[linear-gradient(180deg,rgba(34,26,32,0.94),rgba(18,18,22,0.98))]';
  const quietPillClass = isOn
    ? theme === 'light'
      ? 'bg-gray-100 text-gray-600'
      : theme === 'black'
        ? 'bg-white/10 text-gray-300'
        : 'bg-white/10 text-gray-300'
    : theme === 'light'
      ? 'bg-gray-200/80 text-gray-500'
      : theme === 'black'
        ? 'bg-white/6 text-gray-300'
        : 'bg-white/5 text-gray-500';
  const sliderTrackClassName = theme === 'light' ? 'bg-gray-300/90' : 'bg-white/12';
  const thumbClassName =
    theme === 'black'
      ? 'border-black bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.22)]'
      : 'border-white bg-white shadow-lg';
  const titleColor = { color: stateText.titleColor };
  const labelColor = { color: stateText.subtitleColor };

  const showControlsOpenedToast = () => {
    toast.success(t('interactionPreview.preview.controlsOpenedTitle'), {
      description: t('interactionPreview.preview.controlsOpenedDescription'),
    });
  };

  const handleCardTap = () => {
    if (mode === 'toggle-first') {
      setIsOn((current) => !current);
      return;
    }

    showControlsOpenedToast();
  };

  return (
    <div className={`relative max-w-[22.5rem] rounded-[30px] p-3 ${frameClassName}`}>
      {isOn ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[-18%] top-1/2 h-36 -translate-y-1/2 blur-3xl transition-opacity duration-300 ${
            theme === 'light' ? 'opacity-70' : 'opacity-40'
          }`}
          style={{
            background: `radial-gradient(circle, ${lightSurface.glowColor}cc 0%, ${lightSurface.glowColor}55 28%, transparent 72%)`,
          }}
        />
      ) : null}

      {/* biome-ignore lint/a11y/useSemanticElements: This preview card contains nested interactive controls, so a semantic button wrapper is not valid here. */}
      <div
        role="button"
        aria-label={t('interactionPreview.preview.deviceName')}
        tabIndex={0}
        onClick={handleCardTap}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardTap();
          }
        }}
        className={`relative z-10 cursor-pointer overflow-hidden rounded-3xl border p-4 transition-all duration-300 ${lightSurface.cardClassName} ${
          !isOn ? 'grayscale-[0.08] opacity-90' : ''
        }`}
        style={lightSurface.cardStyle}
      >
        {lightSurface.innerOverlayClassName ? (
          <div
            className={lightSurface.innerOverlayClassName}
            style={lightSurface.innerOverlayStyle}
          />
        ) : null}
        {lightSurface.shineOverlayClassName ? (
          <div className={lightSurface.shineOverlayClassName} />
        ) : null}

        <div className="relative flex h-full flex-col">
          <EntityCardHeader
            title={t('interactionPreview.preview.deviceName')}
            subtitle={t('interactionPreview.preview.deviceType')}
            layout="eyebrow-first"
            size="medium"
            tone={isOn ? 'primary' : 'neutral'}
            titleClassName={`truncate ${stateSurface.primaryTextClassName}`}
            subtitleClassName={`truncate ${stateSurface.mutedTextClassName}`}
            leading={
              <EntityCardHeaderIcon
                IconComponent={Lightbulb}
                isActive={isOn}
                size="medium"
                tone={isOn ? 'primary' : 'neutral'}
                ariaLabel={t('interactionPreview.iconTap.toggle')}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOn((current) => !current);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            }
          />

          <div className="flex-1 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium" style={labelColor}>
                  {t('interactionPreview.preview.brightness')}
                </span>
                <span className="text-sm font-bold" style={titleColor}>
                  {brightness}%
                </span>
              </div>

              <div className="flex h-5 items-center">
                <div className={`relative h-1 w-full rounded-full ${sliderTrackClassName}`}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${brightness}%`,
                      background: `linear-gradient(to right, ${accentColor}aa, ${accentColor})`,
                    }}
                  />
                  <div
                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 ${thumbClassName}`}
                    style={{ left: `calc(${brightness}% - 8px)` }}
                  />
                </div>
              </div>
            </div>

            <CardActionRow
              theme={theme}
              size="medium"
              leftContent={
                <>
                  {PRESET_LABELS.map((label, index) => {
                    const nextBrightness = index === 0 ? 25 : index === 1 ? 60 : 100;
                    const isSelected = brightness === nextBrightness;

                    return (
                      <button
                        type="button"
                        key={label}
                        aria-label={
                          index === 2
                            ? `${t('interactionPreview.preview.brightness')} 100%`
                            : `${t('interactionPreview.preview.brightness')} ${label}`
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          setBrightness(nextBrightness);
                        }}
                        className={`flex ${actionSizes.button} items-center justify-center rounded-full border text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 ${
                          isSelected ? controlStyles.selectedText : controlStyles.softButton
                        }`}
                        style={
                          isSelected
                            ? getBrightnessPresetSelectedStyle(theme, accentColor, isOn)
                            : undefined
                        }
                      >
                        {index === 2 ? <MoreHorizontal className={actionSizes.icon} /> : label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    aria-label={t('interactionPreview.cardTap.controls')}
                    onClick={(event) => {
                      event.stopPropagation();
                      showControlsOpenedToast();
                    }}
                    className={`flex ${actionSizes.button} items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 ${controlStyles.softButton}`}
                    style={
                      mode === 'control-first'
                        ? getBrightnessPresetSelectedStyle(theme, accentColor, true)
                        : undefined
                    }
                  >
                    <Sun className={actionSizes.icon} />
                  </button>
                </>
              }
              rightContent={
                showsTrailingButton ? (
                  <button
                    type="button"
                    aria-label={t('interactionPreview.iconTap.settings')}
                    onClick={(event) => {
                      event.stopPropagation();
                      showControlsOpenedToast();
                    }}
                    className={`flex ${actionSizes.button} items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 ${controlStyles.softButton}`}
                  >
                    <Settings2 className={actionSizes.icon} />
                  </button>
                ) : undefined
              }
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className={`rounded-2xl px-3 py-2.5 ${quietPillClass}`}>
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold ${surface.textSecondary}`}
            >
              <Hand className="h-3 w-3" />
              <span>{t('interactionPreview.cardTitle')}</span>
            </div>
            <p className="mt-1 text-sm" style={titleColor}>
              {preview.cardTap}
            </p>
          </div>

          <div
            className={`grid gap-2 ${showsTrailingButton ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}
          >
            <div className={`rounded-2xl px-3 py-2.5 ${quietPillClass}`}>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-semibold ${surface.textSecondary}`}
              >
                <Lightbulb className="h-3 w-3" />
                <span>{t('interactionPreview.iconTitle')}</span>
              </div>
              <p className="mt-1 text-sm" style={titleColor}>
                {preview.iconTap}
              </p>
            </div>

            {showsTrailingButton ? (
              <div className={`rounded-2xl px-3 py-2.5 ${quietPillClass}`}>
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-semibold ${surface.textSecondary}`}
                >
                  <Settings2 className="h-3 w-3" />
                  <span>{t('interactionPreview.trailingButtonTitle')}</span>
                </div>
                <p className="mt-1 text-sm" style={titleColor}>
                  {t('interactionPreview.trailingButtonAction')}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
