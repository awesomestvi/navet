import type { NavetResourceKind } from '@navet/core/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import { resolveResource } from '@/app/services/integration-resource.service';
import type { IntegrationProviderId } from '@/app/types/provider';
import { areArraysEqual, areDataEqual } from '@/app/utils/structural-equality';

interface UseProviderResourceOptions {
  deviceId: string;
  kind: NavetResourceKind;
  attrs?: Record<string, unknown>;
  fallbackPicture?: string;
  providerId?: IntegrationProviderId;
  requestKey?: string;
}

function resourceEquals(
  left: ResolvedPlatformResource | null,
  right: ResolvedPlatformResource | null
) {
  return areDataEqual(left, right);
}

function normalizeAttrsEntries(attrs?: Record<string, unknown>): Array<[string, unknown]> {
  if (!attrs) {
    return [];
  }

  return Object.entries(attrs).sort(([left], [right]) => left.localeCompare(right));
}

export function useProviderResource({
  deviceId,
  kind,
  attrs,
  fallbackPicture,
  providerId,
  requestKey: _requestKey,
}: UseProviderResourceOptions) {
  const [resource, setResource] = useState<ResolvedPlatformResource | null>(null);
  const normalizedAttrEntries = useMemo(() => normalizeAttrsEntries(attrs), [attrs]);
  const stableAttrsRef = useRef<{
    entries: Array<[string, unknown]>;
    value: Record<string, unknown> | undefined;
  }>({
    entries: [],
    value: undefined,
  });

  if (
    !areArraysEqual(
      stableAttrsRef.current.entries,
      normalizedAttrEntries,
      ([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey && areDataEqual(leftValue, rightValue)
    )
  ) {
    stableAttrsRef.current = {
      entries: normalizedAttrEntries,
      value:
        normalizedAttrEntries.length > 0 ? Object.fromEntries(normalizedAttrEntries) : undefined,
    };
  }

  const stableAttrs = stableAttrsRef.current.value;

  useEffect(() => {
    let cancelled = false;

    if (!deviceId) {
      setResource(null);
      return () => {
        cancelled = true;
      };
    }

    void resolveResource(deviceId, kind, {
      attrs: stableAttrs,
      fallbackPicture,
      providerId,
    })
      .then((nextResource) => {
        if (!cancelled) {
          setResource((currentResource) =>
            resourceEquals(currentResource, nextResource) ? currentResource : nextResource
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResource((currentResource) => (currentResource === null ? currentResource : null));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, fallbackPicture, kind, providerId, stableAttrs]);

  return resource;
}
