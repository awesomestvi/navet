import { describe, expect, it } from 'vitest';
import type { NavetRoomDescriptor } from '@/app/core/navet';
import { getManageableRoomOrder } from '../mobile-layout-helpers';

function createRoomDescriptor(
  name: string,
  options?: Partial<NavetRoomDescriptor['sources'][number]>
): NavetRoomDescriptor {
  return {
    id: name.toLowerCase(),
    canonicalId: name.toLowerCase(),
    name,
    normalizedName: name.toLowerCase(),
    providerIds: ['home_assistant'],
    memberIds: [],
    sources: [
      {
        providerId: 'home_assistant',
        nativeId: name.toLowerCase(),
        sourceType: 'provider_managed',
        supportsOrdering: true,
        supportsDeletion: true,
        ...options,
      },
    ],
  };
}

describe('getManageableRoomOrder', () => {
  it('orders visible rooms using normalized room descriptors before navet-only rooms', () => {
    expect(
      getManageableRoomOrder(
        ['Kitchen', 'Office', 'Living Room'],
        [createRoomDescriptor('Living Room'), createRoomDescriptor('Kitchen')]
      )
    ).toEqual(['Kitchen', 'Living Room', 'Office']);
  });

  it('ignores derived non-orderable room descriptors when building the manageable order', () => {
    expect(
      getManageableRoomOrder(
        ['Unassigned', 'Kitchen'],
        [
          createRoomDescriptor('Kitchen'),
          createRoomDescriptor('Unassigned', {
            sourceType: 'derived',
            supportsOrdering: false,
            supportsDeletion: false,
          }),
        ]
      )
    ).toEqual(['Kitchen', 'Unassigned']);
  });
});
