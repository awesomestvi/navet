import { describe, expect, it } from 'vitest';
import {
  getGo2RtcViewerPresentation,
  isOpaqueGo2RtcStreamResource,
} from '../go2rtc-viewer-presentation';

describe('go2rtc viewer presentation', () => {
  it('uses the native player for same-origin go2rtc viewer URLs', () => {
    expect(
      getGo2RtcViewerPresentation(
        '/home/go2rtc/stream.html?src=camera%2Fgarage&mode=webrtc',
        'https://navet.example/dashboard'
      )
    ).toBe('native');
  });

  it('keeps cross-origin go2rtc viewers in an opaque iframe', () => {
    expect(
      getGo2RtcViewerPresentation(
        'http://go2rtc.local:1984/stream.html?src=front_door&mode=mse',
        'https://navet.example/dashboard'
      )
    ).toBe('opaque_iframe');
  });

  it('does not route non-viewer URLs through the native player', () => {
    expect(
      getGo2RtcViewerPresentation(
        'https://navet.example/api/ws?src=front_door',
        'https://navet.example/dashboard'
      )
    ).toBe('opaque_iframe');
  });

  it('identifies opaque WebRTC resources for readiness presentation', () => {
    expect(
      isOpaqueGo2RtcStreamResource(
        {
          id: 'camera.front:direct',
          kind: 'webrtc_stream',
          cacheKey: 'camera.front:direct',
          authStrategy: 'none',
          url: 'http://go2rtc.local:1984/stream.html?src=front_door',
          metadata: {
            source: 'direct_stream_url',
          },
        },
        'https://navet.example/dashboard'
      )
    ).toBe(true);
  });
});
