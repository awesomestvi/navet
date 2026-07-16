import { describe, expect, it } from 'vitest';
import { MARKETING_CURRENT_SUPPORT, MARKETING_ROADMAP } from '../marketingContent';

describe('marketing product inventory', () => {
  it('reflects the dashboard sections and user-facing widget inventory', () => {
    expect(MARKETING_CURRENT_SUPPORT.dashboardSections).toHaveLength(8);
    expect(MARKETING_CURRENT_SUPPORT.widgets).toEqual([
      'Info',
      'RSS',
      'Photo',
      'Note',
      'Battery',
      'UPS',
      'Energy now',
      'Button',
      'Map',
      'Entity',
    ]);
  });

  it('includes shipped specialized card families', () => {
    expect(MARKETING_CURRENT_SUPPORT.cards).toEqual(
      expect.arrayContaining([
        'Humidifiers',
        'Alarm panels',
        'Sensor groups',
        'Helpers',
        'Lawn mowers',
      ])
    );
    expect(MARKETING_CURRENT_SUPPORT.cards).toHaveLength(19);
  });

  it('does not describe alarm panels as future work', () => {
    expect([...MARKETING_ROADMAP.next, ...MARKETING_ROADMAP.later]).not.toContain(
      'Alarm panel cards'
    );
  });
});
