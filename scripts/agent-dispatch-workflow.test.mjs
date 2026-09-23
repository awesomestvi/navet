import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it, vi } from 'vitest';
import { acceptAgentComment } from './agent-dispatch-intake.mjs';

const workflowSource = readFileSync(resolve(process.cwd(), '.github/workflows/agent-dispatch.yml'), 'utf8');
const workflow = parse(workflowSource);
const stewardshipSource = readFileSync(resolve(process.cwd(), '.github/workflows/docs-steward.yml'), 'utf8');
const managedLabels = JSON.parse(readFileSync(resolve(process.cwd(), '.github/labels.json'), 'utf8'));
const retiredLabels = JSON.parse(readFileSync(resolve(process.cwd(), '.github/retired-labels.json'), 'utf8'));

function comment(id, login, body) {
  return { id, user: { login }, body, created_at: new Date(Date.UTC(2026, 0, 1, 0, id)).toISOString() };
}

function harness({ actor = 'reporter', body = 'iOS 27, Navet 0.17.2', comments = [], reactions = {}, events = [] } = {}) {
  const current = comment(5, actor, body);
  const createForIssueComment = vi.fn(async () => ({}));
  const core = { notice: vi.fn(), setFailed: vi.fn() };
  const github = {
    paginate: vi.fn(async (method, args) => method(args)),
    rest: {
      issues: {
        listComments: vi.fn(async () => [...comments, current]),
        listEvents: vi.fn(async () => events),
      },
      reactions: {
        listForIssueComment: vi.fn(async ({ comment_id }) => reactions[comment_id] ?? []),
        createForIssueComment,
      },
      repos: {
        getCollaboratorPermissionLevel: vi.fn(async ({ username }) => ({
          data: { permission: username === 'maintainer' ? 'write' : 'read' },
        })),
      },
    },
  };
  const context = {
    repo: { owner: 'awesomestvi', repo: 'navet' },
    payload: { issue: { number: 183, state: 'open', user: { login: 'reporter' } }, comment: current },
  };
  return { github, context, core, createForIssueComment };
}

const accepted = [{ content: 'eyes', user: { login: 'github-actions[bot]' } }];
const questionThread = [
  comment(1, 'maintainer', '/navet research'),
  comment(2, 'navet-nisse[bot]', 'Which iOS version and Navet version? That will help us reproduce it.'),
];

