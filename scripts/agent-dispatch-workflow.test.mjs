import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/agent-dispatch.yml');
const workflowSource = readFileSync(workflowPath, 'utf8');
const workflow = parse(workflowSource);
const queueScript = workflow.jobs.queue.steps.find(
  (step) => step.name === 'Authorize request and update queue state'
)?.with?.script;

describe('agent intake workflow', () => {
  it('uses the minimum permissions needed for a quiet issue transition', () => {
    expect(workflow.permissions).toEqual({
      contents: 'read',
      issues: 'write',
    });
    expect(workflow.concurrency).toEqual({
      group: 'agent-intake-${{ github.repository }}-${{ github.event.issue.number }}',
      'cancel-in-progress': false,
    });
    expect(queueScript).toBeTypeOf('string');
  });

  it('allows only maintainers or trusted repository automation to queue work', () => {
    const authorizationStart = queueScript.indexOf('if (!trustedAutomation)');
    const transitionStart = queueScript.indexOf('const otherMode');
    expect(authorizationStart).toBeGreaterThan(-1);
    expect(transitionStart).toBeGreaterThan(authorizationStart);

    const authorizationBlock = queueScript.slice(authorizationStart, transitionStart);
    expect(queueScript.slice(0, authorizationStart)).toContain(
      "actor === 'github-actions[bot]'"
    );
    expect(authorizationBlock).toContain('getCollaboratorPermissionLevel');
    expect(authorizationBlock).toContain("new Set(['admin', 'maintain', 'write'])");
    expect(authorizationBlock).toContain('if (error.status !== 403) throw error');
    expect(authorizationBlock).toContain('Could not verify');
    expect(authorizationBlock).toContain('removeLabelIfPresent(process.env.AGENT_MODE)');
    expect(authorizationBlock).toContain('core.setFailed');
    expect(authorizationBlock).toContain('is not allowed to queue agent work');
  });

  it('queues one mode without posting orchestration details or assigning a bot', () => {
    expect(queueScript).toContain('github.rest.issues.get');
    expect(queueScript).toContain('if (!currentLabels.has(process.env.AGENT_MODE))');
    expect(queueScript).toContain("labels: ['status: agent-queued']");
    expect(queueScript).toContain("? 'agent:research'");
    expect(queueScript).toContain(": 'agent:implement'");
    expect(queueScript).toContain("'status: agent-working'");
    expect(workflowSource).not.toContain('createComment');
    expect(workflowSource).not.toContain('addAssignees');
    expect(workflowSource).not.toContain('NAVET_CODING_AGENT_LOGIN');
  });
});
