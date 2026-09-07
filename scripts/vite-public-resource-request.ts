import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import {
  isBlockedResourceHostname,
  isPrivateResourceIpAddress,
} from '../packages/core/src/resource-host-policy.ts';


export class PublicResourcePolicyError extends Error {}

/** Keep HTTPS authority/SNI intact while connecting only to already-validated DNS answers. */
export async function requestPublicResource(
  url: URL,
  options: { signal: AbortSignal; headers: Record<string, string> }
): Promise<Response> {
  options.signal.throwIfAborted();
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new PublicResourcePolicyError('Invalid public resource URL');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedResourceHostname(hostname))
    throw new PublicResourcePolicyError('Private resource hosts are not allowed');
  const family = isIP(hostname);
  const addresses = family
    ? [{ address: hostname, family }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('No DNS addresses available');
  if (addresses.some(({ address }) => isPrivateResourceIpAddress(address)))
    throw new PublicResourcePolicyError('Private DNS targets are not allowed');
  options.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const upstreamRequest = request(
      url,
      {
        method: 'GET',
        headers: options.headers,
        signal: options.signal,
        // Do not let a pooled socket or a second DNS lookup bypass this request's validated answers.
        agent: false,
        lookup: (_hostname, lookupOptions, callback) => {
          if (lookupOptions.all) callback(null, addresses);
          else callback(null, addresses[0]!.address, addresses[0]!.family);
        },
      },
      (upstream) => {
        const headers = new Headers();
        for (let index = 0; index < upstream.rawHeaders.length; index += 2) {
          headers.append(upstream.rawHeaders[index]!, upstream.rawHeaders[index + 1]!);
        }
        const status = upstream.statusCode ?? 502;
        const body = [204, 205, 304].includes(status) ? null : (Readable.toWeb(upstream) as ReadableStream<Uint8Array>);
        if (!body) upstream.resume();
        resolve(new Response(body, { status, headers }));
      }
    );
    upstreamRequest.on('error', reject);
    upstreamRequest.end();
  });
}
