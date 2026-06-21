import { memo } from 'react';
import {
  SharedVacuumCardShell,
  useVacuumCardState,
  type VacuumCardProps,
} from './vacuum-card.shared';

export const LawnMowerCard = memo(function LawnMowerCard(props: VacuumCardProps) {
  const state = useVacuumCardState(props, { entityVariant: 'lawn-mower' });

  return <SharedVacuumCardShell state={state} />;
});
