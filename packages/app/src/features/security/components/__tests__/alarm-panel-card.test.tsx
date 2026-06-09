import { renderWithProviders } from '@navet/app/test/render';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityPanelCard } from '../alarm-panel-card';

const { armAwayMock, armHomeMock, disarmMock, toastErrorMock, triggerMock } = vi.hoisted(() => ({
  armAwayMock: vi.fn().mockResolvedValue(undefined),
  armHomeMock: vi.fn().mockResolvedValue(undefined),
  disarmMock: vi.fn().mockResolvedValue(undefined),
  toastErrorMock: vi.fn(),
  triggerMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@navet/app/services/integration-security-feature.service', () => ({
  integrationSecurityFeatureService: {
    armAway: armAwayMock,
    armCustomBypass: vi.fn(),
    armHome: armHomeMock,
    armNight: vi.fn(),
    armVacation: vi.fn(),
    closeCover: vi.fn(),
    disarm: disarmMock,
    lockEntity: vi.fn(),
    openCover: vi.fn(),
    setCoverPosition: vi.fn(),
    stopCover: vi.fn(),
    trigger: triggerMock,
    unlockEntity: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

const singleAlarm: NavetAlarmEntity = {
  id: 'home_assistant:alarm_control_panel.home',
  name: 'Home Alarm',
  state: 'disarmed',
  supportedActions: ['arm_home', 'arm_away', 'disarm'],
  codeFormat: 'none',
  provider: 'home_assistant',
  availability: 'available',
};

describe('SecurityPanelCard', () => {
  beforeEach(() => {
    armAwayMock.mockReset();
    armAwayMock.mockResolvedValue(undefined);
    armHomeMock.mockReset();
    armHomeMock.mockResolvedValue(undefined);
    disarmMock.mockReset();
    disarmMock.mockResolvedValue(undefined);
    toastErrorMock.mockReset();
    triggerMock.mockReset();
    triggerMock.mockResolvedValue(undefined);
  });

  it('hides unsupported actions', () => {
    renderWithProviders(<SecurityPanelCard alarms={[singleAlarm]} />);

    expect(screen.getByRole('button', { name: 'Arm Away' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arm Home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arm Night' })).not.toBeInTheDocument();
  });

  it('disables the active state action for a disarmed alarm', () => {
    renderWithProviders(<SecurityPanelCard alarms={[singleAlarm]} />);

    expect(screen.getByRole('button', { name: 'Disarm' })).toBeDisabled();
  });

  it('keeps disarm enabled when the alarm is triggered', () => {
    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          {
            ...singleAlarm,
            state: 'triggered',
            supportedActions: ['disarm', 'trigger'],
          },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Disarm' })).toBeEnabled();
  });

  it('renders a numeric keypad and submits codes for number-format alarms', async () => {
    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          {
            ...singleAlarm,
            codeFormat: 'number',
            requiresCode: true,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Arm Away' }));
    expect(screen.queryByRole('button', { name: 'Arm Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disarm' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Arm Away' }));

    await waitFor(() =>
      expect(armAwayMock).toHaveBeenCalledWith('home_assistant:alarm_control_panel.home', '123')
    );
    expect(screen.queryByRole('button', { name: 'Confirm Arm Away' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Entered code')).not.toBeInTheDocument();
  });

  it('clears text code input after a failed action', async () => {
    armHomeMock.mockRejectedValue(new Error('Invalid code'));

    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          {
            ...singleAlarm,
            supportedActions: ['arm_home', 'disarm'],
            codeFormat: 'text',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Arm Home' }));
    fireEvent.change(screen.getByPlaceholderText('Enter alarm code'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Arm Home' }));

    await waitFor(() => expect(armHomeMock).toHaveBeenCalledWith(singleAlarm.id, 'secret'));
    expect(toastErrorMock).toHaveBeenCalledWith('Invalid code');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter alarm code')).not.toBeInTheDocument();
  });

  it('requires confirmation before triggering the alarm remotely', async () => {
    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          {
            ...singleAlarm,
            supportedActions: ['arm_away', 'disarm', 'trigger'],
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Emergency Trigger' }));

    expect(screen.getByText('Trigger this alarm remotely?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trigger alarm' }));

    await waitFor(() => expect(triggerMock).toHaveBeenCalledWith(singleAlarm.id, undefined));
  });

  it('opens the code dialog for trigger when the alarm requires a numeric code', async () => {
    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          {
            ...singleAlarm,
            supportedActions: ['arm_away', 'disarm', 'trigger'],
            codeFormat: 'number',
            requiresCode: true,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Emergency Trigger' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger alarm' }));

    expect(screen.getByRole('heading', { name: 'Emergency Trigger code' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Emergency Trigger' }));

    await waitFor(() => expect(triggerMock).toHaveBeenCalledWith(singleAlarm.id, '123'));
  });

  it('shows a selector when multiple alarms exist', () => {
    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          singleAlarm,
          {
            ...singleAlarm,
            id: 'home_assistant:alarm_control_panel.garage',
            name: 'Garage Alarm',
            state: 'armed_away',
          },
        ]}
      />
    );

    expect(screen.getByLabelText('Alarm selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Garage Alarm' })).toBeInTheDocument();
  });

  it('matches the emergency trigger pill tone to armed alarm cards', () => {
    renderWithProviders(
      <SecurityPanelCard
        alarms={[
          {
            ...singleAlarm,
            state: 'armed_home',
            supportedActions: ['arm_home', 'disarm', 'trigger'],
          },
        ]}
      />
    );

    const emergencyTrigger = screen.getByText('Emergency Trigger');

    expect(emergencyTrigger.className).not.toContain('indigo');
    expect(emergencyTrigger.getAttribute('style')).toContain('border-color');
  });

  it('uses the medium-style horizontal action buttons for large cards', () => {
    renderWithProviders(<SecurityPanelCard alarms={[singleAlarm]} size="large" />);

    expect(screen.getByRole('button', { name: 'Arm Away' }).className).toContain('flex-row');
    expect(screen.getByRole('button', { name: 'Arm Away' }).className).toContain('justify-start');
    expect(screen.getByRole('button', { name: 'Arm Away' }).className).toContain('rounded-full');
  });
});
