import { dispatchEntityCommand } from '@navet/app/commands';
import { Button, Panel } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { useI18n, useServiceActionHandler, useTheme } from '@navet/app/hooks';
import { Film, Play, ScrollText } from 'lucide-react';
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

function QuickActionCard({ action, shouldReduceMotion }: QuickActionCardProps) {
  const { t } = useI18n();
  const { accentColor } = useTheme();
  const runAction = useServiceActionHandler();
  const [isRunning, setIsRunning] = useState(false);
  const Icon = action.type === 'script' ? ScrollText : Film;
  const typeLabel = action.type === 'script' ? t('deviceType.script') : t('deviceType.scene');
  const showRoom = action.room !== 'Unassigned';

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
      className={`grid gap-4 p-4 md:p-5 ${
        shouldReduceMotion ? '' : 'transition-shadow duration-200'
      }`}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <EntityCardHeader
          title={action.name}
          subtitle={showRoom ? action.room : typeLabel}
          size="medium"
          layout="eyebrow-first"
          leading={
            <EntityCardHeaderIcon
              IconComponent={Icon}
              isActive={action.state === 'on'}
              size="medium"
              tone={action.state === 'on' ? 'primary' : 'neutral'}
              baseColor={accentColor}
            />
          }
          titleClassName="text-base leading-6"
          subtitleClassName="text-xs"
          marginBottomClassName="mb-0"
        />
        <div className="flex w-full items-center gap-2 lg:w-auto lg:justify-end">
          <Button
            variant={action.type === 'script' ? 'primary' : 'secondary'}
            size="small"
            leading={<Play className="h-4 w-4" aria-hidden="true" />}
            loading={isRunning}
            onClick={handleRun}
            aria-label={t('tasks.quickActions.runRoutine', { name: action.name })}
            className="min-w-24 flex-1 sm:flex-none"
          >
            {t('tasks.quickActions.run')}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function QuickActionGrid({ actions, shouldReduceMotion }: QuickActionGridProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {actions.map((action) => (
        <QuickActionCard key={action.id} action={action} shouldReduceMotion={shouldReduceMotion} />
      ))}
    </div>
  );
}
