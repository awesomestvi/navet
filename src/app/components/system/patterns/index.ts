// Public pattern exports for Storybook and cross-app discovery.
// Prefer authoring new patterns in `src/app/components/patterns`.
export {
  CardActionRow,
  DashboardEmptyState,
  FieldBlock,
  InteractionPreviewCard,
  SettingsLivePreviewFrame,
  TableCellContent,
} from '@/app/components/patterns';
// MessageBar moved to primitives
export { MessageBar, type MessageBarProps } from '@/app/components/primitives/message-bar';
export { DashboardHeroSection } from '@/app/features/dashboard/components/dashboard-hero-section';