describe('agent issue intake', () => {
  it('manages both one-shot request labels without retiring them', () => {
    for (const name of ['navet: research', 'navet: implement']) {
      expect(managedLabels.some((label) => label.name === name)).toBe(true);
      expect(retiredLabels).not.toContain(name);
    }
  });

  it('listens to issue comments with narrow permissions', () => {
    expect(workflow.on).toEqual({ issue_comment: { types: ['created'] } });
    expect(workflow.permissions).toEqual({ contents: 'read', issues: 'write' });
    expect(workflow.jobs.accept.if).toContain('github.event.issue.pull_request == null');
    expect(workflow.jobs.accept.steps.some((step) => step.uses === 'actions/checkout@v5')).toBe(true);
    expect(workflow.jobs.accept.steps.at(-1).with.script).toContain('acceptAgentComment');
  });

  it('accepts an answer to the latest Nisse question after an accepted command', async () => {
    const input = harness({ comments: questionThread, reactions: { 1: accepted } });
    await acceptAgentComment(input);
    expect(input.createForIssueComment).toHaveBeenCalledWith(expect.objectContaining({ comment_id: 5, content: 'eyes' }));
  });

  it('accepts a reply to Nisse requesting a retest', async () => {
    const input = harness({
      body: 'I also checked Navet Dev and the issue is the same.',
      comments: [
        comment(1, 'maintainer', '/navet research'),
        comment(2, 'navet-nisse[bot]', 'Please retest with the current Navet Dev build and let us know if the fields still extend outside the card.'),
      ],
      reactions: { 1: accepted },
    });
    await acceptAgentComment(input);
    expect(input.createForIssueComment).toHaveBeenCalledWith(expect.objectContaining({ comment_id: 5, content: 'eyes' }));
  });

  it('accepts a requested answer after an authorized research label was applied', async () => {
    const input = harness({
      comments: [comment(2, 'navet-nisse[bot]', 'Which Navet version are you using?')],
      events: [{
        event: 'labeled',
        label: { name: 'navet: research' },
        actor: { login: 'maintainer' },
        created_at: comment(1, 'maintainer', '').created_at,
      }],
    });
    await acceptAgentComment(input);
    expect(input.createForIssueComment).toHaveBeenCalledOnce();
  });

  it('rejects a requested answer without an authorized earlier request label', async () => {
    const cases = [
      { event: 'labeled', label: { name: 'navet: research' }, actor: { login: 'reporter' }, created_at: comment(1, 'reporter', '').created_at },
      { event: 'labeled', label: { name: 'navet: research' }, actor: { login: 'maintainer' }, created_at: comment(3, 'maintainer', '').created_at },
      { event: 'labeled', label: { name: 'type: bug' }, actor: { login: 'maintainer' }, created_at: comment(1, 'maintainer', '').created_at },
    ];
    for (const event of cases) {
      const input = harness({ comments: [comment(2, 'navet-nisse[bot]', 'Which Navet version?')], events: [event] });
      await acceptAgentComment(input);
      expect(input.createForIssueComment).not.toHaveBeenCalled();
    }
  });

  it('ignores URL query marks in a conclusion', async () => {
    const input = harness({
      comments: [
        comment(1, 'maintainer', '/navet research'),
        comment(2, 'navet-nisse[bot]', 'Read https://example.com/?state=ready for the conclusion.'),
      ],
      reactions: { 1: accepted },
    });
    await acceptAgentComment(input);
    expect(input.createForIssueComment).not.toHaveBeenCalled();
  });

  it('uses the latest accepted command despite later rejected command text', async () => {
    const beforeQuestion = harness({
      comments: [
        comment(1, 'maintainer', '/navet research'),
        comment(2, 'reporter', '/navet implement'),
        comment(3, 'navet-nisse[bot]', 'Which version?'),
      ],
      reactions: { 1: accepted },
    });
    await acceptAgentComment(beforeQuestion);
    expect(beforeQuestion.createForIssueComment).toHaveBeenCalledOnce();

    const afterQuestion = harness({
      comments: [...questionThread, comment(3, 'reporter', '/navet implement')],
      reactions: { 1: accepted },
    });
    await acceptAgentComment(afterQuestion);
    expect(afterQuestion.createForIssueComment).toHaveBeenCalledOnce();

    const acceptedAfterQuestion = harness({
      comments: [...questionThread, comment(3, 'maintainer', '/navet implement')],
      reactions: { 1: accepted, 3: accepted },
    });
    await acceptAgentComment(acceptedAfterQuestion);
    expect(acceptedAfterQuestion.createForIssueComment).not.toHaveBeenCalled();
  });

  it('accepts an exact maintainer command', async () => {
    const input = harness({ actor: 'maintainer', body: '/navet implement' });
    await acceptAgentComment(input);
    expect(input.createForIssueComment).toHaveBeenCalledOnce();
  });

  it('ignores unrelated replies, non-reporters, and duplicate answers', async () => {
    const cases = [
      harness({ comments: [comment(1, 'maintainer', '/navet research'), comment(2, 'navet-nisse[bot]', 'Here is the conclusion.')], reactions: { 1: accepted } }),
      harness({ actor: 'bystander', comments: questionThread, reactions: { 1: accepted } }),
      harness({ comments: questionThread, reactions: {} }),
      harness({ comments: [...questionThread, comment(3, 'reporter', 'First answer')], reactions: { 1: accepted, 3: accepted } }),
      harness({ comments: [...questionThread, comment(3, 'reporter', 'First answer')], reactions: { 1: accepted } }),
    ];
    for (const input of cases) {
      await acceptAgentComment(input);
      expect(input.createForIssueComment).not.toHaveBeenCalled();
    }
  });

  it('does not let a reporter dispatch a command or use closed issues', async () => {
    const untrusted = harness({ body: '/navet implement' });
    await acceptAgentComment(untrusted);
    expect(untrusted.createForIssueComment).not.toHaveBeenCalled();
    expect(untrusted.core.setFailed).toHaveBeenCalledOnce();

    const closed = harness({ comments: questionThread, reactions: { 1: accepted } });
    closed.context.payload.issue.state = 'closed';
    await acceptAgentComment(closed);
    expect(closed.createForIssueComment).not.toHaveBeenCalled();
  });

  it('does not churn labels, comment, or use spoofable issue-body markers', () => {
    expect(workflowSource).not.toContain('addLabels');
    expect(workflowSource).not.toContain('removeLabel');
    expect(workflowSource).not.toContain('createComment');
    expect(workflowSource).not.toContain('addAssignees');
    expect(stewardshipSource).not.toContain('navet-agent:research');
    expect(stewardshipSource).toContain('github.rest.issues.create');
  });
});
