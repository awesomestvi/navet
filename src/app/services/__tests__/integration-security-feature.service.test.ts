import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityActionMock } = vi.hoisted(() => ({
  dispatchEntityActionMock: vi.fn(),
}));

vi.mock('../integration-action.service', () => ({
  dispatchEntityAction: dispatchEntityActionMock,
}));

import { integrationSecurityFeatureService } from '../integration-security-feature.service';

describe('integrationSecurityFeatureService', () => {
  beforeEach(() => {
    dispatchEntityActionMock.mockReset();
  });

  it('routes lock actions through provider security intents', async () => {
    await integrationSecurityFeatureService.lockEntity('lock.front_door');
    await integrationSecurityFeatureService.unlockEntity('lock.front_door');

    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(1, {
      entityId: 'lock.front_door',
      domain: 'lock',
      service: 'lock',
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(2, {
      entityId: 'lock.front_door',
      domain: 'lock',
      service: 'unlock',
    });
  });

  it('routes cover actions through provider security intents', async () => {
    await integrationSecurityFeatureService.openCover('cover.blind');
    await integrationSecurityFeatureService.closeCover('cover.blind', 'tilt');
    await integrationSecurityFeatureService.stopCover('cover.blind');
    await integrationSecurityFeatureService.setCoverPosition('cover.blind', 75);
    await integrationSecurityFeatureService.setCoverPosition('cover.blind', 40, 'tilt');

    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(1, {
      entityId: 'cover.blind',
      domain: 'cover',
      service: 'open_cover',
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(2, {
      entityId: 'cover.blind',
      domain: 'cover',
      service: 'close_cover_tilt',
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(3, {
      entityId: 'cover.blind',
      domain: 'cover',
      service: 'stop_cover',
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(4, {
      entityId: 'cover.blind',
      domain: 'cover',
      service: 'set_cover_position',
      serviceData: { position: 75 },
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(5, {
      entityId: 'cover.blind',
      domain: 'cover',
      service: 'set_cover_tilt_position',
      serviceData: { tilt_position: 40 },
    });
  });
});
