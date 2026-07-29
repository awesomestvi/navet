import { useEffect, useRef, useState } from 'react';

export const CAMERA_STREAM_OFFSCREEN_GRACE_MS = 1_500;

type CameraLiveStreamRequest = {
  granted: boolean;
  limit: number;
  onGrantChange: (granted: boolean) => void;
  order: number;
  visible: boolean;
};

const liveStreamRequests = new Map<symbol, CameraLiveStreamRequest>();
let nextLiveStreamRequestOrder = 0;

function rebalanceLiveStreamRequests() {
  if (liveStreamRequests.size === 0) {
    return;
  }

  const requests = [...liveStreamRequests.values()].sort((left, right) => {
    if (left.visible !== right.visible) {
      return left.visible ? -1 : 1;
    }
    return left.order - right.order;
  });
  const sharedLimit = Math.min(...requests.map(({ limit }) => limit));
  const grantedRequests = new Set(requests.slice(0, sharedLimit));

  for (const request of requests) {
    const granted = grantedRequests.has(request);
    if (request.granted === granted) {
      continue;
    }

    request.granted = granted;
    request.onGrantChange(granted);
  }
}

function requestLiveStreamSlot(token: symbol, request: Omit<CameraLiveStreamRequest, 'granted'>) {
  const registeredRequest = {
    ...request,
    granted: false,
  };
  liveStreamRequests.set(token, registeredRequest);
  rebalanceLiveStreamRequests();
  request.onGrantChange(registeredRequest.granted);

  return () => {
    liveStreamRequests.delete(token);
    rebalanceLiveStreamRequests();
  };
}

export function useRetainedCameraStreamVisibility(
  isVisible: boolean,
  graceMs = CAMERA_STREAM_OFFSCREEN_GRACE_MS
) {
  const [isRetained, setIsRetained] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setIsRetained(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsRetained(false);
    }, graceMs);
    return () => window.clearTimeout(timeoutId);
  }, [graceMs, isVisible]);

  return isRetained;
}

export function useCameraLiveStreamSlot({
  enabled,
  isVisible,
  maxConcurrent,
}: {
  enabled: boolean;
  isVisible: boolean;
  maxConcurrent: number;
}) {
  const tokenRef = useRef<symbol | null>(null);
  const orderRef = useRef<number | null>(null);
  const [granted, setGranted] = useState(false);

  const token = tokenRef.current ?? Symbol('navet-camera-live-stream');
  const order = orderRef.current ?? nextLiveStreamRequestOrder++;
  tokenRef.current = token;
  orderRef.current = order;

  const hasFiniteLimit = Number.isFinite(maxConcurrent);
  const normalizedLimit = hasFiniteLimit
    ? Math.max(1, Math.floor(maxConcurrent))
    : Number.POSITIVE_INFINITY;

  useEffect(() => {
    if (!enabled || !Number.isFinite(normalizedLimit)) {
      return;
    }

    return requestLiveStreamSlot(token, {
      limit: normalizedLimit,
      onGrantChange: setGranted,
      order,
      visible: isVisible,
    });
  }, [enabled, isVisible, normalizedLimit, order, token]);

  if (!enabled) {
    return false;
  }
  if (!hasFiniteLimit) {
    return true;
  }
  return granted;
}

export function resetCameraLiveStreamBudgetForTests() {
  liveStreamRequests.clear();
  nextLiveStreamRequestOrder = 0;
}
