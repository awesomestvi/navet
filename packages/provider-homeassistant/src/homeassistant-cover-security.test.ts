import { mapNavetEntitiesToDeviceCollection } from '@navet/app/core/navet-device-collections';
import { selectHomeSecurityAlertDevices } from '@navet/app/features/dashboard/hooks/use-home-security-alert-count';
import {
  buildSecurityCameraDashboardModel,
  getSecurityDashboardAlertCount,
  isSecurityDashboardDevice,
} from '@navet/app/features/security/utils/security-camera-dashboard-model';
import { garageDoorEntity } from '@navet/app/test/fixtures/home-assistant/entities/cover';
import { describe, expect, it } from 'vitest';
import { mapHomeAssistantEntitiesToNavetEntities } from './homeassistant-mappers';

// Keep: exercises provider discovery through the collection and Security selection boundary.
describe('Home Assistant cover security', () => {
  it.each(['garage', 'door', 'gate', 'window'])(
    'discovers %s covers in their assigned area',
    (deviceClass) => {
      const entities = mapHomeAssistantEntitiesToNavetEntities({
        entities: {
          [garageDoorEntity.entity_id]: {
            ...garageDoorEntity,
            attributes: { ...garageDoorEntity.attributes, device_class: deviceClass },
          },
        },
        areas: [{ area_id: 'garage', name: 'Garage' }],
        deviceRegistry: [],
        entityRegistry: [
          { entity_id: garageDoorEntity.entity_id, area_id: 'garage', device_id: null },
        ],
      });
      const devices = mapNavetEntitiesToDeviceCollection(entities);
      expect(devices.covers[0].room).toBe('Garage');
      expect(isSecurityDashboardDevice(devices.covers[0])).toBe(true);
      expect(selectHomeSecurityAlertDevices(devices, []).covers).toHaveLength(1);
      expect(getSecurityDashboardAlertCount(selectHomeSecurityAlertDevices(devices, []))).toBe(1);
      expect(selectHomeSecurityAlertDevices(devices, [devices.covers[0].id]).covers).toHaveLength(
        0
      );
    }
  );

  it.each([
    ['open', 1, 'warning'],
    ['opening', 1, 'warning'],
    ['closing', 1, 'warning'],
    ['closed', 0, 'normal'],
    ['unknown', 1, 'unknown'],
    ['unavailable', 1, 'unknown'],
  ])('preserves %s without inventing position support', (state, count, severity) => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: { [garageDoorEntity.entity_id]: { ...garageDoorEntity, state } },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });
    const devices = mapNavetEntitiesToDeviceCollection(entities);
    expect(devices.covers[0]).toMatchObject({
      state,
      hasPosition: false,
      securitySeverity: severity,
    });
    expect(getSecurityDashboardAlertCount(selectHomeSecurityAlertDevices(devices, []))).toBe(count);
    const model = buildSecurityCameraDashboardModel(selectHomeSecurityAlertDevices(devices, []));
    expect(model.summary.attentionEntityCount).toBe(count);
    expect(model.summary.securedCounts.openingsClosed).toBe(state === 'closed' ? 1 : 0);
  });

  it.each(['blind', 'curtain', 'shade', 'shutter', 'awning', 'damper'])(
    'keeps %s covers outside Security',
    (deviceClass) => {
      const entities = mapHomeAssistantEntitiesToNavetEntities({
        entities: {
          [garageDoorEntity.entity_id]: {
            ...garageDoorEntity,
            attributes: { ...garageDoorEntity.attributes, device_class: deviceClass },
          },
        },
        areas: [],
        deviceRegistry: [],
        entityRegistry: [],
      });
      expect(
        selectHomeSecurityAlertDevices(mapNavetEntitiesToDeviceCollection(entities), []).covers
      ).toHaveLength(0);
    }
  );
});
