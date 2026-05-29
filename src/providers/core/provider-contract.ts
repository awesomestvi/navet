import type {
  CommandResult,
  NavetCommand,
  NavetEntity,
  NavetEntityEvent,
  Unsubscribe,
} from './types';

export interface SmartHomeProviderAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listEntities(): Promise<NavetEntity[]>;
  getEntity(id: string): Promise<NavetEntity | null>;
  execute(command: NavetCommand): Promise<CommandResult>;
  subscribeToEvents(callback: (event: NavetEntityEvent) => void): Promise<Unsubscribe>;
}
