import { BaseCard } from '@navet/app/components/primitives/base-card';
import { Link } from '@navet/app/components/primitives/link';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getLightCardSurfaceTokens } from '@navet/app/components/shared/theme/light-card-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { ClimateCard } from '@navet/app/features/climate/components/climate-card';
import { EnergyNowCardView } from '@navet/app/features/energy/components/widgets/energy-now-card-view';
import { LightCardSmall } from '@navet/app/features/lighting/components/light-card/light-card-small';
import { useTheme } from '@navet/app/hooks/use-theme';
import {
  MarketingHeadline,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingReveal } from '@navet/app/marketing/components/MarketingReveal';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_BENTO_ENERGY_TREND } from '@navet/app/marketing/data/marketingDemoData';
import { Coffee, Lightbulb, Moon, Sofa, SunMedium } from 'lucide-react';
import { type CSSProperties, useState } from 'react';

const MOMENTS = [
  {
    id: 'morning',
    label: 'Slow morning',
    icon: Coffee,
    brightness: 80,
    color: '#ffb85c',
    temperature: 22,
    load: 486,
    time: '08:24',
    description: 'A bright start, with the room warming up.',
  },
  {
    id: 'evening',
    label: 'Wind down',
    icon: Sofa,
    brightness: 35,
    color: '#ff884d',
    temperature: 21,
    load: 316,
    time: '19:42',
    description: 'Softer lights. A comfortable room. Time to settle in.',
  },
  {
    id: 'night',
    label: 'Lights out',
    icon: Moon,
    brightness: 0,
    color: '#9bbcff',
    temperature: 19,
    load: 124,
    time: '23:06',
    description: 'Lights off, heating turned down. Ready for tomorrow.',
  },
] as const;

const ENERGY_TREND = [...MARKETING_BENTO_ENERGY_TREND];
const NOOP = () => undefined;
const BRIGHTNESS_PRESETS = [
  { key: 'night' as const, label: 'Low', brightness: 20, icon: Moon },
  { key: 'dim' as const, label: 'Medium', brightness: 50, icon: SunMedium },
  { key: 'bright' as const, label: 'High', brightness: 100, icon: Lightbulb },
];

/** The product's light presentation, with ephemeral state and no device connection. */
function SampleLightCard({
  brightness,
  color,
  onBrightnessChange,
}: {
  brightness: number;
  color: string;
  onBrightnessChange: (value: number) => void;
}) {
  const { theme } = useTheme();
  const isOn = brightness > 0;
  const shell = getCardShellSurfaceTokens(theme);
  const surface = getLightCardSurfaceTokens({ theme, isOn, selectedColor: color });

  return (
    <BaseCard
      size="small"
      frameClassName={cn(shell.rootFrameClassName, surface.cardClassName)}
      style={surface.cardStyle}
      disableDefaultSheen
      contentClassName="h-full"
    >
      <div className="relative flex h-full flex-col">
        <LightCardSmall
          name="Reading light"
          room="Living room"
          size="small"
          brightness={brightness}
          isOn={isOn}
          currentColor={color}
          colorSwatchColor={color}
          activeColor={surface.contentAccentColor}
          IconComponent={Lightbulb}
          colorTemp={3200}
          currentTempColor={color}
          minColorTemp={2700}
          maxColorTemp={6500}
          brightnessPresets={BRIGHTNESS_PRESETS}
          effectOptions={[]}
          isKelvinMode={false}
          isColorMode={false}
          currentEffect={null}
          supportsBrightness
          supportsEffects={false}
          supportsColorControl={false}
          supportsColorTemperature={false}
          onBrightnessChange={onBrightnessChange}
          onBrightnessCommit={onBrightnessChange}
          onKelvinToggle={NOOP}
          onColorActivate={NOOP}
          onColorChange={NOOP}
          onEffectSelect={NOOP}
          onTempChange={NOOP}
          onTempCommit={NOOP}
          iconButtonProps={{
            'aria-label': isOn ? 'Turn reading light off' : 'Turn reading light on',
            onClick: () => onBrightnessChange(isOn ? 0 : 65),
          }}
          settingsButtonProps={{}}
          showSettingsButton={false}
        />
      </div>
    </BaseCard>
  );
}

