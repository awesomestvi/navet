import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/product-approval.yml');
const workflow = parse(readFileSync(workflowPath, 'utf8'));
const invalidateScript = workflow.jobs.invalidate.steps.find(
  (step) => step.name === 'Remove approvals for the previous head'
)?.with?.script;
const approvalScript = workflow.jobs.approve.steps.find(
  (step) => step.name === 'Record approval for reviewed commit'
)?.with?.script;

describe('human approval workflow', () => {
  it('keeps SHA-bound approval authoritative when cosmetic label cleanup is unavailable', () => {
    expect(workflow.jobs.invalidate.permissions).toEqual({ issues: 'write' });
    expect(invalidateScript).toContain('if (error.status === 404) continue');
    expect(invalidateScript).toContain('if (error.status === 403)');
    expect(invalidateScript).toContain('SHA-bound statuses remain authoritative');
    expect(invalidateScript).toContain('break');
  });

  it('reserves explicit approval comments for foundation and security gates', () => {
    expect(approvalScript).not.toContain('/approve-product');
    expect(approvalScript).toContain('/approve-foundation');
    expect(approvalScript).toContain('/approve-security');
    expect(workflow.jobs.approve.steps[0].env.HUMAN_APPROVER).toContain('NAVET_HUMAN_APPROVER');
  });

  it('does not fail a recorded approval when cosmetic label synchronization is unavailable', () => {
    expect(approvalScript).toContain('github.rest.repos.createCommitStatus');
    expect(approvalScript).toContain('github.rest.issues.addLabels');
    expect(approvalScript).toContain('if (error.status !== 403) throw error');
    expect(approvalScript).toContain('The SHA-bound approval status was recorded successfully');
  });
});
