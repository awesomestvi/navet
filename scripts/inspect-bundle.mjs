import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { appPaths } from './repo-paths.mjs'

const assetsDir = join(appPaths.standaloneDist, 'assets')
const maxRows = Number.parseInt(process.argv[2] ?? '25', 10)

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${bytes} B`
}

function getAssetRows() {
  return readdirSync(assetsDir)
    .map((name) => {
      const filePath = join(assetsDir, name)
      const size = statSync(filePath).size
      return { name, size }
    })
    .sort((left, right) => right.size - left.size)
}

try {
  const rows = getAssetRows()
  const total = rows.reduce((sum, row) => sum + row.size, 0)

  console.log(`apps/standalone/dist/assets total: ${formatBytes(total)}`)
  console.log(`largest assets, top ${Number.isFinite(maxRows) ? maxRows : 25}:`)

  for (const row of rows.slice(0, Number.isFinite(maxRows) ? maxRows : 25)) {
    console.log(`${formatBytes(row.size).padStart(9)}  ${row.name}`)
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? `Unable to inspect apps/standalone/dist/assets: ${error.message}`
      : 'Unable to inspect apps/standalone/dist/assets'
  )
  process.exitCode = 1
}
