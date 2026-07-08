import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenericEntityWidget } from '../generic-entity-widget';

const { useIntegrationStoreMock } = vi.hoisted(() => ({
  useIntegrationStoreMock: vi.fn(),
}));

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<typeof import('@navet/app/hooks')>('@navet/app/hooks');
  return {
    ...actual,
    useTheme: () => ({
      theme: 'dark',
      primaryColor: 'blue',
    }),
    useIntegrationStore: useIntegrationStoreMock,
  };
});

const baseState = {
  providerEntityViewsByCanonicalId: {
    'home_assistant:sensor.kitchen_temperature': {
      id: 'home_assistant:sensor.kitchen_temperature',
      canonicalId: 'home_assistant:sensor.kitchen_temperature',
      providerId: 'home_assistant',
      externalId: 'sensor.kitchen_temperature',
      type: 'sensor',
      name: 'Kitchen Temperature',
      room: 'Kitchen',
      primaryState: 21,
      availability: 'available',
      capabilities: [],
      attributes: {},
      resources: undefined,
      lastUpdated: '2026-07-09T08:30:00.000Z',
    },
  },
  providerEntityViewsByProviderId: {
    home_assistant: {},
  },
};

function renderWidget(entityId = 'home_assistant:sensor.kitchen_temperature') {
  return render(<GenericEntityWidget size="small" data={{ entityId }} />);
}

describe('GenericEntityWidget', () => {
  beforeEach(() => {
    useIntegrationStoreMock.mockImplementation((selector) => selector(baseState));
  });

  it('renders available numeric entity state without command controls', () => {
    renderWidget();

    expect(screen.getByText('Kitchen Temperature')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders unavailable boolean entity state', () => {
    useIntegrationStoreMock.mockImplementation((selector) =>
      selector({
        ...baseState,
        providerEntityViewsByCanonicalId: {
          'home_assistant:binary_sensor.front_door': {
            ...baseState.providerEntityViewsByCanonicalId[
              'home_assistant:sensor.kitchen_temperature'
            ],
            id: 'home_assistant:binary_sensor.front_door',
            canonicalId: 'home_assistant:binary_sensor.front_door',
            externalId: 'binary_sensor.front_door',
            type: 'binary_sensor',
            name: 'Front Door',
            primaryState: false,
            availability: 'unavailable',
          },
        },
      })
    );

    renderWidget('home_assistant:binary_sensor.front_door');

    expect(screen.getByText('Front Door')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('renders unknown null entity state', () => {
    useIntegrationStoreMock.mockImplementation((selector) =>
      selector({
        ...baseState,
        providerEntityViewsByCanonicalId: {
          'home_assistant:unknown.custom': {
            ...baseState.providerEntityViewsByCanonicalId[
              'home_assistant:sensor.kitchen_temperature'
            ],
            id: 'home_assistant:unknown.custom',
            canonicalId: 'home_assistant:unknown.custom',
            externalId: 'unknown.custom',
            type: 'unknown',
            name: 'Custom Entity',
            primaryState: null,
            availability: 'unknown',
          },
        },
      })
    );

    renderWidget('home_assistant:unknown.custom');

    expect(screen.getByText('Custom Entity')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
  });
});
