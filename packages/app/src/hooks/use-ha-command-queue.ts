// Compatibility import for existing consumers. Scheduling is provider-neutral.

export type { CommandQueue as HaCommandQueue } from './use-command-queue';
export { useCommandQueue as useHaCommandQueue } from './use-command-queue';