export function MarketingFeatureGridSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [momentIndex, setMomentIndex] = useState(1);
  const [brightness, setBrightness] = useState<number>(MOMENTS[1].brightness);
  const moment = MOMENTS[momentIndex];

  return (
    <section
      className={cn('marketing-home-playground', className)}
      aria-labelledby="home-playground-title"
    >
      <MarketingReveal className="marketing-playground-layout">
        <div className="marketing-playground-copy">
          <MarketingHeadline compactMobile className={cn('max-w-[16ch]', surface.textPrimary)}>
            <span id="home-playground-title">
              A little touch.
              <br />A different mood.
            </span>
          </MarketingHeadline>
          <MarketingSupportText className={cn('mt-5 max-w-[33ch]', surface.textSecondary)}>
            Bring the lights down. Get the room just right. Navet puts the everyday things within
            reach.
          </MarketingSupportText>
          <fieldset className="marketing-moment-picker" aria-label="Preview a moment at home">
            {MOMENTS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={momentIndex === index && brightness === item.brightness}
                onClick={() => {
                  setMomentIndex(index);
                  setBrightness(item.brightness);
                }}
              >
                <item.icon size={18} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </fieldset>
          <p
            className={cn('min-h-12 max-w-[32ch] text-sm leading-6', surface.textSecondary)}
            aria-live="polite"
          >
            {brightness === moment.brightness
              ? moment.description
              : brightness > 0
                ? `Reading light set to ${brightness}%.`
                : 'Reading light is off.'}
          </p>
          <Link
            href={MARKETING_URLS.demo}
            target="_blank"
            rel="noopener noreferrer"
            showExternalIcon
            className="mt-5"
          >
            Explore the whole home
          </Link>
        </div>

        <div
          className="marketing-moment-stage"
          data-moment={moment.id}
          style={{ '--moment-color': moment.color } as CSSProperties}
        >
          <div className="marketing-moment-atmosphere" aria-hidden="true" />
          <div className={cn('marketing-moment-room', surface.textSecondary)}>
            <span className="flex items-center gap-2">
              <Sofa size={16} aria-hidden="true" /> Living room
            </span>
            <span className="tabular-nums">{moment.time}</span>
          </div>
          <div className="marketing-moment-card marketing-moment-climate" aria-hidden="true" inert>
            <ClimateCard
              key={moment.id}
              id="climate.marketing_sample_room"
              name="Living room"
              room="Living room"
              initialTemp={moment.temperature}
              initialCurrentTemp={moment.id === 'night' ? 19 : 21}
              temperatureUnit="celsius"
              initialMode="heat"
              initialAction={moment.temperature > 21 ? 'heating' : 'idle'}
              initialState
              size="medium"
              isEditMode={false}
              onSizeChange={NOOP}
            />
          </div>
          <div className="marketing-moment-card marketing-moment-energy" aria-hidden="true" inert>
            <EnergyNowCardView
              title="Energy today"
              currentLoadW={moment.load}
              todayUsageKWh={8.4}
              trend={ENERGY_TREND}
              accentColor="#f97316"
              size="small"
            />
          </div>
          <div className="marketing-moment-card marketing-moment-light">
            <SampleLightCard
              brightness={brightness}
              color={moment.color}
              onBrightnessChange={setBrightness}
            />
          </div>
          <p className={cn('marketing-moment-hint', surface.textMuted)}>
            Try the light. It’s a sample home.
          </p>
          <p className="sr-only" aria-live="polite">
            Reading light {brightness > 0 ? `at ${brightness}%` : 'off'}. Thermostat set to{' '}
            {moment.temperature} degrees Celsius. Sample home energy use {moment.load} watts.
          </p>
        </div>
      </MarketingReveal>
    </section>
  );
}
