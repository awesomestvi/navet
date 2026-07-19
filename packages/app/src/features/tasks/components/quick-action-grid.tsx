import { dispatchEntityCommand } from '@navet/app/commands';
import { Button, Tag } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useServiceActionHandler, useTheme } from '@navet/app/hooks';
import { Film, Play, ScrollText } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { QuickActionRoutine } from '../types';
import {
  type QuickActionSortKey,
  sortQuickActions,
  type TableSortState,
  toggleTableSort,
} from '../utils/task-table-sorting';
import { SortableTableHeader } from './sortable-table-header';

interface QuickActionGridProps {
  actions: QuickActionRoutine[];
  shouldReduceMotion: boolean;
}

interface QuickActionRowProps {
  action: QuickActionRoutine;
  shouldReduceMotion: boolean;
  striped: boolean;
}

function QuickActionRow({ action, shouldReduceMotion, striped }: QuickActionRowProps) {
  const { t } = useI18n();
  const { accentColor, theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const runAction = useServiceActionHandler();
  const [isRunning, setIsRunning] = useState(false);
  const Icon = action.type === 'script' ? ScrollText : Film;
  const typeLabel = action.type === 'script' ? t('deviceType.script') : t('deviceType.scene');
  const isActive = action.state === 'on' || action.state === 'scening';
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
    <article
      className={`${striped ? surface.subtleBg : ''} ${
        shouldReduceMotion ? '' : 'transition-colors duration-200'
      }`}
    >
      <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @2xl/quick-action-table:grid-cols-[minmax(0,1fr)_7rem_15rem] @2xl/quick-action-table:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:col-span-2 @2xl/quick-action-table:col-span-1">
          <EntityCardHeaderIcon
            IconComponent={Icon}
            isActive={isActive}
            size="extra-small"
            tone={isActive ? 'primary' : 'neutral'}
            baseColor={accentColor}
          />
          <div className="min-w-0">
            {showRoom ? (
              <div className={`truncate text-xs ${surface.textMuted}`}>{action.room}</div>
            ) : null}
            <div className={`truncate font-medium ${surface.textPrimary}`}>{action.name}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:block">
          <div
            className={`text-xs font-medium @2xl/quick-action-table:hidden ${surface.textMuted}`}
          >
            {t('tasks.quickActions.type')}
          </div>
          <Tag tone="neutral" size="small">
            {typeLabel}
          </Tag>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:col-span-2 lg:justify-end @2xl/quick-action-table:col-span-1">
          <Button
            variant="secondary"
            size="small"
            leading={<Play className="h-4 w-4" aria-hidden="true" />}
            loading={isRunning}
            onClick={handleRun}
            aria-label={t('tasks.quickActions.runRoutine', { name: action.name })}
            className="min-w-20 flex-1 sm:flex-none"
          >
            {t('tasks.quickActions.run')}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function QuickActionGrid({ actions, shouldReduceMotion }: QuickActionGridProps) {
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [sort, setSort] = useState<TableSortState<QuickActionSortKey> | null>(null);
  const sortedActions = useMemo(
    () => sortQuickActions(actions, sort, locale),
    [actions, locale, sort]
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={`@container/quick-action-table overflow-hidden rounded-[22px] border ${surface.border} ${surface.panelMuted}`}
    >
      <div
        className={`hidden grid-cols-[minmax(0,1fr)_7rem_15rem] items-center gap-3 px-4 pt-3 pb-2 text-xs font-medium @2xl/quick-action-table:grid ${surface.textMuted}`}
      >
        <SortableTableHeader
          label={t('tasks.quickActions.title')}
          direction={sort?.key === 'name' ? sort.direction : undefined}
          onToggle={() => setSort((current) => toggleTableSort(current, 'name'))}
        />
        <SortableTableHeader
          label={t('tasks.quickActions.type')}
          direction={sort?.key === 'type' ? sort.direction : undefined}
          onToggle={() => setSort((current) => toggleTableSort(current, 'type'))}
        />
        <div aria-hidden="true" />
      </div>
      {sortedActions.map((action, index) => (
        <QuickActionRow
          key={action.id}
          action={action}
          shouldReduceMotion={shouldReduceMotion}
          striped={index % 2 === 0}
        />
      ))}
    </div>
  );
}
