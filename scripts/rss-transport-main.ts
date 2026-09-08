import { chmod } from 'node:fs/promises';
import { createRssTransportServer } from './rss-transport-server.ts';

const socketPath = '/run/navet/rss-transport.sock';
const { server, shutdown } = createRssTransportServer();
server.on('error', (error) => {
  console.error('RSS transport failed:', error.message);
  process.exitCode = 1;
});
await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(socketPath, resolve);
});
await chmod(socketPath, 0o660);
console.info(`RSS transport ready on ${socketPath}`);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  // Native getaddrinfo cannot be cancelled. Do not keep supervision waiting for its thread.
  const deadline = setTimeout(() => process.exit(1), 4000);
  deadline.unref();
  void shutdown().then(
    () => process.exit(0),
    (error: Error) => {
      console.error('RSS transport shutdown failed:', error.message);
      process.exit(1);
    }
  );
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
