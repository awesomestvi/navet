import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pagesProjects, pagesBuildConfig } from './pages-policy.mjs';

export function scopedRuleset(ruleset) {
  const names = Object.values(pagesProjects).map((project) => `Cloudflare Pages: ${project.name}`);
  const status = ruleset.rules.find((rule) => rule.type === 'required_status_checks');
  if (
    !status?.parameters.required_status_checks.some(
      (check) => check.context === 'Product review gate' && check.integration_id === 15368,
    )
  ) {
    throw new Error('The GitHub Actions Product review gate must already be required.');
  }
  return {
    name: ruleset.name,
    target: ruleset.target,
    enforcement: ruleset.enforcement,
    conditions: ruleset.conditions,
    bypass_actors: ruleset.bypass_actors,
    rules: ruleset.rules.map((rule) =>
      rule.type !== 'required_status_checks'
        ? rule
        : {
            ...rule,
            parameters: {
              ...rule.parameters,
              required_status_checks: rule.parameters.required_status_checks.filter(
                (check) => !(names.includes(check.context) && check.integration_id === 85455),
              ),
            },
          },
    ),
  };
}

async function rollout() {
  const projects = Object.fromEntries(
    Object.entries(pagesProjects).map(([surface, project]) => [
      project.name,
      pagesBuildConfig(surface),
    ]),
  );
  if (!process.argv.includes('--apply')) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          projects,
          requiredCheck: 'Product review gate',
          environments: { beta: 'main only', production: 'main only' },
        },
        null,
        2,
      ),
    );
    return;
  }
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token)
    throw new Error(
      'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN locally. Do not paste credentials into chat.',
    );
  const repo = 'awesomestvi/navet';
  const gh = (path, method = 'GET', body) =>
    JSON.parse(
      execFileSync(
        'gh',
        ['api', `repos/${repo}/${path}`, '--method', method, ...(body ? ['--input', '-'] : [])],
        {
          encoding: 'utf8',
          input: body ? JSON.stringify(body) : undefined,
        },
      ),
    );
  // The deployed gate must be the code reviewed here, not just a similarly named check.
  for (const file of [
    '.github/workflows/ci.yml',
    '.github/workflows/release.yml',
    '.github/workflows/release-tag-publish.yml',
    'scripts/pipeline-impact.mjs',
    'scripts/pipeline-gate.mjs',
    'scripts/pages-policy.mjs',
    'scripts/pages-gate.mjs',
  ]) {
    const local = execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim();
    if (gh(`contents/${file}?ref=main`).sha !== local)
      throw new Error(`Merge the reviewed implementation first: ${file} differs from main.`);
  }
  for (const workflow of ['release.yml', 'release-tag-publish.yml']) {
    const runs = gh(`actions/workflows/${workflow}/runs?per_page=100`).workflow_runs;
    if (runs.some((run) => run.status !== 'completed'))
      throw new Error(
        'Wait for active or queued release workflows before changing environment restrictions.',
      );
  }
  const listing = gh('rulesets');
  const candidates = listing.filter(
    (rule) => rule.name === 'main-published' && rule.enforcement === 'active',
  );
  if (candidates.length !== 1) throw new Error('Expected one active main-published ruleset.');
  const ruleset = gh(`rulesets/${candidates[0].id}`);
  const updatedRuleset = scopedRuleset(ruleset);
  const environments = Object.fromEntries(
    ['beta', 'production'].map((name) => [name, gh(`environments/${name}`)]),
  );
  const existingPolicies = {};
  for (const [name, environment] of Object.entries(environments)) {
    const policies = environment.deployment_branch_policy?.custom_branch_policies
      ? gh(`environments/${name}/deployment-branch-policies`).branch_policies
      : [];
    existingPolicies[name] = policies;
    if (
      environment.protection_rules.some((rule) => rule.type !== 'branch_policy') ||
      policies.some((policy) => policy.name !== 'main' || policy.type !== 'branch')
    ) {
      throw new Error(`Review existing ${name} protections manually instead of overwriting them.`);
    }
  }
  const cf = async (name, method = 'GET', body) => {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/pages/projects/${name}`,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await response.json();
    if (!response.ok || !data.success)
      throw new Error(`Cloudflare ${method} failed for ${name} (${response.status}).`);
    return data.result;
  };
  const previousProjects = {};
  for (const name of Object.keys(projects)) {
    const project = await cf(name);
    if (
      project.source?.type !== 'github' ||
      project.source.config.owner !== 'awesomestvi' ||
      project.source.config.repo_name !== 'navet' ||
      project.production_branch !== 'main'
    ) {
      throw new Error(`Unexpected source configuration for ${name}.`);
    }
    previousProjects[name] = project;
  }
  const backup = mkdtempSync(join(tmpdir(), 'navet-pipeline-rollout-'));
  writeFileSync(
    join(backup, 'settings.json'),
    JSON.stringify(
      {
        ruleset,
        environments,
        projects: Object.fromEntries(
          Object.entries(previousProjects).map(([name, project]) => [
            name,
            { source: project.source },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  console.log(`Recovery snapshot: ${backup}/settings.json`);
  // The aggregate gate now protects affected previews; no temporary ungated merge window.
  gh(`rulesets/${ruleset.id}`, 'PUT', updatedRuleset);
  for (const [name, policy] of Object.entries(projects)) {
    const source = previousProjects[name].source;
    await cf(name, 'PATCH', { source: { ...source, config: { ...source.config, ...policy } } });
    const verified = await cf(name);
    if (
      JSON.stringify(verified.source.config.path_excludes) !== JSON.stringify(policy.path_excludes) ||
      JSON.stringify(verified.source.config.path_includes) !== JSON.stringify(policy.path_includes)
    )
      throw new Error(`Cloudflare did not retain ${name} filters.`);
  }
  for (const [name, environment] of Object.entries(environments)) {
    gh(`environments/${name}`, 'PUT', {
      wait_timer: 0,
      reviewers: [],
      can_admins_bypass: environment.can_admins_bypass,
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    });
    if (existingPolicies[name].length === 0) {
      gh(`environments/${name}/deployment-branch-policies`, 'POST', {
        name: 'main',
        type: 'branch',
      });
    }
    const policies = gh(`environments/${name}/deployment-branch-policies`).branch_policies;
    if (policies.length !== 1 || policies[0].name !== 'main' || policies[0].type !== 'branch')
      throw new Error(`Unexpected final ${name} restriction.`);
  }
  console.log('Scoped deployments and trusted-main release environments activated.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await rollout();
