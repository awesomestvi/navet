import { getIntegrationSessionRuntimeRegistration } from './session-runtime-registry';
import type {
  AuthSessionSnapshot,
  IntegrationSessionRuntimeRegistration,
} from './session-runtime-types';

export type IntegrationSessionRuntime = IntegrationSessionRuntimeRegistration;
export type IntegrationSessionSnapshot = AuthSessionSnapshot;

export const integrationSessionRuntime: IntegrationSessionRuntime =
  getIntegrationSessionRuntimeRegistration();
