export type IntelligenceControlOperation = 'turn_on' | 'turn_off';

interface IntelligenceEntityReferenceBase {
  id: string;
  providerId: string;
  name: string;
  room?: string;
}

export interface IntelligenceControlEntityReference extends IntelligenceEntityReferenceBase {
  type: 'light' | 'switch';
  state: 'on' | 'off' | 'unknown';
}

export interface IntelligenceTemperatureEntityReference extends IntelligenceEntityReferenceBase {
  type: 'temperature';
  value: number;
  unit: '°C' | '°F' | 'K';
}

export interface IntelligenceHumidityEntityReference extends IntelligenceEntityReferenceBase {
  type: 'humidity';
  value: number;
  unit: '%';
}

export type IntelligenceEntityReference =
  | IntelligenceControlEntityReference
  | IntelligenceTemperatureEntityReference
  | IntelligenceHumidityEntityReference;

export interface IntelligenceControlSuggestion {
  operation: IntelligenceControlOperation;
  entityIds: string[];
}

export type IntelligenceStateAnswer =
  | {
      kind: 'lights_on_count';
      count: number;
      room?: string;
    }
  | {
      kind: 'lights_on_locations';
      lights: Array<{ name: string; room?: string }>;
    }
  | {
      kind: 'temperature';
      room?: string;
      readings: Array<{
        name: string;
        room?: string;
        value: number;
        unit: IntelligenceTemperatureEntityReference['unit'];
      }>;
    }
  | {
      kind: 'humidity';
      room?: string;
      readings: Array<{
        name: string;
        room?: string;
        value: number;
        unit: IntelligenceHumidityEntityReference['unit'];
      }>;
    };

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveOperation(text: string): IntelligenceControlOperation | null {
  if (/\b(turn|switch|power)\s+off\b|\bdeactivat(?:e|ing)\b/.test(text)) return 'turn_off';
  if (/\b(turn|switch|power)\s+on\b|\bactivat(?:e|ing)\b/.test(text)) return 'turn_on';
  return null;
}

function includesWholePhrase(text: string, phrase: string) {
  return phrase.length > 0 && ` ${text} `.includes(` ${phrase} `);
}

const CONTROL_WORDS = new Set([
  'a',
  'all',
  'an',
  'every',
  'in',
  'lamp',
  'lamps',
  'light',
  'lights',
  'off',
  'on',
  'please',
  'power',
  's',
  'switch',
  'the',
  'turn',
]);

function tokenize(value: string) {
  return normalize(value).split(' ').filter(Boolean);
}

function getDistinctiveRequestTokens(request: string, mentionedRooms: ReadonlySet<string>) {
  const roomTokens = new Set([...mentionedRooms].flatMap(tokenize));
  return tokenize(request).filter((token) => !CONTROL_WORDS.has(token) && !roomTokens.has(token));
}

function getDistinctiveEntityNameTokens(name: string) {
  return new Set(tokenize(name).filter((token) => !CONTROL_WORDS.has(token)));
}

