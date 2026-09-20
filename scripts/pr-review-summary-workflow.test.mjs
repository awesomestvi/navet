import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowSource = readFileSync(
  resolve(process.cwd(), '.github/workflows/pr-review-summary.yml'),
  'utf8'
);
const workflow = parse(workflowSource);
const scriptSource = readFileSync(
  resolve(process.cwd(), 'scripts/update-pr-review-summary.mjs'),
  'utf8'
);
const tokenStep = workflow.jobs.summary.steps.find(
  (step) => step.name === 'Create Navet Nisse comment token'
);
const publishStep = workflow.jobs.summary.steps.find(
  (step) => step.name === 'Publish readiness and preview links'
);

describe('PR review summary workflow', () => {
  it('mints a repository-scoped Navet Nisse token for issue comments', () => {
    expect(tokenStep).toMatchObject({
      id: 'navet_nisse_token',
      uses: 'actions/create-github-app-token@fee1f7d63c2ff003460e3d139729b119787bc349',
      with: {
        'app-id': '${{ secrets.NAVET_NISSE_APP_ID }}',
        'private-key': '${{ secrets.NAVET_NISSE_PRIVATE_KEY }}',
        owner: '${{ github.repository_owner }}',
        repositories: '${{ github.event.repository.name }}',
        'permission-issues': 'write',
      },
    });
  });

  it('uses Navet Nisse only for the automated review comment', () => {
    expect(publishStep.env).toEqual({
      GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
      NAVET_NISSE_TOKEN: '${{ steps.navet_nisse_token.outputs.token }}',
    });
    expect(scriptSource).toContain("const SUMMARY_AUTHOR = 'navet-nisse[bot]'");
    expect(scriptSource).toContain('const commentToken = process.env.NAVET_NISSE_TOKEN');
    expect(scriptSource).toContain('commentToken\n  );');
  });
});
