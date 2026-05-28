import { useEffect, useMemo, useRef, useState } from 'react';
import type { NavetResourceKind } from '@/app/core/navet';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import { resolveResource } from '@/app/services/integration-resource.service';
import type { IntegrationProviderId } from '@/app/types/provider';

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
  return JSON.stringify(left) === JSON.stringify(right);
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
  const attrsKey = useMemo(() => {
    if (!attrs) {
      return '';
    }

    return JSON.stringify(
      Object.entries(attrs).sort(([left], [right]) => left.localeCompare(right))
    );
  }, [attrs]);
  const stableAttrsRef = useRef<{
    key: string;
    value: Record<string, unknown> | undefined;
  }>({
    key: '',
    value: undefined,
  });

  if (stableAttrsRef.current.key !== attrsKey) {
    stableAttrsRef.current = {
      key: attrsKey,
      value: attrs
        ? Object.fromEntries(
            Object.entries(attrs).sort(([left], [right]) => left.localeCompare(right))
          )
        : undefined,
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
