import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) && !entry.name.endsWith('.test.ts')
      ? [path]
      : [];
  });
}

describe('Navet AI read-only boundary', () => {
  it('does not import or call command, service, notification, or automation APIs', () => {
    const forbidden = [
      /dispatchEntityCommand/,
      /executeCommand/,
      /callService/,
      /sendNotification/,
      /createAutomation/,
      /NavetCommand/,
      /provider-feature-services/,
    ];
    const files = [
      ...sourceFiles(import.meta.dirname),
      ...sourceFiles(join(import.meta.dirname, '../../../../../services/navet-ai')),
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of forbidden)
        expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
    }
  });
});
