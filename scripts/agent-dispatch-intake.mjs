const COMMAND = /^\/navet\s+(research|implement|continue)$/i;
const NISSE = 'navet-nisse[bot]';
const ACTIONS = 'github-actions[bot]';

async function hasReaction(github, owner, repo, commentId, content, actor) {
  const reactions = await github.paginate(github.rest.reactions.listForIssueComment, {
    owner,
    repo,
    comment_id: commentId,
    per_page: 100,
  });
  return reactions.some((reaction) => reaction.content === content && reaction.user.login === actor);
}

async function hasWritePermission(github, owner, repo, actor) {
  try {
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: actor,
    });
    return new Set(['admin', 'maintain', 'write']).has(data.permission);
  } catch (error) {
    if (error.status === 403 || error.status === 404) return false;
    throw error;
  }
}

function requestsReply(body) {
  const paragraphs = body.trim().split(/\n\s*\n/);
  const closing = paragraphs.at(-1) ?? '';
  return closing.includes('?') || /\b(?:let us know|please retest)\b/i.test(closing);
}

async function isRequestedAnswer(github, owner, repo, issue, comment, actor) {
  if (comment.body.trim().startsWith('/navet') || actor.endsWith('[bot]')) return false;
  if (actor !== issue.user.login && !(await hasWritePermission(github, owner, repo, actor))) {
    return false;
  }

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issue.number,
    per_page: 100,
  });
  const earlier = comments.filter((item) => item.id < comment.id);
  const lastNisse = earlier.findLast((item) => item.user.login === NISSE);
  if (!lastNisse || !requestsReply(lastNisse.body)) return false;

  const commands = earlier.filter((item) => COMMAND.test(item.body.trim()));
  const latestCommand = commands.at(-1);
  if (!latestCommand || latestCommand.id > lastNisse.id) return false;
  if (!(await hasReaction(github, owner, repo, latestCommand.id, 'eyes', ACTIONS))) return false;

  // One answer starts one continuation. Later comments remain available as context to that task.
  for (const item of earlier) {
    if (item.id <= lastNisse.id || item.user.login === NISSE) continue;
    if (COMMAND.test(item.body.trim())) return false;
    if (
      !item.user.login.endsWith('[bot]') &&
      (item.user.login === issue.user.login ||
        (await hasWritePermission(github, owner, repo, item.user.login)))
    ) {
      return false;
    }
  }
  return true;
}

export async function acceptAgentComment({ github, context, core }) {
  const { owner, repo } = context.repo;
  const issue = context.payload.issue;
  const comment = context.payload.comment;
  const actor = comment.user.login;
  const command = COMMAND.exec(comment.body.trim());

  if (issue.state !== 'open') return;
  if (command) {
    if (!(await hasWritePermission(github, owner, repo, actor))) {
      core.setFailed(`@${actor} is not allowed to dispatch Navet Nisse.`);
      return;
    }
  } else if (!(await isRequestedAnswer(github, owner, repo, issue, comment, actor))) {
    return;
  }

  try {
    await github.rest.reactions.createForIssueComment({
      owner,
      repo,
      comment_id: comment.id,
      content: 'eyes',
    });
  } catch (error) {
    if (error.status !== 422) throw error;
    core.notice(`Issue comment ${comment.id} was already acknowledged.`);
  }
  core.notice(
    command
      ? `Accepted /navet ${command[1].toLowerCase()} from @${actor}.`
      : `Accepted requested answer from @${actor}.`
  );
}
