import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { buildNavetAiChatContext } from './navet-ai-chat-context';

function entity(input: Partial<NavetEntity> & Pick<NavetEntity, 'canonicalId' | 'type' | 'name'>) {
  return {
    id: input.canonicalId,
    externalId: input.canonicalId.split(':').at(-1) ?? input.canonicalId,
    providerId: 'home_assistant',
    primaryState: 'off',
    availability: 'available',
    attributes: {},
    capabilities: [],
    ...input,
  } as NavetEntity;
}

describe('Navet AI chat context', () => {
  it('includes only sanitized available lights and switches', () => {
    const values = [
      entity({
        canonicalId: 'home_assistant:light.desk',
        type: 'light',
        name: ' Desk lamp ',
        room: ' Office ',
        primaryState: 'on',
      }),
      entity({
        canonicalId: 'home_assistant:camera.office',
        type: 'camera',
        name: 'Office camera',
      }),
      entity({
        canonicalId: 'home_assistant:switch.secret',
        type: 'switch',
        name: 'Private switch',
        availability: 'unavailable',
      }),
    ];

    expect(
      buildNavetAiChatContext(Object.fromEntries(values.map((item) => [item.id, item])))
    ).toEqual([
      {
        id: 'home_assistant:light.desk',
        providerId: 'home_assistant',
        name: 'Desk lamp',
        room: 'Office',
        type: 'light',
        state: 'on',
      },
    ]);
  });
});
