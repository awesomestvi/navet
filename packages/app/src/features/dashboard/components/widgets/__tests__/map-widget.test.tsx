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

    expect(screen.getByText('Trackers')).toBeInTheDocument();
    expect(screen.getByText('1 tracked')).toBeInTheDocument();
    expect(screen.getByTestId('map-widget-viewport').className).toContain('rounded-[inherit]');
    expect(screen.queryByTestId('live-map')).not.toBeInTheDocument();
  });

  it('mounts the live map after the defer timeout without requiring interaction', async () => {
    renderWithProviders(<MapWidget markers={MARKERS} />);

    act(() => {
      vi.advanceTimersByTime(1_200);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('live-map')).toBeInTheDocument();
  });
});
