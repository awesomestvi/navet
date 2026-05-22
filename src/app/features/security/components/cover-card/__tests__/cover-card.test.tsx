import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/app/i18n/i18n-provider';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { CoverCard } from '../index';

const { callServiceMock, toastErrorMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn().mockResolvedValue(undefined),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/app/services/home-assistant.service', async () => {
  const actual = await vi.importActual<typeof import('@/app/services/home-assistant.service')>(
    '@/app/services/home-assistant.service'
  );

  return {
    ...actual,
    homeAssistantService: {
      ...actual.homeAssistantService,
      callService: callServiceMock,
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

const COVER_FEATURE_OPEN = 1;
const COVER_FEATURE_CLOSE = 2;
const COVER_FEATURE_SET_POSITION = 4;
const COVER_FEATURE_STOP = 8;
const COVER_FEATURE_OPEN_TILT = 16;
const COVER_FEATURE_CLOSE_TILT = 32;
const COVER_FEATURE_STOP_TILT = 64;
const COVER_FEATURE_SET_TILT_POSITION = 128;
const ALL_COVER_FEATURES =
  COVER_FEATURE_OPEN | COVER_FEATURE_CLOSE | COVER_FEATURE_SET_POSITION | COVER_FEATURE_STOP;
const ALL_TILT_COVER_FEATURES =
  COVER_FEATURE_OPEN_TILT |
  COVER_FEATURE_CLOSE_TILT |
  COVER_FEATURE_STOP_TILT |
  COVER_FEATURE_SET_TILT_POSITION;

function renderCoverCard(props: Partial<ComponentProps<typeof CoverCard>> = {}) {
  return render(
    <I18nProvider>
      <CoverCard
        id="cover.living_room_blind"
        name="Living Room Blind"
        room="Living Room"
        initialPosition={50}
        hasPosition
        supportedFeatures={ALL_COVER_FEATURES}
        size="large"
        isEditMode={false}
        onSizeChange={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );
}

function createCoverEntity(position: number | null, state = 'open'): HassEntity {
  return {
    entity_id: 'cover.living_room_blind',
    state,
    attributes: {
      ...(position === null ? {} : { current_position: position }),
      supported_features: ALL_COVER_FEATURES,
    },
    last_changed: '2026-05-22T00:00:00.000Z',
    last_updated: '2026-05-22T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

function setLiveCoverPosition(position: number, state = 'open') {
  homeAssistantStore.setState({
    entities: {
      'cover.living_room_blind': createCoverEntity(position, state),
    },
  });
}

function setLiveCoverStateWithoutPosition(state: string) {
  homeAssistantStore.setState({
    entities: {
      'cover.living_room_blind': createCoverEntity(null, state),
    },
  });
}

function setLiveCoverTiltPosition(position: number, state = 'open') {
  homeAssistantStore.setState({
    entities: {
      'cover.living_room_blind': {
        ...createCoverEntity(null, state),
        attributes: {
          current_tilt_position: position,
          supported_features: ALL_TILT_COVER_FEATURES,
        },
      } as HassEntity,
    },
  });
}

describe('CoverCard', () => {
  beforeEach(() => {
    homeAssistantStore.setState({ entities: null });
    callServiceMock.mockReset();
    callServiceMock.mockResolvedValue(undefined);
    toastErrorMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('calls the Home Assistant open cover service', async () => {
    renderCoverCard();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'open_cover',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('shows open fill for covers that report state without current position', () => {
    act(() => setLiveCoverStateWithoutPosition('open'));
    renderCoverCard({ hasPosition: false, initialPosition: 0 });

    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
  });

  it('optimistically fills positionless covers when opening from the card', async () => {
    act(() => setLiveCoverStateWithoutPosition('closed'));
    renderCoverCard({ hasPosition: false, initialPosition: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'open_cover',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('calls the Home Assistant close cover service', async () => {
    renderCoverCard();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'close_cover',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('calls the Home Assistant stop cover service', async () => {
    renderCoverCard();

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'stop_cover',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('calls the Home Assistant set cover position service from presets', async () => {
    renderCoverCard();

    fireEvent.click(screen.getByRole('button', { name: '75' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 75 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('uses tilt services for tilt-only cover position controls', async () => {
    act(() => setLiveCoverTiltPosition(30));
    renderCoverCard({
      initialPosition: 30,
      initialPositionMode: 'tilt',
      supportedFeatures: ALL_TILT_COVER_FEATURES,
    });

    fireEvent.click(screen.getByRole('button', { name: '75' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_tilt_position',
        { tilt_position: 75 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('uses tilt open and close services for tilt-only covers', async () => {
    act(() => setLiveCoverTiltPosition(0, 'closed'));
    renderCoverCard({
      initialPosition: 0,
      initialPositionMode: 'tilt',
      supportedFeatures: ALL_TILT_COVER_FEATURES,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'open_cover_tilt',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'close_cover_tilt',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('follows live tilt movement while Home Assistant reports intermediate opening positions', async () => {
    act(() => setLiveCoverTiltPosition(0, 'closed'));
    renderCoverCard({
      initialPosition: 0,
      initialPositionMode: 'tilt',
      supportedFeatures: ALL_TILT_COVER_FEATURES,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'open_cover_tilt',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);

    act(() => setLiveCoverTiltPosition(10, 'opening'));
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0);

    act(() => setLiveCoverTiltPosition(30, 'opening'));
    expect(screen.getAllByText('30%').length).toBeGreaterThan(0);

    act(() => setLiveCoverTiltPosition(100, 'open'));
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
  });

  it('previews upward cover position swipes and commits once on release', async () => {
    renderCoverCard();

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 40, pointerId: 1 });

    expect(callServiceMock).not.toHaveBeenCalled();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);

    fireEvent.pointerUp(gestureSurface, { clientY: 40, pointerId: 1 });

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 80 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
    expect(callServiceMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the committed cover position optimistic while Home Assistant reports intermediate movement', async () => {
    act(() => setLiveCoverPosition(30));
    renderCoverCard({ initialPosition: 30 });

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 70, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 30, pointerId: 1 });

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 70 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0);

    act(() => setLiveCoverPosition(40, 'opening'));
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0);

    act(() => setLiveCoverPosition(60, 'opening'));
    expect(screen.queryByText('60%')).not.toBeInTheDocument();
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0);

    act(() => setLiveCoverPosition(70));
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0);
  });

  it('follows live position movement while position-capable covers are closing', async () => {
    act(() => setLiveCoverPosition(70));
    renderCoverCard({ initialPosition: 70 });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'close_cover',
        {},
        { entity_id: 'cover.living_room_blind' }
      )
    );
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0);

    act(() => setLiveCoverPosition(40, 'closing'));
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);

    act(() => setLiveCoverPosition(0, 'closed'));
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
  });

  it('commits downward cover position swipes once on release', async () => {
    renderCoverCard();

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 160, pointerId: 1 });

    expect(callServiceMock).not.toHaveBeenCalled();

    fireEvent.pointerUp(gestureSurface, { clientY: 160, pointerId: 1 });

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 20 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
    expect(callServiceMock).toHaveBeenCalledTimes(1);
  });

  it('supports position swipes from the compact metric surface', async () => {
    renderCoverCard({ size: 'medium' });

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 20, pointerId: 1 });

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 80 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('maps compact surface swipes against the card height so the fill follows the pointer', async () => {
    renderCoverCard({ size: 'medium' });

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    const cardRoot = gestureSurface.closest('[data-cover-card-root="true"]') as HTMLElement;
    vi.spyOn(cardRoot, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 160,
      toJSON: () => ({}),
      top: 0,
      width: 160,
      x: 0,
      y: 0,
    });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 20, pointerId: 1 });

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 90 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
  });

  it('does not trigger the card tap open or close action after a position swipe', async () => {
    renderCoverCard();

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    const cardRoot = gestureSurface.closest('[data-cover-card-root="true"]') as HTMLElement;
    vi.spyOn(cardRoot, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 160,
      toJSON: () => ({}),
      top: 0,
      width: 160,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 40, pointerId: 1 });
    fireEvent.click(cardRoot);

    await waitFor(() =>
      expect(callServiceMock).toHaveBeenCalledWith(
        'cover',
        'set_cover_position',
        { position: 80 },
        { entity_id: 'cover.living_room_blind' }
      )
    );
    expect(callServiceMock).toHaveBeenCalledTimes(1);
    expect(callServiceMock).not.toHaveBeenCalledWith(
      'cover',
      'close_cover',
      {},
      { entity_id: 'cover.living_room_blind' }
    );
  });

  it('does not toggle the cover when tapping the position gesture surface', () => {
    renderCoverCard();

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });

    fireEvent.click(gestureSurface);

    expect(callServiceMock).not.toHaveBeenCalled();
  });

  it('does not preview or commit when the position gesture is tapped without dragging', () => {
    renderCoverCard({ size: 'medium' });

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    const cardRoot = gestureSurface.closest('[data-cover-card-root="true"]') as HTMLElement;
    vi.spyOn(cardRoot, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 160,
      toJSON: () => ({}),
      top: 0,
      width: 160,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 100, pointerId: 1 });

    expect(screen.queryByText('90%')).not.toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(callServiceMock).not.toHaveBeenCalled();
  });

  it('does not call set position when a drag returns to the starting position', () => {
    renderCoverCard({ size: 'medium' });

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    const cardRoot = gestureSurface.closest('[data-cover-card-root="true"]') as HTMLElement;
    vi.spyOn(cardRoot, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 160,
      toJSON: () => ({}),
      top: 0,
      width: 160,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 60, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.click(cardRoot);

    expect(screen.queryByText('70%')).not.toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(callServiceMock).not.toHaveBeenCalled();
  });

  it('reverts swipe previews without committing when the gesture is canceled', () => {
    renderCoverCard();

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 40, pointerId: 1 });

    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);

    fireEvent.pointerCancel(gestureSurface, { clientY: 40, pointerId: 1 });

    expect(screen.queryByText('80%')).not.toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(callServiceMock).not.toHaveBeenCalled();
  });

  it('disables position presets when set position is unsupported', () => {
    renderCoverCard({
      supportedFeatures: COVER_FEATURE_OPEN | COVER_FEATURE_CLOSE | COVER_FEATURE_STOP,
    });

    expect(screen.getByRole('button', { name: '75' })).toBeDisabled();
  });

  it('disables cover position swipes when set position is unsupported', () => {
    renderCoverCard({
      supportedFeatures: COVER_FEATURE_OPEN | COVER_FEATURE_CLOSE | COVER_FEATURE_STOP,
    });

    const gestureSurface = screen.getByRole('slider', { name: 'Living Room Blind cover' });
    vi.spyOn(gestureSurface, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(gestureSurface, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gestureSurface, { clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(gestureSurface, { clientY: 40, pointerId: 1 });

    expect(gestureSurface).toHaveAttribute('aria-disabled', 'true');
    expect(callServiceMock).not.toHaveBeenCalled();
  });

  it('shows service action failures through the shared handler', async () => {
    callServiceMock.mockRejectedValue('failed');
    renderCoverCard();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Unable to update cover'));
  });
});
