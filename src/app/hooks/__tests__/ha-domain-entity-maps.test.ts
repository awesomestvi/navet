import { describe, expect, it } from 'vitest';
import {
  selectFeedreaderEventEntities,
  selectSecuritySummaryEntities,
  selectUpdateDomainEntities,
} from '@/app/infrastructure/home-assistant/home-assistant-domain-selectors';
import { alarmControlPanelEntityFactory } from '@/test/fixtures/home-assistant/entities/alarm-control-panel';
import { binarySensorEntityFactory } from '@/test/fixtures/home-assistant/entities/binary-sensor';
import { sensorEntityFactory } from '@/test/fixtures/home-assistant/entities/sensor';

describe('ha-domain-entity-maps', () => {
  it('selects only security summary entities from the Home Assistant store', () => {
    const motion = binarySensorEntityFactory();
    const alarm = alarmControlPanelEntityFactory();
    const siren = binarySensorEntityFactory({ friendly_name: 'Siren' });
    siren.entity_id = 'siren.entry';
    siren.state = 'on';
    const ignored = sensorEntityFactory();

    expect(
      selectSecuritySummaryEntities({
        entities: {
          [motion.entity_id]: motion,
          [alarm.entity_id]: alarm,
          [siren.entity_id]: siren,
          [ignored.entity_id]: ignored,
        },
      } as never)
    ).toEqual({
      [motion.entity_id]: motion,
      [alarm.entity_id]: alarm,
      [siren.entity_id]: siren,
    });
  });

  it('returns null when security entities are not hydrated', () => {
    expect(selectSecuritySummaryEntities({ entities: null } as never)).toBeNull();
  });

  it('keeps the existing RSS and update-domain selectors scoped to Home Assistant entities', () => {
    const feedreaderEvent = {
      entity_id: 'event.feedreader_news',
      state: '2026-05-01T08:00:00.000Z',
      attributes: {
        title: 'Daily update',
        link: 'https://example.com/story',
      },
      last_changed: '2026-05-01T08:00:00.000Z',
      last_updated: '2026-05-01T08:00:00.000Z',
      context: { id: 'ctx-feed', parent_id: null, user_id: null },
    };
    const updateEntity = {
      entity_id: 'update.router_firmware',
      state: 'on',
      attributes: { friendly_name: 'Router Firmware' },
      last_changed: '2026-05-01T08:00:00.000Z',
      last_updated: '2026-05-01T08:00:00.000Z',
      context: { id: 'ctx-update', parent_id: null, user_id: null },
    };

    const state = {
      entities: {
        [feedreaderEvent.entity_id]: feedreaderEvent,
        [updateEntity.entity_id]: updateEntity,
      },
    } as never;

    expect(selectFeedreaderEventEntities(state)).toEqual({
      [feedreaderEvent.entity_id]: feedreaderEvent,
    });
    expect(selectUpdateDomainEntities(state)).toEqual({
      [updateEntity.entity_id]: updateEntity,
    });
  });
});
