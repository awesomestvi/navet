import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { HouseholdSection } from '@navet/app/features/chores/components/household-section';
import { useI18n } from '@navet/app/hooks';
import { useEffect } from 'react';
import { installDemoChoreActions } from './demo-chore-actions';

export function DemoHouseholdSection() {
  const { t } = useI18n();

  useEffect(() => {
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: createChoreDemoWorkspace({
        copy: {
          dishwasher: t('household.demo.dishwasher'),
          toys: t('household.demo.toys'),
          hallway: t('household.demo.hallway'),
          laundry: t('household.demo.laundry'),
          plants: t('household.demo.plants'),
          bins: t('household.demo.bins'),
          missionTitle: t('household.demo.missionTitle'),
          missionDescription: t('household.demo.missionDescription'),
          upcomingMissionTitle: t('household.demo.upcomingMissionTitle'),
          upcomingMissionDescription: t('household.demo.upcomingMissionDescription'),
          rewardTitle: t('household.demo.rewardTitle'),
          secondRewardTitle: t('household.demo.secondRewardTitle'),
          childDishwasher: t('household.demo.childDishwasher'),
          childToys: t('household.demo.childToys'),
          childHallway: t('household.demo.childHallway'),
          kitchen: t('household.demo.kitchen'),
          bedroom: t('household.demo.bedroom'),
          hallwayRoom: t('household.demo.hallwayRoom'),
          livingRoom: t('household.demo.livingRoom'),
        },
      }),
    });
    const restoreChoreActions = installDemoChoreActions();
    return () => {
      restoreChoreActions();
      useChoreWorkspaceStore.getState().reset();
    };
  }, [t]);

  return <HouseholdSection syncEnabled={false} />;
}
