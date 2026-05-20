import process from 'node:process';
import { spawnSync } from 'node:child_process';

const DEFAULT_STATE = 'Ready for Release';
const DEFAULT_FIRST = 50;
const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';
const API_KEY_ENV_NAME = 'LINEAR_API_KEY';

const args = process.argv.slice(2);
const options = {
  first: DEFAULT_FIRST,
  format: 'markdown',
  state: DEFAULT_STATE,
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];

  if (!arg.startsWith('--')) {
    continue;
  }

  if (next === undefined || next.startsWith('--')) {
    options[arg.slice(2)] = true;
    continue;
  }

  options[arg.slice(2)] = next;
  index += 1;
}

if (options.help) {
  process.stdout.write(`Usage: node scripts/fetch-linear-release-issues.mjs [options]

Fetches Linear issues from the release-ready workflow state and prints a compact source packet for drafting CHANGELOG.md.

Options:
  --state <name>    Linear workflow state to fetch. Default: "${DEFAULT_STATE}"
  --team <key>      Optional Linear team key filter, for example NAV
  --label <name>    Optional label name filter
  --project <name>  Optional project name filter
  --first <count>   Maximum issue count. Default: ${DEFAULT_FIRST}
  --format <type>   markdown or json. Default: markdown

Reads ${API_KEY_ENV_NAME} from the current environment, or from your interactive zsh config when available.
`);
  process.exit(0);
}

function readApiKeyFromInteractiveZsh() {
  const shell = process.env.SHELL?.endsWith('/zsh') ? process.env.SHELL : '/bin/zsh';
  const result = spawnSync(shell, ['-ic', `printf %s "$${API_KEY_ENV_NAME}"`], {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (result.error || result.status !== 0) {
    return '';
  }

  return result.stdout.trim();
}

const apiKey = process.env[API_KEY_ENV_NAME]?.trim() || readApiKeyFromInteractiveZsh();

if (!apiKey) {
  console.error(
    `Missing ${API_KEY_ENV_NAME}. Export it in your shell, or add it to ~/.zshrc for local release-note drafting.`,
  );
  process.exit(1);
}

const first = Number.parseInt(options.first, 10);

if (!Number.isInteger(first) || first < 1 || first > 250) {
  console.error('--first must be an integer between 1 and 250.');
  process.exit(1);
}

const filter = {
  state: { name: { eq: options.state } },
};

if (options.team) {
  filter.team = { key: { eq: options.team } };
}

if (options.label) {
  filter.labels = { name: { eq: options.label } };
}

if (options.project) {
  filter.project = { name: { eq: options.project } };
}

const query = `
  query ReleaseIssues($filter: IssueFilter, $first: Int!) {
    issues(filter: $filter, first: $first, orderBy: updatedAt) {
      nodes {
        identifier
        title
        description
        priorityLabel
        url
        state {
          name
        }
        team {
          key
          name
        }
        project {
          name
        }
        labels {
          nodes {
            name
          }
        }
      }
    }
  }
`;

let response;

try {
  response = await fetch(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { filter, first },
    }),
  });
} catch (error) {
  console.error(`Could not reach Linear at ${LINEAR_GRAPHQL_URL}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!response.ok) {
  console.error(`Linear request failed: ${response.status} ${response.statusText}`);
  console.error(await response.text());
  process.exit(1);
}

const payload = await response.json();

if (payload.errors?.length > 0) {
  console.error('Linear returned GraphQL errors:');
  console.error(JSON.stringify(payload.errors, null, 2));
  process.exit(1);
}

const issues = payload.data?.issues?.nodes ?? [];

if (options.format === 'json') {
  process.stdout.write(`${JSON.stringify(issues, null, 2)}\n`);
  process.exit(0);
}

if (options.format !== 'markdown') {
  console.error('--format must be markdown or json.');
  process.exit(1);
}

const filterSummary = [
  `state: ${options.state}`,
  options.team ? `team: ${options.team}` : null,
  options.label ? `label: ${options.label}` : null,
  options.project ? `project: ${options.project}` : null,
]
  .filter(Boolean)
  .join(', ');

process.stdout.write(`# Linear release source\n\n`);
process.stdout.write(`Fetched ${issues.length} issue${issues.length === 1 ? '' : 's'} (${filterSummary}).\n\n`);

if (issues.length === 0) {
  process.stdout.write('No Linear issues found. Use the commit-message fallback in docs/VERSIONING.md.\n');
  process.exit(0);
}

for (const issue of issues) {
  const labels = issue.labels?.nodes?.map((label) => label.name).filter(Boolean) ?? [];
  const metadata = [
    issue.team?.key,
    issue.priorityLabel,
    issue.project?.name,
    labels.length > 0 ? labels.join(', ') : null,
  ]
    .filter(Boolean)
    .join(' | ');

  process.stdout.write(`## ${issue.identifier}: ${issue.title}\n`);

  if (metadata) {
    process.stdout.write(`_${metadata}_\n`);
  }

  if (issue.url) {
    process.stdout.write(`${issue.url}\n`);
  }

  if (issue.description?.trim()) {
    process.stdout.write(`\n${issue.description.trim()}\n`);
  }

  process.stdout.write('\n');
}
