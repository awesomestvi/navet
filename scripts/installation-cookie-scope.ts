import { createHash } from 'node:crypto'

const INSTALLATION_KEY_PATTERN = /^[a-f0-9]{64}$/
const COOKIE_NAME_PATTERN = /^[a-z0-9_]+$/
const COOKIE_SCOPE_DOMAIN = 'navet-cookie-scope:v1\0'
const COOKIE_SCOPE_HEX_LENGTH = 24

export interface InstallationCookieNames {
  currentName: string
  legacyName: string
  scoped: boolean
}

export function createInstallationCookieNames(
  baseName: string,
  installationKey?: string
): InstallationCookieNames {
  if (!COOKIE_NAME_PATTERN.test(baseName)) {
    throw new Error('Invalid installation cookie base name')
  }
  if (!installationKey) {
    return {
      currentName: baseName,
      legacyName: baseName,
      scoped: false,
    }
  }
  if (!INSTALLATION_KEY_PATTERN.test(installationKey)) {
    throw new Error('Invalid Navet installation key for cookie scope')
  }

  const suffix = createHash('sha256')
    .update(`${COOKIE_SCOPE_DOMAIN}${installationKey}`)
    .digest('hex')
    .slice(0, COOKIE_SCOPE_HEX_LENGTH)
  return {
    currentName: `${baseName}_${suffix}`,
    legacyName: baseName,
    scoped: true,
  }
}
