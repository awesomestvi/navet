import { DashboardEmptyState } from '@navet/app/components/patterns';
import {
  Button,
  LoadingSpinner,
  MessageBar,
  SheetSurface,
  SheetSurfaceHeader,
} from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ChoreOccurrence, ChoreWorkspaceData } from '@navet/core/chores';
import { ClipboardCheck } from 'lucide-react';
import { useChoreWorkspaceStore } from '../chore-workspace-store';
import RoomChoreCard from './room-chore-card';

export default function RoomChoresSheet({
  room,
  data,
  occurrences,
  now,
  onOpenChange,
}: {
  room: string;
  data: ChoreWorkspaceData | null;
  occurrences: readonly ChoreOccurrence[];
  now: Date;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const status = useChoreWorkspaceStore((state) => state.status);
  const error = useChoreWorkspaceStore((state) => state.error);
  const load = useChoreWorkspaceStore((state) => state.load);
  const unavailable = ['error', 'unavailable', 'unauthorized'].includes(status);
  const title = t('household.tabs.chores');
  const closeLabel = t('common.close');

  return (
    <SheetSurface
      isOpen
      onOpenChange={onOpenChange}
      title={title}
      description={room}
      closeLabel={closeLabel}
      responsive
      bodyClassName="pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <SheetSurfaceHeader
        title={title}
        eyebrow={room}
        closeLabel={closeLabel}
        onClose={() => onOpenChange(false)}
        className={`border-b ${surface.border}`}
      />
      <div className="grid gap-3 px-4 pt-4 sm:px-5">
        {error || unavailable ? (
          <>
            <MessageBar tone="error">
              {error ||
                t(
                  status === 'unavailable'
                    ? 'household.unavailable.description'
                    : status === 'unauthorized'
                      ? 'household.unauthorized.description'
                      : 'household.error.description'
                )}
            </MessageBar>
            <Button variant="secondary" onClick={() => void load()}>
              {t('household.retry')}
            </Button>
          </>
        ) : null}
        {!data ? (
          unavailable ? null : (
            <LoadingSpinner message={t('common.loading')} />
          )
        ) : occurrences.length === 0 ? (
          <DashboardEmptyState
            icon={ClipboardCheck}
            title={t('household.today.emptyTitle')}
            description={t('household.today.emptyDescription')}
          />
        ) : (
          occurrences.map((occurrence) => (
            <RoomChoreCard key={occurrence.id} data={data} occurrence={occurrence} now={now} />
          ))
        )}
      </div>
    </SheetSurface>
  );
}
