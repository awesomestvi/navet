import type { HassEntity } from 'home-assistant-js-websocket';

export interface HomeAssistantFixtureFactoryOptions {
  entityId: string;
  state: string;
  attributes?: Record<string, unknown>;
}

export function makeHassEntityFixture({
  entityId,
  state,
  attributes = {},
}: HomeAssistantFixtureFactoryOptions): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '2026-05-17T20:00:00.000Z',
    last_updated: '2026-05-17T20:00:00.000Z',
    context: { id: 'fixture-context', parent_id: null, user_id: null },
  } as HassEntity;
}

export function makeEntityFixtures(
  domain: string,
  entityIdSuffix: string,
  attributes: Record<string, unknown>,
  options: {
    relativeUrlAttribute?: string;
    relativeUrlValue?: string;
    ingressPathAttribute?: string;
    ingressPathValue?: string;
    externalOrSignedUrlAttribute?: string;
    externalOrSignedUrlValue?: string;
  } = {}
) {
  const entityId = `${domain}.${entityIdSuffix}`;
  const relativeUrlAttribute = options.relativeUrlAttribute ?? 'entity_picture';
  const ingressPathAttribute = options.ingressPathAttribute ?? relativeUrlAttribute;
  const externalOrSignedUrlAttribute = options.externalOrSignedUrlAttribute ?? relativeUrlAttribute;

  return {
    normal: makeHassEntityFixture({
      entityId,
      state: 'on',
      attributes,
    }),
    unavailable: makeHassEntityFixture({
      entityId,
      state: 'unavailable',
      attributes,
    }),
    unknown: makeHassEntityFixture({
      entityId,
      state: 'unknown',
      attributes,
    }),
    missingOptionalAttributes: makeHassEntityFixture({
      entityId,
      state: 'on',
      attributes: {
        friendly_name: attributes.friendly_name,
      },
    }),
    malformedButPlausible: makeHassEntityFixture({
      entityId,
      state: 'on',
      attributes: {
        ...attributes,
        supported_features: 'unexpected-string-mask',
        current_temperature: '20.5',
      },
    }),
    relativeUrl: makeHassEntityFixture({
      entityId,
      state: 'on',
      attributes: {
        ...attributes,
        [relativeUrlAttribute]: options.relativeUrlValue ?? `/api/${domain}/${entityIdSuffix}`,
      },
    }),
    ingressPath: makeHassEntityFixture({
      entityId,
      state: 'on',
      attributes: {
        ...attributes,
        [ingressPathAttribute]:
          options.ingressPathValue ??
          `/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/${domain}/${entityIdSuffix}`,
      },
    }),
    externalOrSignedUrl: makeHassEntityFixture({
      entityId,
      state: 'on',
      attributes: {
        ...attributes,
        [externalOrSignedUrlAttribute]:
          options.externalOrSignedUrlValue ??
          `https://ha.example.test/api/${domain}/${entityIdSuffix}?authSig=signed-fixture`,
      },
    }),
  };
}
