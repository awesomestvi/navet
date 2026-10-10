import type { IntegrationProviderId } from './integration-providers';

export interface NavetTodoList {
  id: string;
  providerId: IntegrationProviderId;
  externalId: string;
  name: string;
  available: boolean;
  capabilities: {
    add: boolean;
    update: boolean;
    remove: boolean;
    description: boolean;
    dueDate: boolean;
    dueDateTime: boolean;
  };
}

export interface NavetTodoItem {
  uid: string;
  summary: string;
  completed: boolean;
  description?: string;
  dueDate?: string;
  dueDateTime?: string;
}

export interface NavetTodoItemInput {
  summary: string;
  description?: string | null;
  dueDate?: string | null;
  dueDateTime?: string | null;
}

export type NavetTodoItemUpdate = Partial<NavetTodoItemInput> & { completed?: boolean };
