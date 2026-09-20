import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/release-tag-publish.yml');
const workflow = parse(readFileSync(workflowPath, 'utf8'));
const releaseWorkflow = parse(
  readFileSync(resolve(process.cwd(), '.github/workflows/release.yml'), 'utf8')
);

describe('production release tag publisher', () => {
  it('promotes an explicit tested tag without advancing protected main', () => {
    expect(workflow.on.workflow_dispatch.inputs.source_tag).toMatchObject({
      required: true,
      type: 'string',
    });
    expect(workflow.on.workflow_dispatch.inputs.release_tag).toMatchObject({
      required: true,
      type: 'string',
    });
    expect(workflow.permissions).toEqual({ actions: 'write', contents: 'write' });

    const job = workflow.jobs['promote-release'];
    const checkout = job.steps.find((step) => step.name === 'Checkout protected main');
    const validate = job.steps.find((step) => step.name === 'Validate promotion');
    const publish = job.steps.find((step) => step.name === 'Create and push promoted release tag');
    const dispatch = job.steps.find((step) => step.name === 'Dispatch artifact promotion');

    expect(checkout.with.ref).toBe('main');
    expect(checkout.with['fetch-depth']).toBe(0);
    expect(validate.run).toContain('git merge-base --is-ancestor');
    expect(validate.run).toContain('A stable release must promote a tested beta or release candidate.');
    expect(publish.run).toContain('git tag -a');
    expect(publish.run).toContain('Promoted-From: ${SOURCE_TAG}');
    expect(publish.run).toContain('git push origin "refs/tags/${RELEASE_TAG}:refs/tags/${RELEASE_TAG}"');
    expect(publish.run).not.toContain('refs/heads/main');
    expect(dispatch.run).toBe(
      'gh workflow run release.yml --ref "${RELEASE_TAG}" -f source_tag="${SOURCE_TAG}"'
    );
  });

  it('builds beta from a tested Dev commit, then promotes that release artifact', () => {
    expect(releaseWorkflow.on.workflow_dispatch.inputs.source_tag.required).toBe(true);

    const contextRun = releaseWorkflow.jobs['release-context'].steps.find(
      (step) => step.name === 'Resolve and validate promotion'
    ).run;
    expect(contextRun).toContain('Promoted-From:');
    expect(contextRun).toContain('scripts/generate-release-notes.mjs');
    expect(contextRun).toContain('head -n 1 || true');
    expect(contextRun).not.toContain('scripts/check-release-surfaces.mjs');

    const standaloneRun = releaseWorkflow.jobs['promote-standalone'].steps.find(
      (step) => step.name === 'Retag tested standalone image'
    ).run;
    const addonRun = releaseWorkflow.jobs['promote-addon'].steps.find(
      (step) => step.name === 'Retag tested add-on image'
    ).run;
    expect(standaloneRun).toContain('docker buildx imagetools create');
    expect(addonRun).toContain('docker buildx imagetools create');
    const standaloneBuild = releaseWorkflow.jobs['promote-standalone'].steps.find(
      (step) => step.name === 'Build release artifact from tested Dev commit'
    );
    const addonBuild = releaseWorkflow.jobs['promote-addon'].steps.find(
      (step) => step.name === 'Build release add-on from tested Dev commit'
    );
    expect(standaloneBuild.if).toContain('source_is_dev');
    expect(addonBuild.if).toContain('source_is_dev');
    expect(standaloneBuild.with['build-args']).toContain(
      'NAVET_VERSION=${{ needs.release-context.outputs.package_version }}'
    );
    expect(standaloneBuild.with['build-args']).toContain(
      'NAVET_BUILD_VERSION=${{ needs.release-context.outputs.package_version }}'
    );
    expect(addonBuild.with['build-args']).toContain(
      'NAVET_VERSION=${{ needs.release-context.outputs.package_version }}'
    );
    expect(addonBuild.with['build-args']).toContain(
      'NAVET_BUILD_VERSION=${{ needs.release-context.outputs.package_version }}'
    );

    const exportStep = releaseWorkflow.jobs['sync-hacs'].steps.find(
      (step) => step.name === 'Export HACS payload'
    );
    expect(exportStep.env.NAVET_RELEASE_VERSION).toContain('package_version');
    expect(exportStep.env.NAVET_RELEASE_NOTES_FILE).toContain('navet-hacs-release-notes.md');

    expect(releaseWorkflow.jobs['sync-addon-repository']).toBeUndefined();
    const metadataJob = releaseWorkflow.jobs['publish-addon-metadata'];
    const tokenStep = metadataJob.steps.find(
      (step) => step.name === 'Create GitHub App token for metadata PR'
    );
    const prepareStep = metadataJob.steps.find(
      (step) => step.name === 'Prepare and open metadata PR'
    );
    const mergeStep = metadataJob.steps.find(
      (step) => step.name === 'Wait for required checks and merge metadata PR'
    );
    expect(metadataJob.needs).toContain('verify-release');
    expect(tokenStep.with.repositories).toBe('navet');
    expect(prepareStep.run).toContain('scripts/prepare-addon-release-metadata.mjs');
    expect(prepareStep.run).toContain('gh pr create');
    expect(prepareStep.run).toContain('automation/release-metadata-${RELEASE_TAG}');
    expect(mergeStep.run).toContain('gh pr checks');
    expect(mergeStep.run).toContain('gh pr merge');
    expect(mergeStep.run).not.toContain('--admin');

    const verificationSteps = releaseWorkflow.jobs['verify-release'].steps;
    const stableFeedStep = verificationSteps.find(
      (step) => step.name === 'Verify canonical latest stable release feed'
    );
    const verificationCommands = verificationSteps
      .map((step) => step.run ?? '')
      .join('\n');
    expect(stableFeedStep.if).toBe("needs.release-context.outputs.prerelease != 'true'");
    expect(verificationCommands).not.toMatch(
      /https:\/\/(?:demo\.|docs\.|storybook\.)?navet\.app/
    );
  });
});
