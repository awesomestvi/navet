import { readBoundedResponseText } from '@scripts/vite-response-body';
import { describe, expect, it, vi } from 'vitest';

function chunkedResponse(chunks: Uint8Array[], cancel = vi.fn()) {
  let index = 0;
  return new Response(
    new ReadableStream(
      {
        pull(controller) {
          const chunk = chunks[index++];
          if (chunk) controller.enqueue(chunk);
          else controller.close();
        },
        cancel,
      },
      { highWaterMark: 0 }
    )
  );
}

describe('bounded proxy response bodies', () => {
  it('decodes UTF-8 split across response chunks at the exact byte limit', async () => {
    const bytes = new TextEncoder().encode('<rss>å</rss>');
    expect(
      await readBoundedResponseText(
        chunkedResponse([bytes.slice(0, 6), bytes.slice(6)]),
        bytes.length
      )
    ).toBe('<rss>å</rss>');
  });

  it('cancels a chunked response as soon as its bytes exceed the limit', async () => {
    const cancel = vi.fn();
    const response = chunkedResponse(
      [new Uint8Array(4), new Uint8Array(4), new Uint8Array(100)],
      cancel
    );
    await expect(readBoundedResponseText(response, 7)).rejects.toThrow('too large');
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('counts multibyte content as bytes rather than characters', async () => {
    const cancel = vi.fn();
    await expect(
      readBoundedResponseText(chunkedResponse([new TextEncoder().encode('åå')], cancel), 3)
    ).rejects.toThrow('too large');
    expect(cancel).toHaveBeenCalledOnce();
  });
});
