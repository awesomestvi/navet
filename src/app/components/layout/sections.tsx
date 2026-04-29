import { Clipboard, Lightbulb } from 'lucide-react';
import { DashboardEmptyState } from '@/app/components/patterns';
import { useI18n } from '@/app/hooks';

export { LocksSection } from './locks-section';
export { MediaSection } from './media-section';
export { SecuritySection } from './security-section';

export function TasksSection() {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <DashboardEmptyState
        icon={Clipboard}
        title={t('sections.tasks.emptyTitle')}
        description={t('sections.tasks.emptyDescription')}
        className="w-full max-w-md"
      />
    </div>
  );
}

export function LightsSection() {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <DashboardEmptyState
        icon={Lightbulb}
        title={t('sections.lights.emptyTitle')}
        description={t('sections.lights.emptyDescription')}
        className="w-full max-w-md"
      />
    </div>
  );
}
