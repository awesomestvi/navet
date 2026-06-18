import { CardEmptyState } from '@navet/app/components/patterns';
import {
  BaseCard,
  CardMetric,
  EntityCardHeader,
  EntityCardHeaderIcon,
} from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import { BatteryCharging, Gauge, Zap } from 'lucide-react';

type UpsStoryArgs = {
  size: CardSize;
  status: 'OL' | 'OB' | 'LB' | 'unavailable';
};

function getStatusClasses(status: UpsStoryArgs['status'], theme: string) {
  if (status === 'OL') {
    return theme === 'light'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
      : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
  }

  if (status === 'OB') {
    return theme === 'light'
      ? 'border-amber-300 bg-amber-100 text-amber-800'
      : 'border-amber-400/30 bg-amber-500/15 text-amber-200';
  }

  if (status === 'LB') {
    return theme === 'light'
      ? 'border-red-300 bg-red-100 text-red-800'
      : 'border-red-400/30 bg-red-500/15 text-red-200';
  }

  return theme === 'light'
    ? 'border-slate-300 bg-slate-100 text-slate-700'
    : 'border-white/12 bg-white/8 text-white/72';
}

function getStatusLabel(status: UpsStoryArgs['status']) {
  switch (status) {
    case 'OL':
      return 'OL';
    case 'OB':
      return 'On Battery';
    case 'LB':
      return 'Low Battery';
    default:
      return 'Unavailable';
  }
}

function UpsStoryFrame({ size, status }: UpsStoryArgs) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const statusClasses = getStatusClasses(status, theme);
  const resolvedSize = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';

  if (status === 'unavailable') {
    return (
      <EntityCardStoryFrame size={size}>
        <BaseCard
          size={resolvedSize}
          fullBleed
          frameClassName="overflow-hidden"
          contentClassName="h-full"
        >
          <div className="relative flex h-full min-w-0 flex-col p-3">
            <CardEmptyState
              title="UPS device unavailable"
              description="Reconnect the UPS sensors or pick another UPS source for this card."
              icon={BatteryCharging}
              size={resolvedSize}
            />
          </div>
        </BaseCard>
      </EntityCardStoryFrame>
    );
  }

  return (
    <EntityCardStoryFrame size={size}>
      <BaseCard
        size={resolvedSize}
        fullBleed
        frameClassName="overflow-hidden"
        contentClassName="h-full"
      >
        <div className="relative flex h-full min-w-0 flex-col p-3">
          <EntityCardHeader
            title="Rack UPS"
            subtitle="Server Room"
            layout="eyebrow-first"
            size={resolvedSize === 'large' ? 'medium' : resolvedSize}
            titleClassName={surface.textPrimary}
            subtitleClassName={surface.textMuted}
            leading={
              <EntityCardHeaderIcon
                IconComponent={BatteryCharging}
                isActive
                size={resolvedSize === 'large' ? 'medium' : resolvedSize}
              />
            }
          />

          <div className="mt-3 flex flex-1 flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <CardMetric
                value={status === 'LB' ? '12 %' : status === 'OB' ? '58 %' : '92 %'}
                label="Battery"
                size={resolvedSize === 'large' ? 'xl' : 'lg'}
                isActive
                accentClassName={theme === 'light' ? 'text-slate-900' : 'text-white'}
                theme={theme}
                labelClassName={surface.textMuted}
              />
              <div
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses}`}
              >
                {getStatusLabel(status)}
              </div>
            </div>

            {resolvedSize === 'small' ? (
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`rounded-2xl border px-3 py-2 ${surface.border} ${surface.panelMuted}`}
                >
                  <div className={`text-xs uppercase tracking-[0.12em] ${surface.textMuted}`}>
                    Load
                  </div>
                  <div className={`mt-1 text-lg font-semibold ${surface.textPrimary}`}>
                    {status === 'OB' ? '46 %' : status === 'LB' ? '68 %' : '23 %'}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`grid gap-2 ${resolvedSize === 'medium' ? 'grid-cols-2' : 'grid-cols-3'}`}
              >
                <div
                  className={`rounded-2xl border px-3 py-3 ${surface.border} ${surface.panelMuted}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${surface.textMuted}`}
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    <span>Load</span>
                  </div>
                  <div className={`mt-2 text-xl font-semibold ${surface.textPrimary}`}>
                    {status === 'OB' ? '46 %' : status === 'LB' ? '68 %' : '23 %'}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border px-3 py-3 ${surface.border} ${surface.panelMuted}`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${surface.textMuted}`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Runtime</span>
                  </div>
                  <div className={`mt-2 text-xl font-semibold ${surface.textPrimary}`}>
                    {status === 'LB' ? '8 min' : status === 'OB' ? '24 min' : '54 min'}
                  </div>
                </div>
                {resolvedSize === 'large' ? (
                  <div
                    className={`rounded-2xl border px-3 py-3 ${surface.border} ${surface.panelMuted}`}
                  >
                    <div
                      className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${surface.textMuted}`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Output Voltage</span>
                    </div>
                    <div className={`mt-2 text-xl font-semibold ${surface.textPrimary}`}>230 V</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </BaseCard>
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Custom/UPS Monitor',
  component: UpsStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    status: {
      control: 'select',
      options: ['OL', 'OB', 'LB', 'unavailable'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<UpsStoryArgs>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<UpsStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'medium',
    status: 'OL',
  },
};

export const Online: Story = {
  args: {
    size: 'medium',
    status: 'OL',
  },
};

export const OnBattery: Story = {
  args: {
    size: 'medium',
    status: 'OB',
  },
};

export const LowBattery: Story = {
  args: {
    size: 'medium',
    status: 'LB',
  },
};

export const Unavailable: Story = {
  args: {
    size: 'medium',
    status: 'unavailable',
  },
};
