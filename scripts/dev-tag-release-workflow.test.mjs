import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/dev-tag-release.yml');
const workflowSource = readFileSync(workflowPath, 'utf8');
const workflow = parse(workflowSource);
const publishWorkflowPath = resolve(process.cwd(), '.github/workflows/dev-tag-publish.yml');
const publishWorkflow = parse(readFileSync(publishWorkflowPath, 'utf8'));

function findStep(jobName, stepName) {
  const step = workflow.jobs[jobName]?.steps?.find((candidate) => candidate.name === stepName);
  expect(step, `${jobName} is missing step "${stepName}"`).toBeDefined();
  return step;
}

describe('Navet Dev tag workflow', () => {
  it('starts a main-backed dev publish after every merged pull request', () => {
    expect(publishWorkflow.on).toMatchObject({
      workflow_dispatch: null,
      pull_request_target: {
        branches: ['main'],
        types: ['closed'],
      },
    });
    expect(publishWorkflow.concurrency).toBeUndefined();

    const mergedOrManual =
      "github.event_name == 'workflow_dispatch' || github.event.pull_request.merged == true";
    expect(publishWorkflow.jobs['tier-1-release-critical'].if).toBe(mergedOrManual);
    expect(publishWorkflow.jobs['prepare-dev-release'].if).toBe(mergedOrManual);
    expect(publishWorkflow.jobs['prepare-dev-release'].needs).toBe('tier-1-release-critical');

    const checkoutStep = publishWorkflow.jobs['prepare-dev-release'].steps.find(
      (step) => step.name === 'Checkout main'
    );
    expect(checkoutStep.with.ref).toBe(
      "${{ github.event.pull_request.merge_commit_sha || 'main' }}"
    );

    const publishStep = publishWorkflow.jobs['prepare-dev-release'].steps.find(
      (step) => step.name === 'Create and push Navet Dev tag'
    );
    expect(publishStep.run).toContain('max_attempts=10');
    expect(publishStep.run).toContain('git switch -C main');
    expect(publishStep.run).toContain(
      'node scripts/create-dev-release.mjs --tag-only --push'
    );
    const dispatchStep = publishWorkflow.jobs['prepare-dev-release'].steps.find(
      (step) => step.name === 'Dispatch Navet Dev artifact publication'
    );
    expect(dispatchStep.run).toBe('gh workflow run dev-tag-release.yml --ref "${TAG_NAME}"');
    expect(workflow.on.workflow_dispatch).toBeNull();
  });

  it('serializes publishes and records immutable source provenance', () => {
    expect(workflow.concurrency).toEqual({
      group: 'navet-dev-release',
      'cancel-in-progress': false,
    });

    const resolveStep = findStep('release-context', 'Resolve Navet Dev version');
    expect(resolveStep.run).toContain(
      '"refs/tags/${TAG_NAME}:refs/tags/${TAG_NAME}"'
    );
    expect(resolveStep.run).toContain('git cat-file -t');
    expect(resolveStep.run).toContain('must be an annotated tag');
    expect(resolveStep.run).toContain('Source-Branch:');
    expect(resolveStep.run).toContain('git merge-base --is-ancestor');
    expect(resolveStep.run).toContain('--allow-stale-addon-metadata');
    expect(workflow.jobs['release-context'].outputs).toMatchObject({
      source_branch: '${{ steps.version.outputs.source_branch }}',
      release_sha: '${{ steps.version.outputs.release_sha }}',
      main_backed: '${{ steps.version.outputs.main_backed }}',
    });
  });

  it('publishes exact ARM64 artifacts from every branch but gates moving aliases on main', () => {
    const standaloneTags = findStep('publish-standalone', 'Resolve standalone dev tags').run;
    expect(standaloneTags).toContain(
      '$IMAGE:${{ needs.release-context.outputs.dev_version }}'
    );
    expect(standaloneTags).toContain(
      '${{ needs.release-context.outputs.main_backed }}'
    );
    expect(standaloneTags).toContain('$IMAGE:edge');
    expect(standaloneTags).toContain('$IMAGE:dev');
    expect(workflow.jobs['publish-standalone'].steps.at(-1).with.platforms).toBe(
      'linux/amd64,linux/arm64'
    );

    const addonTags = findStep('publish-addon', 'Resolve add-on dev-tag tags').run;
    expect(addonTags).toContain('${{ needs.release-context.outputs.main_backed }}');
    expect(addonTags).toContain('$IMAGE:$VERSION');
    expect(addonTags).toContain('$IMAGE:edge');
    expect(addonTags).toContain('$IMAGE:dev');
    expect(workflow.jobs['publish-addon'].strategy.matrix.arch).toEqual(['amd64', 'aarch64']);
  });

  it('explains exact-only branch builds in the GitHub prerelease', () => {
    const notesStep = findStep('github-release', 'Build prerelease notes');
    expect(notesStep.env.SOURCE_BRANCH).toBe(
      '${{ needs.release-context.outputs.source_branch }}'
    );
    expect(notesStep.run).toContain('${SOURCE_BRANCH}');
    expect(notesStep.run).toContain('immutable branch validation build');
    expect(notesStep.run).toContain('does not change');
    expect(notesStep.run).toContain('linux/arm64');
    expect(notesStep.run).toContain('aarch64');
    expect(notesStep.run).toContain('scripts/generate-release-notes.mjs');
    expect(notesStep.run).toContain('${RELEASE_SHA}^');
  });
});
