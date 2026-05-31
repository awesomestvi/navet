import { type ArrivalVariant, DashboardArrivalRevealView } from './dashboard-arrival-reveal.view';
import { useDashboardArrivalReveal } from './use-dashboard-arrival-reveal';

interface DashboardArrivalRevealProps {
  open: boolean;
  onComplete: () => void;
  variant: ArrivalVariant;
}

export function DashboardArrivalReveal({ open, onComplete, variant }: DashboardArrivalRevealProps) {
  const controller = useDashboardArrivalReveal(open, onComplete, variant);

  if (!open) return null;

  return <DashboardArrivalRevealView controller={controller} />;
}
