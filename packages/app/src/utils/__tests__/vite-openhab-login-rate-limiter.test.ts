import type { IncomingMessage } from 'node:http';
import { createViteOpenHABLoginRateLimiter } from '@scripts/vite-openhab-login-rate-limiter';
import { describe, expect, it } from 'vitest';

function request(source: string) {
  return {
    socket: { remoteAddress: source },
  } as IncomingMessage;
}

describe('Vite openHAB login rate limiter', () => {
  it('limits each direct source and expires attempts after the window', () => {
    let now = 1_000;
    const limiter = createViteOpenHABLoginRateLimiter({
      attemptLimit: 2,
      maxSources: 2,
      now: () => now,
      windowMs: 10_000,
    });
    const sourceA = request('192.0.2.1');
    const sourceB = request('192.0.2.2');

    expect(limiter.consume(sourceA).allowed).toBe(true);
    expect(limiter.consume(sourceA).allowed).toBe(true);
    expect(limiter.consume(sourceA)).toEqual({
      allowed: false,
      retryAfterSeconds: 10,
    });
    expect(limiter.consume(sourceB).allowed).toBe(true);

    now += 10_001;
    expect(limiter.consume(sourceA)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it('bounds tracked sources without trusting forwarded client identity', () => {
    const bounded = createViteOpenHABLoginRateLimiter({
      attemptLimit: 1,
      maxSources: 2,
      now: () => 1_000,
      windowMs: 10_000,
    });
    expect(bounded.consume(request('192.0.2.1')).allowed).toBe(true);
    expect(bounded.consume(request('192.0.2.2')).allowed).toBe(true);
    expect(bounded.consume(request('192.0.2.3')).allowed).toBe(true);
    expect(
      bounded.consume({
        socket: { remoteAddress: '192.0.2.3' },
        headers: { 'x-forwarded-for': '198.51.100.99' },
      } as unknown as IncomingMessage).allowed
    ).toBe(false);
  });
});
