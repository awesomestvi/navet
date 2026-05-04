import { ClipboardList } from 'lucide-react';
import { DashboardEmptyState, SectionCard } from '@/app/components/patterns';
import { Badge } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { useTaskAutomationGroups } from '../hooks/use-task-automation-groups';
import { AutomationTaskRow } from './automation-task-row';

export function TasksSection() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const groups = useTaskAutomationGroups();
  const totalTasks = groups.reduce((count, group) => count + group.tasks.length, 0);

  if (totalTasks === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={ClipboardList}
          title={t('sections.tasks.emptyTitle')}
          description={t('sections.tasks.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className={`text-xl font-semibold tracking-tight ${surface.textPrimary}`}>
          {t('sections.tasks.title')}
        </h1>
        <p className={`max-w-2xl text-sm ${surface.textSecondary}`}>
          {t('sections.tasks.description')}
        </p>
      </div>

      {groups.map((group) => (
        <SectionCard
          key={group.key}
          eyebrow={t('sidebar.tasks')}
          title={group.title}
          action={
            <Badge tone="accent">
              {group.tasks.length}{' '}
              {group.tasks.length === 1 ? group.singularLabel : group.pluralLabel}
            </Badge>
          }
        >
          <div className="space-y-3">
            {group.tasks.map((task) => (
              <AutomationTaskRow key={task.id} task={task} />
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
