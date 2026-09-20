import { describe, expect, it, vi } from 'vitest';
import { deleteRetiredLabels } from './sync-github-labels.mjs';

const output = () => ({ write: vi.fn() });

describe('retired GitHub label cleanup', () => {
  it('treats a concurrently deleted label as already clean', async () => {
    const error = Object.assign(new Error('Not Found'), { status: 404 });
    const request = vi.fn().mockRejectedValue(error);

    await expect(
      deleteRetiredLabels({
        retiredLabels: ['agent:research'],
        existingNames: new Map([['agent:research', 'agent:research']]),
        owner: 'awesomestvi',
        repo: 'navet',
        request,
        stdout: output(),
        stderr: output(),
      })
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith(
      '/repos/awesomestvi/navet/labels/agent%3Aresearch',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('continues deleting retired labels before reporting non-404 failures', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Server Error'), { status: 500 }))
      .mockResolvedValueOnce(null);

    await expect(
      deleteRetiredLabels({
        retiredLabels: ['agent:research', 'agent:implement'],
        existingNames: new Map([
          ['agent:research', 'agent:research'],
          ['agent:implement', 'agent:implement'],
        ]),
        owner: 'awesomestvi',
        repo: 'navet',
        request,
        stdout: output(),
        stderr: output(),
      })
    ).rejects.toThrow('Failed to delete one or more retired labels');
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toContain('agent%3Aimplement');
  });
});
