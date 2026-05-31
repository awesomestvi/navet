import { dispatchEntityCommand } from '@navet/app/commands';
import { Button, Panel, Tag } from '@navet/app/components/primitives';
import { getDashboardCardFootprint } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { SwitchCard } from '@navet/app/features/lighting';
import { useI18n, useServiceActionHandler, useTheme } from '@navet/app/hooks';
import { Clapperboard, Play } from 'lucide-react';
import { useState } from 'react';
import type { QuickActionRoutine } from '../types';

interface QuickActionGridProps {
  actions: QuickActionRoutine[];
  shouldReduceMotion: boolean;
}

interface QuickActionCardProps {
  action: QuickActionRoutine;
  shouldReduceMotion: boolean;
}

const smallScriptCardFootprint = getDashboardCardFootprint('small');

function ScriptQuickActionCard({ action }: { action: QuickActionRoutine }) {
  const { t } = useI18n();

  return (
    <div
      style={{
        height: `${smallScriptCardFootprint.heightPx}px`,
        minHeight: `${smallScriptCardFootprint.heightPx}px`,
      }}
    >
      <SwitchCard
        id={action.id}
        name={action.name}
        size="small"
        initialState={action.state === 'on'}
        entityType={t('deviceType.script')}
        serviceDomain="script"
        serviceAction="turn_on"
        isEditMode={false}
      />
    </div>
  );
}

function QuickActionCard({ action, shouldReduceMotion }: QuickActionCardProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const runAction = useServiceActionHandler();
  const [isRunning, setIsRunning] = useState(false);
  const Icon = Clapperboard;

  if (action.type === 'script') {
    return <ScriptQuickActionCard action={action} />;
  }

  const handleRun = () => {
    setIsRunning(true);
    void runAction(
      async () => {
        await dispatchEntityCommand({ type: 'turn_on', entityId: action.id });
      },
      t('tasks.quickActions.triggerFailed', { name: action.name })
    ).finally(() => {
      setIsRunning(false);
    });
  };

  return (
    <Panel
      as="article"
      muted
      padded={false}
      className={`grid min-h-[10rem] gap-4 p-4 ${
        shouldReduceMotion ? '' : 'transition-shadow duration-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="rounded-2xl border p-2.5"
          style={{ backgroundColor: `${accentColor}18`, borderColor: `${accentColor}38` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} aria-hidden="true" />
        </div>
        <Tag tone="accent">{action.type}</Tag>
      </div>
      <div className="min-w-0">
        <h3 className={`truncate text-base font-semibold ${surface.textPrimary}`}>{action.name}</h3>
        <p className={`mt-2 text-sm ${surface.textSecondary}`}>{action.room}</p>
      </div>
      <Button
        variant="primary"
        size="small"
        leading={<Play className="h-4 w-4" aria-hidden="true" />}
        loading={isRunning}
        onClick={handleRun}
        aria-label={t('tasks.quickActions.runRoutine', { name: action.name })}
        className="mt-auto"
      >
        {t('tasks.quickActions.run')}
      </Button>
    </Panel>
  );
}

export function QuickActionGrid({ actions, shouldReduceMotion }: QuickActionGridProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => (
        <QuickActionCard key={action.id} action={action} shouldReduceMotion={shouldReduceMotion} />
      ))}
    </div>
  );
}
