export type NavetRuntimeKind = 'ha_panel' | 'ha_ingress' | 'standalone' | 'dev';

export type RuntimeAuthMode = 'ha_frontend_session' | 'ingress_session' | 'oauth';

export interface RuntimeContext {
  kind: NavetRuntimeKind;
  appOrigin: string;
  appBasePath: string;
  haBaseUrl: string | null;
  haProxyBasePath: string | null;
  authMode: RuntimeAuthMode;
  supportsDirectHaHttp: boolean;
  supportsSameOriginHaProxy: boolean;
  supportsPanelHassBridge: boolean;
}

export type LegacyAuthRuntime = 'ha-panel' | 'ha-ingress' | 'standalone-oauth';

export function toLegacyAuthRuntime(kind: NavetRuntimeKind): LegacyAuthRuntime {
  switch (kind) {
    case 'ha_panel':
      return 'ha-panel';
    case 'ha_ingress':
      return 'ha-ingress';
    case 'standalone':
    case 'dev':
      return 'standalone-oauth';
  }
}

export function isIngressRuntime(context: RuntimeContext): boolean {
  return context.kind === 'ha_ingress';
}

export function isPanelRuntime(context: RuntimeContext): boolean {
  return context.kind === 'ha_panel';
}
