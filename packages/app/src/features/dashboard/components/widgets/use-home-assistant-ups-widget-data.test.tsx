import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHomeAssistantUpsWidgetData } from './use-home-assistant-ups-widget-data';

vi.mock('@navet/app/hooks', () => ({
  useHomeAssistant: (selector: (state: unknown) => unknown) =>
    selector({
      entities: {
        'sensor.ups_battery': {
          state: '81',
          attributes: {
            friendly_name: 'UPS Battery Charge',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
        },
        'light.kitchen': {
          state: 'on',
          attributes: {
            friendly_name: 'Kitchen Light',
          },
        },
      },
      areas: [{ area_id: 'office', name: 'Office' }],
      deviceRegistry: [{ id: 'device-ups', area_id: 'office', name: 'UPS Cabinet' }],
      entityRegistry: [
        {
          entity_id: 'sensor.ups_battery',
          device_id: 'device-ups',
          area_id: 'office',
          name: 'UPS Battery Charge',
          platform: 'nut',
        },
      ],
    } as const),
  useI18n: () => ({
    locale: 'en-US',
  }),
}));

describe('useHomeAssistantUpsWidgetData', () => {
  it('filters Home Assistant entities to sensor entries before building UPS options', () => {
    const { result } = renderHook(() =>
      useHomeAssistantUpsWidgetData({ use24HourTime: true }, true)
    );

    expect(result.current.entities).toEqual({
      'sensor.ups_battery': expect.objectContaining({
        entityId: 'sensor.ups_battery',
      }),
    });
    expect(result.current.entities).not.toHaveProperty('light.kitchen');
  });
});
