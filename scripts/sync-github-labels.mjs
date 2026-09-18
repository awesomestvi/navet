#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!token || !repository) {
  throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
}

const labels = JSON.parse(
  await readFile(new URL('../.github/labels.json', import.meta.url), 'utf8')
);
const [owner, repo] = repository.split('/');
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function request(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} failed with ${response.status}: ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function getAll(path) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await request(`${path}${separator}per_page=100&page=${page}`);
    values.push(...batch);
    if (batch.length < 100) return values;
  }
}

const existing = await getAll(`/repos/${owner}/${repo}/labels`);
const existingNames = new Set(existing.map(({ name }) => name));

for (const label of labels) {
  if (existingNames.has(label.name)) {
    await request(`/repos/${owner}/${repo}/labels/${encodeURIComponent(label.name)}`, {
      method: 'PATCH',
      body: JSON.stringify(label),
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
