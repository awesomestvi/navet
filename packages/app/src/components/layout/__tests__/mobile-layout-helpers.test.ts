import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
import { describe, expect, it } from 'vitest';
import { getManageableRoomOrder } from '../mobile-layout-helpers';

function createManageableRoom(
  name: string,
  options?: Partial<PlatformManageableRoomReference>
): PlatformManageableRoomReference {
  return {
    id: name.toLowerCase(),
    name,
    providerId: 'home_assistant',
    canAssign: true,
    canDelete: true,
    canOrder: true,
    ...options,
  };
}

describe('getManageableRoomOrder', () => {
  it('orders visible rooms using manageable provider rooms before navet-only rooms', () => {
    expect(
      getManageableRoomOrder(
        ['Kitchen', 'Office', 'Living Room'],
        [createManageableRoom('Living Room'), createManageableRoom('Kitchen')]
      )
    ).toEqual(['Kitchen', 'Living Room', 'Office']);
  });

  it('ignores non-orderable manageable rooms when building the manageable order', () => {
    expect(
      getManageableRoomOrder(
        ['Unassigned', 'Kitchen'],
        [
          createManageableRoom('Kitchen'),
          createManageableRoom('Unassigned', { canDelete: false, canOrder: false }),
        ]
      )
    ).toEqual(['Kitchen', 'Unassigned']);
  });
});
