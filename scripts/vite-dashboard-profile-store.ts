import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface DashboardProfileData {
  app: 'navet'
  version: 3
  exportedAt?: string
}

export interface DashboardProfileMetadata {
  etag: string
  lastModified: string
}

export function isValidDashboardProfileData(value: unknown): value is DashboardProfileData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const profile = value as Partial<DashboardProfileData>
  return profile.app === 'navet' && profile.version === 3
}

export function buildDashboardProfileMetadata(
  serializedProfile: string,
  stat: { mtimeMs: number; mtime: Date }
): DashboardProfileMetadata {
  const parsed = JSON.parse(serializedProfile) as Partial<DashboardProfileData>
  const exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : 'unknown'

  return {
    etag: `"${stat.mtimeMs}-${serializedProfile.length}-${exportedAt}"`,
    lastModified: stat.mtime.toUTCString(),
  }
}

export function createViteDashboardProfileStore(
  profileFilePath = path.resolve(process.cwd(), '.cache', 'navet-dashboard-profile.json')
) {
  let serializedProfile = loadPersistedDashboardProfile(profileFilePath)

  return {
    getSerializedProfile(): string | null {
      return serializedProfile
    },
    getProfile(): DashboardProfileData | null {
      if (!serializedProfile) {
        return null
      }

      try {
        const parsed = JSON.parse(serializedProfile)
        return isValidDashboardProfileData(parsed) ? parsed : null
      } catch {
        return null
      }
    },
    getProfileMetadata(): DashboardProfileMetadata | null {
      if (!serializedProfile) {
        return null
      }

      try {
        const stat = statSync(profileFilePath)
        return buildDashboardProfileMetadata(serializedProfile, stat)
      } catch {
        return null
      }
    },
    saveProfile(profile: DashboardProfileData) {
      const serialized = JSON.stringify(profile)
      mkdirSync(path.dirname(profileFilePath), { recursive: true })
      writeFileSync(profileFilePath, serialized, 'utf8')
      serializedProfile = serialized
    },
    clearProfile() {
      serializedProfile = null
      rmSync(profileFilePath, { force: true })
    },
  }
}

function loadPersistedDashboardProfile(profileFilePath: string): string | null {
  try {
    const serialized = readFileSync(profileFilePath, 'utf8')
    const parsed = JSON.parse(serialized)
    return isValidDashboardProfileData(parsed) ? serialized : null
  } catch {
    return null
  }
}
