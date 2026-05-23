export interface AuthSession {
  hassUrl: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthAdapter {
  readonly kind: string;
  init(): Promise<AuthSession | null>;
  login?(input?: { hassUrl?: string; token?: string }): Promise<AuthSession>;
  refresh?(session: AuthSession): Promise<AuthSession>;
  logout?(): Promise<void>;
}
