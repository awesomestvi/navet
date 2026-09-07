import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000 });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} fixture command failed: ${result.error?.message ?? result.stderr?.trim()}`
    );
  }
  return result.stdout.trim();
}

/** Isolated Docker TLS fixture: public-address classification is exercised without Internet egress. */
export async function startRssFixture(prefix) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(prefix)) throw new Error('Invalid fixture prefix');
  const directory = await mkdtemp(join(tmpdir(), 'navet-rss-docker-'));
  const suffix = directory.split('-').at(-1).toLowerCase();
  const networkName = `${prefix}-rss-${suffix}`;
  const containerName = `${networkName}-server`;
  const caFile = join(directory, 'ca.pem');
  let networkCreated = false;
  let containerCreated = false;
  const attached = new Set();
  const cleanup = async () => {
    for (const container of attached)
      spawnSync('docker', ['network', 'disconnect', '-f', networkName, container], {
        stdio: 'ignore',
      });
    if (containerCreated) spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
    if (networkCreated) spawnSync('docker', ['network', 'rm', networkName], { stdio: 'ignore' });
    await rm(directory, { recursive: true, force: true });
  };
  try {
    run('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      join(directory, 'ca.key'),
      '-out',
      caFile,
      '-days',
      '2',
      '-subj',
      '/CN=Navet RSS isolated test CA',
    ]);
    run('openssl', [
      'req',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      join(directory, 'server.key'),
      '-out',
      join(directory, 'server.csr'),
      '-subj',
      '/CN=feeds.navet.test',
    ]);
    await writeFile(
      join(directory, 'extensions.cnf'),
      'subjectAltName=DNS:feeds.navet.test\nextendedKeyUsage=serverAuth\n'
    );
    run('openssl', [
      'x509',
      '-req',
      '-in',
      join(directory, 'server.csr'),
      '-CA',
      caFile,
      '-CAkey',
      join(directory, 'ca.key'),
      '-CAcreateserial',
      '-out',
      join(directory, 'server.pem'),
      '-days',
      '2',
      '-extfile',
      join(directory, 'extensions.cnf'),
    ]);
    await writeFile(
      join(directory, 'server.mjs'),
      `
import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
const server = createServer({ key: readFileSync('/fixture/server.key'), cert: readFileSync('/fixture/server.pem') }, (req, res) => {
  const forbidden = Object.keys(req.headers).some((name) =>
    name === 'cookie' || name === 'authorization' || name.startsWith('x-navet-') ||
    name.startsWith('x-remote-') || name.startsWith('x-hass-') || name.startsWith('x-forwarded-'));
  if (forbidden) { res.writeHead(418); res.end('Credentials forwarded to feed'); return; }
  res.setHeader('Content-Type', 'application/rss+xml');
  switch (req.url) {
    case '/feed': res.end('<rss><channel><title>Navet fixture</title></channel></rss>'); break;
    case '/large': res.end('<rss>' + 'a'.repeat(1024 * 1024 - 11) + '</rss>'); break;
    case '/oversized': res.write('<rss>' + 'a'.repeat(1024 * 1024)); res.end('</rss>'); break;
    case '/wrong-type': res.setHeader('Content-Type', 'text/html'); res.end('<html>Not a feed</html>'); break;
    case '/redirect': res.writeHead(302, { Location: 'https://127.0.0.1/private' }); res.end(); break;
    default: res.writeHead(404); res.end();
  }
});
server.listen(8443, '0.0.0.0', () => console.log('RSS fixture ready'));
`
    );
    // No host ports or external routing: this subnet exists solely inside this test network.
    run('docker', ['network', 'create', '--internal', '--subnet', '8.8.8.0/24', networkName]);
    networkCreated = true;
    run('docker', [
      'run',
      '--detach',
      '--name',
      containerName,
      '--network',
      networkName,
      '--network-alias',
      'feeds.navet.test',
      '--mount',
      `type=bind,src=${directory},dst=/fixture,readonly`,
      'node:22-alpine',
      'node',
      '/fixture/server.mjs',
    ]);
    containerCreated = true;
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const logs = run('docker', ['logs', containerName]);
      if (logs.includes('RSS fixture ready')) {
        ready = true;
        break;
      }
      await delay(100);
    }
    if (!ready) throw new Error('RSS TLS fixture did not become ready');
    return {
      caFile,
      networkName,
      url: 'https://feeds.navet.test:8443',
      attach(container) {
        run('docker', ['network', 'connect', networkName, container]);
        attached.add(container);
      },
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
