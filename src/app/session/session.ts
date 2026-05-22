import { getRuntimeConfig } from '../config/runtime-config';
import { storage } from '../utils/storage';

const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

export interface SessionConfig {
  url: string;
  token: string;
}

function normalizeToken(token: string): string {
  return token.trim();
}

export function isUsableSessionToken(token: string): boolean {
  if (token.length === 0) {
    return false;
  }

  for (const character of token) {
    const codePoint = character.codePointAt(0);
    if (character.trim() === '' || codePoint === undefined || codePoint < 32 || codePoint === 127) {
      return false;
    }
  }

  return true;
}

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function normalizeSessionConfig(config: SessionConfig): SessionConfig {
  return {
    url: normalizeUrl(config.url),
    token: normalizeToken(config.token),
  };
}

export function readStoredSessionConfig(key: string): SessionConfig | null {
  return storage.get<SessionConfig | null>(key, null);
}

export function writeStoredSessionConfig(key: string, config: SessionConfig): SessionConfig {
  const normalized = normalizeSessionConfig(config);
  storage.set(key, normalized);
  return normalized;
}

export function clearStoredSessionConfig(key: string): void {
  storage.remove(key);
}

export function readRuntimeSessionConfig(): SessionConfig | null {
  const runtimeConfig = getRuntimeConfig();

  if (
    !runtimeConfig.hassUrl ||
    !runtimeConfig.hassToken ||
    !isUsableSessionToken(runtimeConfig.hassToken)
  ) {
    return null;
  }

  return normalizeSessionConfig({
    url: runtimeConfig.hassUrl,
    token: runtimeConfig.hassToken,
  });
}

function isHomeAssistantIngressSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname.includes(HOME_ASSISTANT_INGRESS_PREFIX);
}

export function shouldSkipSharedSessionLoad(): boolean {
  if (!isHomeAssistantIngressSession()) {
    return false;
  }

  const runtimeConfig = getRuntimeConfig();
  return Boolean(
    runtimeConfig.hassUrl &&
      (!runtimeConfig.hassToken || !isUsableSessionToken(runtimeConfig.hassToken))
  );
}

export function readInitialSessionConfig(key: string): SessionConfig | null {
  if (isHomeAssistantIngressSession()) {
    const runtimeSessionConfig = readRuntimeSessionConfig();
    if (runtimeSessionConfig) {
      return runtimeSessionConfig;
    }

    if (shouldSkipSharedSessionLoad()) {
      return null;
    }

    return readStoredSessionConfig(key);
  }

  return readStoredSessionConfig(key) ?? readRuntimeSessionConfig();
}
