import { Badge, BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { useI18n } from '@navet/app/hooks';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { Brain, ChevronRight, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function NavetAiInsightsWidget({ size }: { size: CardSize }) {
  const { t } = useI18n();
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const { state, loading, initialize } = useNavetAiStore(
    useShallow((store) => ({
      state: store.state,
      loading: store.loading,
      initialize: store.initialize,
    }))
  );
  useEffect(() => {
    if (!state && !loading) void initialize();
  }, [initialize, loading, state]);
  const insight = state?.insights.find((item) => item.status === 'new');
  const open = () => setActiveSection('ai');
  return (
    <BaseCard
      size={size}
      role="button"
      tabIndex={0}
      className="group cursor-pointer"
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') open();
      }}
    >
      <div className="flex h-full flex-col justify-between gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4" aria-hidden="true" /> {t('sidebar.ai')}
          </div>
          <Badge tone="neutral">{state?.insights.length ?? 0}</Badge>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium">
            {insight?.title ??
              (loading ? t('navetAi.insights.loading') : t('navetAi.widget.learning'))}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {insight?.summary ?? t('navetAi.widget.description')}
          </p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{' '}
            {t('navetAi.widget.readOnly')}
          </span>
          <ChevronRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </BaseCard>
  );
}
