import { describe, expect, it } from 'vitest';
import { createGithubProjectIssueReader, listGithubProjectDrafts } from './agent-github-project.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { evaluateProposalObservation } from './agent-proposal-scope.mjs';

const policy = { organizationLogin: 'example-org', organizationId: 'ORG_12345678',
  projectId: 'PVT_12345678', viewerId: 'USER_12345678', stageField: 'Proposal stage' };
const now = 1_000_000;
const project = () => ({ id: policy.projectId, public: false, closed: false,
  url: 'https://github.com/orgs/example-org/projects/1', owner: { id: policy.organizationId, login: policy.organizationLogin } });
const response = () => ({ viewer: { id: policy.viewerId }, node: { id: 'PVTI_12345678', fullDatabaseId: '123456',
  isArchived: false, updatedAt: new Date(now).toISOString(), project: project(),
  content: { id: 'DI_12345678', title: 'Private idea', body: 'Complete private evidence.' },
  fieldValues: { nodes: [{ name: 'Captured', field: { name: 'Proposal stage' } }], pageInfo: { hasNextPage: false } } } });
const read = (graphql, maxReadMs) => createGithubProjectIssueReader({ policy, graphql, now: () => now, maxReadMs })('PVTI_12345678');

describe('private GitHub Project scope reader', () => {
  it('binds complete private draft scope and preserves a usable item URL', async () => {
    const result = await read(async () => response());
    expect(result).toMatchObject({ status: 'available', url: `${project().url}?pane=issue&itemId=123456`,
      issue: { id: 'PVTI_12345678', teamId: policy.organizationId, projectId: policy.projectId, labels: ['Captured'] } });
    expect(evaluateProposalObservation(createPlanningBinding(result.issue), result, now).result).toBe('pass');
  });

  it.each(['public', 'closed', 'project', 'organization', 'viewer', 'stage', 'pagination', 'content'])('fails closed on changed %s', async (change) => {
    const value = response();
    if (change === 'public') value.node.project.public = true;
    if (change === 'closed') value.node.project.closed = true;
    if (change === 'project') value.node.project.id = 'PVT_ANOTHER1';
    if (change === 'organization') value.node.project.owner.id = 'ORG_ANOTHER1';
    if (change === 'viewer') value.viewer.id = 'USER_ANOTHER1';
    if (change === 'stage') value.node.fieldValues.nodes = [];
    if (change === 'pagination') value.node.fieldValues.pageInfo.hasNextPage = true;
    if (change === 'content') delete value.node.content.body;
    expect((await read(async () => value)).status).toBe('unavailable');
  });

  it('rejects scope or lifecycle changes between reads and bounds stalled transport', async () => {
    let count = 0;
    expect((await read(async () => { const value = response(); if (count++) value.node.content.body += ' changed'; return value; })).status).toBe('unavailable');
    expect((await read(() => new Promise(() => {}), 5)).status).toBe('unavailable');
  });

  it('preserves archived/rejected withdrawal and does not turn Approved into discovery authority', async () => {
    for (const [stage, archived] of [['Captured', true], ['Rejected', false], ['Approved', false]]) {
      const value = response(); value.node.isArchived = archived; value.node.fieldValues.nodes[0].name = stage;
      const result = await read(async () => value);
      expect(evaluateProposalObservation(createPlanningBinding(result.issue), result, now).result).toBe('fail');
    }
  });

  it('reads every inventory page and rejects duplicate identities', async () => {
    let count = 0;
    const graphql = async (query) => { expect(query).toContain('items(first:25'); const first = !count++; const item = response().node;
      item.id = first ? 'PVTI_12345678' : 'PVTI_87654321';
      return { viewer: response().viewer, node: { ...project(), items: { nodes: [item],
        pageInfo: { hasNextPage: first, endCursor: first ? 'next' : null } } } }; };
    expect(await listGithubProjectDrafts({ policy, graphql })).toHaveLength(2);
    count = 0;
    await expect(listGithubProjectDrafts({ policy, graphql: async () => ({ viewer: response().viewer,
      node: { ...project(), items: { nodes: [response().node], pageInfo: { hasNextPage: true, endCursor: String(++count) } } } }) })).rejects.toThrow('Duplicate');
  });
});
