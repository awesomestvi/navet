import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/agent-dispatch.yml');
const workflowSource = readFileSync(workflowPath, 'utf8');
const workflow = parse(workflowSource);
const scheduledWorkflowSources = [
  '.github/workflows/docs-steward.yml',
  '.github/workflows/release-communication.yml',
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'));
const acceptScript = workflow.jobs.accept.steps.find(
  (step) => step.name === 'Authorize and acknowledge command'
)?.with?.script;

describe('agent command workflow', () => {
  it('listens for issue comments with narrow permissions', () => {
    expect(workflow.on).toEqual({ issue_comment: { types: ['created'] } });
    expect(workflow.permissions).toEqual({ contents: 'read', issues: 'write' });
    expect(workflow.jobs.accept.if).toContain('github.event.issue.pull_request == null');
    expect(workflow.jobs.accept.if).toContain("startsWith(github.event.comment.body, '/navet ')");
    expect(acceptScript).toBeTypeOf('string');
  });

  it('accepts only exact supported commands from maintainers', () => {
    expect(acceptScript).toContain('/^\\/navet\\s+(research|implement|continue)$/i');
    expect(acceptScript).toContain("context.payload.issue.state !== 'open'");
    expect(acceptScript).toContain('getCollaboratorPermissionLevel');
    expect(acceptScript).toContain("new Set(['admin', 'maintain', 'write'])");
    expect(acceptScript).toContain('Could not verify');
    expect(acceptScript).toContain('is not allowed to dispatch Navet Nisse');
  });

  it('acknowledges accepted work with one quiet reaction and no label churn', () => {
    expect(acceptScript).toContain('reactions.createForIssueComment');
    expect(acceptScript).toContain("content: 'eyes'");
    expect(workflowSource).not.toContain('addLabels');
    expect(workflowSource).not.toContain('removeLabel');
    expect(workflowSource).not.toContain('createComment');
    expect(workflowSource).not.toContain('addAssignees');
  });

  it('does not use spoofable issue-body markers for scheduled work', () => {
    for (const source of scheduledWorkflowSources) {
      expect(source).not.toContain('navet-agent:research');
      expect(source).toContain('github.rest.issues.create');
    }
  });
});
