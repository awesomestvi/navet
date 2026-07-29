export const INSTALLATION_PAIRING_HEADER = 'X-Navet-Installation-Key';
export const INSTALLATION_PAIRING_FRAGMENT_PARAM = 'navet_pairing';

const INSTALLATION_PAIRING_KEY_PATTERN = /^[a-f0-9]{64}$/;

let pairingKeyBytes: Uint8Array | null = null;

function clearPairingKeyBytes() {
  pairingKeyBytes?.fill(0);
  pairingKeyBytes = null;
}

function decodePairingKey(value: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function encodePairingKey(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) {
    value += byte.toString(16).padStart(2, '0');
  }
  return value;
}

export function captureInstallationPairingKeyFromFragment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const rawFragment = window.location.hash.slice(1);
  if (!rawFragment) {
    return false;
  }

  const fragmentParams = new URLSearchParams(rawFragment);
  if (!fragmentParams.has(INSTALLATION_PAIRING_FRAGMENT_PARAM)) {
    return false;
  }

  const candidate = fragmentParams.get(INSTALLATION_PAIRING_FRAGMENT_PARAM)?.trim() ?? '';
  fragmentParams.delete(INSTALLATION_PAIRING_FRAGMENT_PARAM);
  const remainingFragment = fragmentParams.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${
      remainingFragment ? `#${remainingFragment}` : ''
    }`
  );

  clearPairingKeyBytes();
  if (!INSTALLATION_PAIRING_KEY_PATTERN.test(candidate)) {
    return false;
  }

  pairingKeyBytes = decodePairingKey(candidate);
  return true;
}

export function getInstallationPairingHeaders(): Record<string, string> {
  if (!pairingKeyBytes) {
    return {};
  }
  return {
    [INSTALLATION_PAIRING_HEADER]: encodePairingKey(pairingKeyBytes),
  };
}

export function clearInstallationPairingKey(): void {
  clearPairingKeyBytes();
}
