import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/dev-tag-release.yml');
const workflowSource = readFileSync(workflowPath, 'utf8');
const workflow = parse(workflowSource);

function findStep(jobName, stepName) {
  const step = workflow.jobs[jobName]?.steps?.find((candidate) => candidate.name === stepName);
  expect(step, `${jobName} is missing step "${stepName}"`).toBeDefined();
  return step;
}

describe('Navet Dev tag workflow', () => {
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
  });
});
