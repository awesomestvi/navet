import { toLegacyAuthRuntime } from '@/app/infrastructure/home-assistant/runtime/runtime-context';
import { getRuntimeContext } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';

export type AuthRuntime = 'ha-panel' | 'ha-ingress' | 'standalone-oauth';

export function detectAuthRuntime(): AuthRuntime {
  return toLegacyAuthRuntime(getRuntimeContext().kind);
}
