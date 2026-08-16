import { useI18n } from '@navet/app/hooks';
import { normalizeChoreExperienceState } from '@navet/core/chore-experience';
import type { ChoreOccurrence, ChoreWorkspaceData } from '@navet/core/chores';
import { getChoreCardAction } from '../chore-card-action';
import { getDefinition } from '../chore-dashboard-selectors';
import { useChoreWorkspaceStore } from '../chore-workspace-store';
import { ChoreFocusCard } from './chore-card';

export default function RoomChoreCard({
  data,
  occurrence,
  now,
}: {
  data: ChoreWorkspaceData;
  occurrence: ChoreOccurrence;
  now: Date;
}) {
  const { t } = useI18n();
  const execute = useChoreWorkspaceStore((state) => state.execute);
  const definition = getDefinition(data, occurrence);
  if (!definition) return null;

  const experience = normalizeChoreExperienceState(data.experience);
  const storedPresentation = experience.presentationByDefinitionId[definition.id];
  const presentation =
    experience.gamificationMode === 'off' && storedPresentation
      ? { ...storedPresentation, points: undefined, childTitle: undefined }
      : storedPresentation;

  return (
    <ChoreFocusCard
      size="medium"
      definition={definition}
      occurrence={occurrence}
      participantsById={data.participantsById}
      presentation={presentation}
      action={getChoreCardAction(occurrence, definition, 'all', execute, t)}
      childMode={experience.gamificationMode === 'adventure'}
      now={now}
    />
  );
}
