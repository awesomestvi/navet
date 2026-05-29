import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProviderAuthRequiredError, UnsupportedProviderCommandError } from './errors';
import type { SmartHomeProviderAdapter } from './provider-contract';
import type { NavetCommand, NavetEntity } from './types';

interface ProviderContractTestOptions {
  providerName: string;
  createAdapter: () => SmartHomeProviderAdapter;
  setAuthenticatedSession: () => void;
  clearAuthenticatedSession: () => void;
  createCommand: (entity: NavetEntity) => NavetCommand;
  expectConnected?: () => void;
  expectDisconnected?: () => void;
  expectCommandDispatched?: () => void;
  getLookupIds?: (entity: NavetEntity) => string[];
  emitEntityUpdate?: () => void;
  emitEntityAdded?: () => void;
  emitEntityRemoved?: () => void;
  setUnavailableSnapshot?: () => void;
  setMalformedSnapshot?: () => void;
}

export function runProviderContractTests(options: ProviderContractTestOptions) {
  describe(`${options.providerName} provider contract`, () => {
    beforeEach(() => {
      options.clearAuthenticatedSession();
    });

    afterEach(() => {
      options.clearAuthenticatedSession();
    });

    it('requires authentication before connect', async () => {
      const adapter = options.createAdapter();

      await expect(adapter.connect()).rejects.toBeInstanceOf(ProviderAuthRequiredError);
    });

    it('connects when an authenticated session exists', async () => {
      const adapter = options.createAdapter();

      options.setAuthenticatedSession();
      await expect(adapter.connect()).resolves.toBeUndefined();
      options.expectConnected?.();
    });

    it('lists normalized entities and resolves them through provider-neutral lookups', async () => {
      const adapter = options.createAdapter();
      const entities = await adapter.listEntities();

      expect(entities.length).toBeGreaterThan(0);
      const entity = entities[0];
      expect(entity.providerId).toBeDefined();
      expect(entity.id).toBeTruthy();
      expect(entity.externalId).toBeTruthy();
      expect(entity.name).toBeTruthy();

      await expect(adapter.getEntity(entity.id)).resolves.toEqual(entity);

      for (const lookupId of options.getLookupIds?.(entity) ?? []) {
        await expect(adapter.getEntity(lookupId)).resolves.toEqual(entity);
      }
    });

    it('returns null for unknown entity lookups', async () => {
      const adapter = options.createAdapter();

      await expect(adapter.getEntity('__missing__:entity')).resolves.toBeNull();
    });

    it('rejects execution for unknown entities', async () => {
      const adapter = options.createAdapter();

      await expect(
        adapter.execute({
          type: 'turn_off',
          entityId: '__missing__:entity',
        } as NavetCommand)
      ).rejects.toThrow('Unknown provider entity');
    });

    it('executes commands through the provider adapter', async () => {
      const adapter = options.createAdapter();
      const [entity] = await adapter.listEntities();

      await expect(adapter.execute(options.createCommand(entity))).resolves.toMatchObject({
        accepted: true,
        requiresEventConfirmation: true,
      });
      options.expectCommandDispatched?.();
    });

    it('rejects unsupported commands cleanly', async () => {
      const adapter = options.createAdapter();
      const [entity] = await adapter.listEntities();

      await expect(
        adapter.execute({
          type: 'unsupported_test_command',
          entityId: entity.id,
        } as unknown as NavetCommand)
      ).rejects.toBeInstanceOf(UnsupportedProviderCommandError);
    });

    it('disconnects through the provider adapter', async () => {
      const adapter = options.createAdapter();

      await expect(adapter.disconnect()).resolves.toBeUndefined();
      options.expectDisconnected?.();
    });

    it('emits entity update events from provider snapshot changes', async () => {
      const adapter = options.createAdapter();
      const events: string[] = [];
      const unsubscribe = await adapter.subscribeToEvents((event) => {
        events.push(event.type);
      });

      options.emitEntityUpdate?.();

      expect(events).toContain('entity_updated');
      unsubscribe();
    });

    it('emits entity add and remove events from provider snapshot changes', async () => {
      const adapter = options.createAdapter();
      const events: string[] = [];
      const unsubscribe = await adapter.subscribeToEvents((event) => {
        events.push(event.type);
      });

      options.emitEntityAdded?.();
      options.emitEntityRemoved?.();

      expect(events).toContain('entity_added');
      expect(events).toContain('entity_removed');
      unsubscribe();
    });

    it('maps unavailable provider payloads without throwing', async () => {
      options.setUnavailableSnapshot?.();
      const adapter = options.createAdapter();

      await expect(adapter.listEntities()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            availability: expect.stringMatching(/available|unavailable|unknown/),
          }),
        ])
      );
    });

    it('ignores malformed provider payload entries while preserving valid entities', async () => {
      options.setMalformedSnapshot?.();
      const adapter = options.createAdapter();

      const entities = await adapter.listEntities();
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          providerId: expect.any(String),
          name: expect.any(String),
        })
      );
    });
  });
}
