import { renderWithProviders } from '@navet/app/test/render';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapMarker } from '../map-types';
import { MapWidget } from '../map-widget';

vi.mock('../map-widget-live', () => ({
  MapWidgetLive: () => <div data-testid="live-map" />,
}));

const MARKERS: MapMarker[] = [
  {
    id: 'person.vishal',
    name: 'Vishal',
    latitude: 59.33,
    longitude: 18.06,
    state: 'home',
    entityPicture: '/api/image/serve/person-vishal/512x512',
  },
];

describe('MapWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', undefined);
  });

  it('renders the placeholder immediately before mounting the live map', () => {
    renderWithProviders(<MapWidget markers={MARKERS} />);

    expect(screen.getByRole('button', { name: 'Load live map' })).toBeInTheDocument();
    expect(screen.queryByTestId('live-map')).not.toBeInTheDocument();
  });

  it('does not mount the live map after the defer timeout without interaction', () => {
    renderWithProviders(<MapWidget markers={MARKERS} />);

    act(() => {
      vi.advanceTimersByTime(1_200);
    });

    expect(screen.queryByTestId('live-map')).not.toBeInTheDocument();
  });

  it('mounts the live map after interaction once the defer timeout has elapsed', async () => {
    renderWithProviders(<MapWidget markers={MARKERS} />);

    act(() => {
      vi.advanceTimersByTime(1_200);
    });

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('live-map')).toBeInTheDocument();
  });
});
