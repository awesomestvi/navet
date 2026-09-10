import { Button } from '@navet/app/components/primitives';
import { ChoreFocusCard } from '@navet/app/features/chores/components/chore-card';
import {
  HousePulse,
  MissionCard,
  RewardGoalCard,
} from '@navet/app/features/chores/components/chore-support-cards';
import { I18nProvider } from '@navet/app/i18n/i18n-provider';
import { CHORE_DEMO } from '@navet/app/marketing/data/marketingChoreDemoData';
import { RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';

export function MarketingChoreDemo() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const completed = completedIds.length;
  const total = CHORE_DEMO.tasks.length;
  const finished = completed === total;
  const earned = CHORE_DEMO.tasks.reduce(
    (points, task) =>
      points + (completedIds.includes(task.definition.id) ? task.presentation.points : 0),
    0
  );
  const points = CHORE_DEMO.reward.points + earned;
  const message = finished
    ? 'Weekend reset complete. Movie night is ready!'
    : completed > 0
      ? `${earned} points earned. One more chore to movie night.`
      : 'Try marking a chore done. Every contribution brings movie night closer.';

  function complete(id: string) {
    if (completedIds.includes(id)) return;
    setCompletedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    if (completed + 1 === total) setShowRewards(true);
    requestAnimationFrame(() => {
      const next = ref.current?.querySelector<HTMLButtonElement>(
        '[data-demo-task] button, [data-demo-reset]'
      );
      next?.focus({ preventScroll: true });
    });
  }

  return (
    <div ref={ref} className="marketing-chore-demo">
      <I18nProvider>
        <HousePulse
          pulse={{
            completed,
            total,
            remaining: total - completed,
            overdue: 0,
            percent: (completed / total) * 100,
            pointsEarned: earned,
            strongDays: 0,
            streakDays: 0,
          }}
          onSeeRewards={() => setShowRewards((value) => !value)}
          rewardsExpanded={showRewards}
        />
        <p className="marketing-chore-feedback text-sm leading-6" role="status">
          {message}
        </p>
        <div className="marketing-chore-grid">
          {CHORE_DEMO.tasks.map((task) => {
            const done = completedIds.includes(task.definition.id);
            return (
              <div
                key={task.definition.id}
                className="marketing-chore-card"
                data-demo-task={task.definition.id}
                data-complete={done}
              >
                <ChoreFocusCard
                  definition={task.definition}
                  occurrence={
                    done
                      ? {
                          ...task.occurrence,
                          status: 'done',
                          completedBy: task.occurrence.assigneeIds[0],
                          completedAt: CHORE_DEMO.now.toISOString(),
                        }
                      : task.occurrence
                  }
                  participantsById={CHORE_DEMO.people}
                  now={CHORE_DEMO.now}
                  presentation={task.presentation}
                  action={{
                    label: 'Mark done',
                    kind: 'complete',
                    onSelect: () => complete(task.definition.id),
                  }}
                />
              </div>
            );
          })}
        </div>
        {showRewards ? (
          <section
            id="chores-rewards-section"
            className="marketing-chore-grid marketing-chore-rewards"
            aria-label="Mission and reward progress"
          >
            <div className="marketing-chore-card" data-complete={finished}>
              <MissionCard
                progress={{
                  ...CHORE_DEMO.mission,
                  mission: {
                    ...CHORE_DEMO.mission.mission,
                    status: finished ? 'complete' : 'active',
                  },
                  completed,
                  total,
                  percent: (completed / total) * 100,
                }}
              />
            </div>
            <div className="marketing-chore-card" data-complete={finished}>
              <RewardGoalCard
                progress={{
                  ...CHORE_DEMO.reward,
                  points,
                  percent: (points / CHORE_DEMO.reward.goal.targetPoints) * 100,
                }}
              />
            </div>
          </section>
        ) : null}
      </I18nProvider>
      <div className="marketing-chore-footer">
        <span className="text-xs opacity-60">Sample household · Motivation is optional</span>
        <Button
          variant="ghost"
          size="compact"
          data-demo-reset
          leading={<RotateCcw size={14} aria-hidden="true" />}
          onClick={() => {
            setCompletedIds([]);
            setShowRewards(false);
          }}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
