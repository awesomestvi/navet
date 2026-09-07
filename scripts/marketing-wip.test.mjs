import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { marketingWipRoot } from './content-workflow.mjs';
import { cleanMarketingWipTask, resolveMarketingWipTask } from './marketing-wip.mjs';

const testTaskId = 'test-marketing-wip-cleanup';
const testTaskPath = path.join(marketingWipRoot, 'videos', testTaskId);

afterEach(() => {
  fs.rmSync(testTaskPath, { recursive: true, force: true });
});

describe('marketing WIP cleanup', () => {
  it('removes exactly one completed task workspace', () => {
    fs.mkdirSync(testTaskPath, { recursive: true });
    fs.writeFileSync(path.join(testTaskPath, 'draft.md'), 'temporary planning');

    const result = cleanMarketingWipTask({ area: 'videos', id: testTaskId });

    expect(result).toEqual({ taskPath: testTaskPath, removed: true });
    expect(fs.existsSync(testTaskPath)).toBe(false);
  });

  it('supports a dry run without removing the task', () => {
    fs.mkdirSync(testTaskPath, { recursive: true });

    expect(cleanMarketingWipTask({ area: 'videos', id: testTaskId, dryRun: true }).removed).toBe(
      false
    );
    expect(fs.existsSync(testTaskPath)).toBe(true);
  });

  it('rejects unknown areas and traversal-like task ids', () => {
    expect(() => resolveMarketingWipTask('campaigns', testTaskId)).toThrow('Unknown WIP area');
    expect(() => resolveMarketingWipTask('videos', '../important')).toThrow(
      'WIP task id must use lowercase letters, numbers, and hyphens.'
    );
  });
});
