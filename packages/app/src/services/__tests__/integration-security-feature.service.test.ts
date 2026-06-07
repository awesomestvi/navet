import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  closeCoverMock,
  dispatchEntityCommandMock,
  openCoverMock,
  setCoverPositionMock,
  armAwayMock,
} = vi.hoisted(() => ({
  armAwayMock: vi.fn(),
  closeCoverMock: vi.fn(),
  dispatchEntityCommandMock: vi.fn(),
  openCoverMock: vi.fn(),
  setCoverPositionMock: vi.fn(),
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: vi.fn(() => ({
    securityFeatureService: {
      armAway: armAwayMock,
      armCustomBypass: vi.fn(),
      armHome: vi.fn(),
      armNight: vi.fn(),
      armVacation: vi.fn(),
      closeCover: closeCoverMock,
      disarm: vi.fn(),
      openCover: openCoverMock,
      setCoverPosition: setCoverPositionMock,
      stopCover: vi.fn(),
      trigger: vi.fn(),
    },
  })),
}));

import { integrationSecurityFeatureService } from '../integration-security-feature.service';

describe('integrationSecurityFeatureService', () => {
  beforeEach(() => {
    closeCoverMock.mockReset();
    dispatchEntityCommandMock.mockReset();
    openCoverMock.mockReset();
    setCoverPositionMock.mockReset();
    armAwayMock.mockReset();
  });

  it('routes lock actions through provider security intents', async () => {
    await integrationSecurityFeatureService.lockEntity('lock.front_door');
    await integrationSecurityFeatureService.unlockEntity('lock.front_door');

    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(1, {
      type: 'lock',
      entityId: 'lock.front_door',
    });
    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(2, {
      type: 'unlock',
      entityId: 'lock.front_door',
    });
  });

  it('routes cover actions through provider security intents', async () => {
    await integrationSecurityFeatureService.openCover('cover.blind');
    await integrationSecurityFeatureService.closeCover('cover.blind', 'tilt');
    await integrationSecurityFeatureService.stopCover('cover.blind');
    await integrationSecurityFeatureService.setCoverPosition('cover.blind', 75);
    await integrationSecurityFeatureService.setCoverPosition('cover.blind', 40, 'tilt');

    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(1, {
      type: 'open',
      entityId: 'cover.blind',
    });
    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(2, {
      type: 'stop',
      entityId: 'cover.blind',
    });
    expect(closeCoverMock).toHaveBeenCalledWith('cover.blind', 'tilt');
    expect(setCoverPositionMock).toHaveBeenNthCalledWith(1, 'cover.blind', 75, 'position');
    expect(setCoverPositionMock).toHaveBeenNthCalledWith(2, 'cover.blind', 40, 'tilt');
  });

  it('routes alarm actions through provider-neutral commands', async () => {
    await integrationSecurityFeatureService.armAway('alarm_control_panel.home', '4321');

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      type: 'arm_away',
      entityId: 'alarm_control_panel.home',
      code: '4321',
    });
  });
});
