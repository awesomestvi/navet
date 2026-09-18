import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/product-approval.yml');
const workflow = parse(readFileSync(workflowPath, 'utf8'));
const invalidateScript = workflow.jobs.invalidate.steps.find(
  (step) => step.name === 'Remove approvals for the previous head'
)?.with?.script;

describe('human approval workflow', () => {
  it('keeps SHA-bound approval authoritative when cosmetic label cleanup is unavailable', () => {
    expect(workflow.jobs.invalidate.permissions).toEqual({ issues: 'write' });
    expect(invalidateScript).toContain('if (error.status === 404) continue');
    expect(invalidateScript).toContain('if (error.status === 403)');
    expect(invalidateScript).toContain('SHA-bound statuses remain authoritative');
    expect(invalidateScript).toContain('break');
  });
});
