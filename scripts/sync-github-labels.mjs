#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function githubRequest({ token, path, init = {}, fetchImpl = fetch }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const response = await fetchImpl(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!response.ok) {
    const error = new Error(
      `${init.method ?? 'GET'} ${path} failed with ${response.status}: ${await response.text()}`
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function getAll(path, request) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await request(`${path}${separator}per_page=100&page=${page}`);
    values.push(...batch);
    if (batch.length < 100) return values;
  }
}

export async function deleteRetiredLabels({
  retiredLabels,
  existingNames,
  owner,
  repo,
  request,
  stdout = process.stdout,
  stderr = process.stderr,
}) {
  const deletionFailures = [];
  for (const retiredLabel of retiredLabels) {
    const existingName = existingNames.get(retiredLabel.toLowerCase());
    if (!existingName) continue;
    try {
      await request(`/repos/${owner}/${repo}/labels/${encodeURIComponent(existingName)}`, {
        method: 'DELETE',
      });
      stdout.write(`Deleted retired label ${existingName}\n`);
    } catch (error) {
      if (error.status === 404) {
        stdout.write(`Retired label ${existingName} was already deleted\n`);
        continue;
      }
      deletionFailures.push(error);
      stderr.write(`Failed to delete retired label ${existingName}: ${error.message}\n`);
    }
  }

  if (deletionFailures.length > 0) {
    throw new AggregateError(deletionFailures, 'Failed to delete one or more retired labels.');
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  }

  const labels = JSON.parse(
    await readFile(new URL('../.github/labels.json', import.meta.url), 'utf8')
  );
  const retiredLabels = JSON.parse(
    await readFile(new URL('../.github/retired-labels.json', import.meta.url), 'utf8')
  );
  const [owner, repo] = repository.split('/');
  const request = (path, init) => githubRequest({ token, path, init });
  const existing = await getAll(`/repos/${owner}/${repo}/labels`, request);
  const existingNames = new Map(existing.map(({ name }) => [name.toLowerCase(), name]));

  for (const label of labels) {
    const existingName = existingNames.get(label.name.toLowerCase());
    if (existingName) {
      await request(`/repos/${owner}/${repo}/labels/${encodeURIComponent(existingName)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          new_name: label.name,
          color: label.color,
          description: label.description,
        }),
      });
      process.stdout.write(`Updated ${label.name}\n`);
    } else {
      await request(`/repos/${owner}/${repo}/labels`, {
        method: 'POST',
        body: JSON.stringify(label),
      });
      process.stdout.write(`Created ${label.name}\n`);
    }
  }

  await deleteRetiredLabels({ retiredLabels, existingNames, owner, repo, request });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
