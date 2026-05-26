export interface WsConnectionState {
  connected: boolean;
  reconnecting: boolean;
}

export interface ResolvedRequest {
  url: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  authStrategy?: 'none' | 'same_origin' | 'bearer' | 'panel_bridge';
}
