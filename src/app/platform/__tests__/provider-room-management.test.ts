import { describe, expect, it } from 'vitest';
import { buildManageableRoomReferences } from '../provider-room-management';

describe('provider-room-management', () => {
  it('maps room descriptors to opaque provider-scoped room references', () => {
    expect(
      buildManageableRoomReferences(
        [
          {
            id: 'kitchen',
            canonicalId: 'kitchen',
            name: 'Kitchen',
            normalizedName: 'kitchen',
            providerIds: ['home_assistant', 'homey'],
            memberIds: [],
            sources: [
              {
                providerId: 'home_assistant',
                nativeId: 'kitchen',
                sourceType: 'provider_managed',
                supportsOrdering: true,
                supportsDeletion: true,
              },
              {
                providerId: 'homey',
                nativeId: 'zone-1',
                sourceType: 'provider_managed',
                supportsOrdering: true,
                supportsDeletion: false,
              },
            ],
          },
        ],
        'home_assistant'
      )
    ).toEqual([
      {
        id: 'home_assistant:kitchen',
        name: 'Kitchen',
        providerId: 'home_assistant',
        canAssign: true,
        canDelete: true,
        canOrder: true,
      },
    ]);
  });

  it('ignores derived rooms and rooms from other providers', () => {
    expect(
      buildManageableRoomReferences(
        [
          {
            id: 'weather',
            canonicalId: 'weather',
            name: 'Weather',
            normalizedName: 'weather',
            providerIds: ['home_assistant'],
            memberIds: [],
            sources: [
              {
                providerId: 'home_assistant',
                nativeId: 'weather',
                sourceType: 'derived',
                supportsOrdering: false,
                supportsDeletion: false,
              },
            ],
          },
        ],
        'homey'
      )
    ).toEqual([]);
  });
});