function isSingleEditTokenMatch(requestToken: string, nameToken: string) {
  if (requestToken === nameToken) return true;
  if (Math.min(requestToken.length, nameToken.length) < 4) return false;
  if (Math.abs(requestToken.length - nameToken.length) > 1) return false;

  if (requestToken.length === nameToken.length) {
    const differences: number[] = [];
    for (let index = 0; index < requestToken.length; index += 1) {
      if (requestToken[index] !== nameToken[index]) differences.push(index);
      if (differences.length > 2) return false;
    }
    if (differences.length === 1) return true;
    if (differences.length !== 2 || differences[1] !== differences[0] + 1) return false;
    return (
      requestToken[differences[0]] === nameToken[differences[1]] &&
      requestToken[differences[1]] === nameToken[differences[0]]
    );
  }

  const shorter = requestToken.length < nameToken.length ? requestToken : nameToken;
  const longer = requestToken.length < nameToken.length ? nameToken : requestToken;
  let shorterIndex = 0;
  let longerIndex = 0;
  let skipped = false;
  while (shorterIndex < shorter.length && longerIndex < longer.length) {
    if (shorter[shorterIndex] === longer[longerIndex]) {
      shorterIndex += 1;
      longerIndex += 1;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    longerIndex += 1;
  }
  return true;
}

export function isExplicitIntelligenceControlRequest(request: string) {
  const normalizedRequest = normalize(request);
  return /^(?:(?:please|navet)\s+)*(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:turn|switch|power)\s+(?:on|off)\b/.test(
    normalizedRequest
  );
}

export function interpretSimpleStateQuestion(
  request: string,
  entities: readonly IntelligenceEntityReference[]
): IntelligenceStateAnswer | null {
  const normalizedRequest = normalize(request);
  if (/\b(temperature|temp)\b/.test(normalizedRequest)) {
    const temperatureEntities = entities.filter(
      (entity): entity is IntelligenceTemperatureEntityReference => entity.type === 'temperature'
    );
    const room = temperatureEntities
      .map((entity) => entity.room)
      .find(
        (candidate) => candidate && includesWholePhrase(normalizedRequest, normalize(candidate))
      );
    const exactNameMatches = temperatureEntities.filter((entity) =>
      includesWholePhrase(normalizedRequest, normalize(entity.name))
    );
    const hasUnresolvedRoomScope =
      /\b(?:in|inside)\b/.test(normalizedRequest) &&
      !/\b(?:home|house|rooms)\b/.test(normalizedRequest);
    const matchingTemperatures = room
      ? temperatureEntities.filter((entity) => entity.room === room)
      : exactNameMatches.length > 0
        ? exactNameMatches
        : hasUnresolvedRoomScope
          ? []
          : temperatureEntities;

    if (matchingTemperatures.length === 0) return null;
    return {
      kind: 'temperature',
      room,
      readings: matchingTemperatures
        .slice(0, 5)
        .map(({ name, room: readingRoom, value, unit }) => ({
          name,
          room: readingRoom,
          value,
          unit,
        })),
    };
  }

  if (/\bhumid(?:ity)?\b/.test(normalizedRequest)) {
    const humidityEntities = entities.filter(
      (entity): entity is IntelligenceHumidityEntityReference => entity.type === 'humidity'
    );
    const room = humidityEntities
      .map((entity) => entity.room)
      .find(
        (candidate) => candidate && includesWholePhrase(normalizedRequest, normalize(candidate))
      );
    const exactNameMatches = humidityEntities.filter((entity) =>
      includesWholePhrase(normalizedRequest, normalize(entity.name))
    );
    const hasUnresolvedRoomScope =
      /\b(?:in|inside)\b/.test(normalizedRequest) &&
      !/\b(?:home|house|rooms)\b/.test(normalizedRequest);
    const matchingHumidity = room
      ? humidityEntities.filter((entity) => entity.room === room)
      : exactNameMatches.length > 0
        ? exactNameMatches
        : hasUnresolvedRoomScope
          ? []
          : humidityEntities;

    if (matchingHumidity.length === 0) return null;
    return {
      kind: 'humidity',
      room,
      readings: matchingHumidity.slice(0, 5).map(({ name, room: readingRoom, value, unit }) => ({
        name,
        room: readingRoom,
        value,
        unit,
      })),
    };
  }

  const mentionsLights = /\b(lights?|lamps?)\b/.test(normalizedRequest);
  const asksWhereLightsAreOn =
    mentionsLights &&
    /\b(?:on|running)\b/.test(normalizedRequest) &&
    /\bwhere\b|\b(?:which|what) rooms?\b/.test(normalizedRequest);
  if (asksWhereLightsAreOn) {
    return {
      kind: 'lights_on_locations',
      lights: entities
        .filter(
          (entity): entity is IntelligenceControlEntityReference =>
            entity.type === 'light' && entity.state === 'on'
        )
        .slice(0, 20)
        .map(({ name, room }) => ({ name, room })),
    };
  }

  if (!/\bhow many\b/.test(normalizedRequest)) return null;
  if (!mentionsLights || !/\bon\b/.test(normalizedRequest)) {
    return null;
  }

  const room = entities
    .map((entity) => entity.room)
    .find((candidate) => candidate && includesWholePhrase(normalizedRequest, normalize(candidate)));
  const matchingLights = entities.filter(
    (entity): entity is IntelligenceControlEntityReference =>
      entity.type === 'light' && (!room || entity.room === room)
  );

  return {
    kind: 'lights_on_count',
    count: matchingLights.filter((entity) => entity.state === 'on').length,
    room,
  };
}

export function interpretSimpleControlSuggestion(
  request: string,
  entities: readonly IntelligenceEntityReference[]
): IntelligenceControlSuggestion[] {
  const normalizedRequest = normalize(request);
  const operation = resolveOperation(normalizedRequest);
  if (!operation) return [];

  const available = entities.filter(
    (entity): entity is IntelligenceControlEntityReference =>
      (entity.type === 'light' || entity.type === 'switch') && Boolean(entity.id && entity.name)
  );
  const mentionsAll = /\b(all|every)\b/.test(normalizedRequest);
  const mentionsMultipleLights = /\b(lights|lamps)\b/.test(normalizedRequest);
  const mentionedRooms = new Set(
    available
      .map((entity) => normalize(entity.room ?? ''))
      .filter((room) => includesWholePhrase(normalizedRequest, room))
  );

  const exactNameMatches = available.filter((entity) =>
    includesWholePhrase(normalizedRequest, normalize(entity.name))
  );
  if (exactNameMatches.length > 0) {
    const roomScopedMatches =
      mentionedRooms.size > 0
        ? exactNameMatches.filter((entity) => mentionedRooms.has(normalize(entity.room ?? '')))
        : exactNameMatches;
    if (roomScopedMatches.length === 1) {
      return [{ operation, entityIds: [roomScopedMatches[0].id] }];
    }
    return [];
  }

  const distinctiveRequestTokens = getDistinctiveRequestTokens(normalizedRequest, mentionedRooms);
  if (distinctiveRequestTokens.length > 0) {
    const matchesDistinctiveName = (
      entity: IntelligenceControlEntityReference,
      allowTypo: boolean
    ) => {
      if (mentionedRooms.size > 0 && !mentionedRooms.has(normalize(entity.room ?? ''))) {
        return false;
      }
      const nameTokens = getDistinctiveEntityNameTokens(entity.name);
      return distinctiveRequestTokens.every((token) =>
        allowTypo
          ? [...nameTokens].some((nameToken) => isSingleEditTokenMatch(token, nameToken))
          : nameTokens.has(token)
      );
    };
    const partialNameMatches = available.filter((entity) => matchesDistinctiveName(entity, false));
    if (partialNameMatches.length === 1) {
      return [{ operation, entityIds: [partialNameMatches[0].id] }];
    }
    if (partialNameMatches.length > 1) return [];

    const typoNameMatches = available.filter((entity) => matchesDistinctiveName(entity, true));
    if (typoNameMatches.length === 1) {
      return [{ operation, entityIds: [typoNameMatches[0].id] }];
    }
    return [];
  }

  if (mentionedRooms.size > 0 && (mentionsAll || mentionsMultipleLights)) {
    const roomLights = available.filter(
      (entity) => entity.type === 'light' && mentionedRooms.has(normalize(entity.room ?? ''))
    );
    if (roomLights.length > 0) {
      return [{ operation, entityIds: roomLights.map((entity) => entity.id) }];
    }
  }

  if (mentionsAll && mentionsMultipleLights) {
    const lights = available.filter((entity) => entity.type === 'light');
    if (lights.length > 0) return [{ operation, entityIds: lights.map((entity) => entity.id) }];
  }

  return [];
}

export function validateControlSuggestions(
  value: unknown,
  entities: readonly IntelligenceEntityReference[]
): IntelligenceControlSuggestion[] {
  if (!Array.isArray(value)) return [];
  const allowedIds = new Set(
    entities
      .filter((entity) => entity.type === 'light' || entity.type === 'switch')
      .map((entity) => entity.id)
  );

  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    if (candidate.operation !== 'turn_on' && candidate.operation !== 'turn_off') return [];
    if (!Array.isArray(candidate.entityIds)) return [];
    const entityIds = [
      ...new Set(
        candidate.entityIds
          .filter((id): id is string => typeof id === 'string' && allowedIds.has(id))
          .slice(0, 24)
      ),
    ];
    return entityIds.length > 0 ? [{ operation: candidate.operation, entityIds }] : [];
  });
}
