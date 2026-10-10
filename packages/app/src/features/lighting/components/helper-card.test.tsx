import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelperCard, HelperValueControl } from './helper-card';

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock('@navet/app/commands', () => ({ dispatchEntityCommand: dispatch }));

describe('helper controls', () => {
  beforeEach(async () => {
    await resetAppStores();
    dispatch.mockReset().mockResolvedValue({ accepted: true, requiresEventConfirmation: true });
  });
  it('sends a bounded number to its owning adapter and keeps the live value while pending', async () => {
    renderWithProviders(
      <HelperValueControl
        id="home_assistant:number.target"
        name="Target"
        providerId="home_assistant"
        helper={{
          helperType: 'number',
          value: 21,
          writable: true,
          min: 15,
          max: 30,
          step: 0.5,
          unit: '°C',
        }}
      />
    );
    const field = screen.getByRole('spinbutton', { name: 'Target' });
    expect(field).toHaveAttribute('min', '15');
    expect(field).toHaveAttribute('max', '30');
    expect(field).toHaveAttribute('step', '0.5');
    fireEvent.change(field, { target: { value: '22.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        { type: 'set_number_value', entityId: 'home_assistant:number.target', value: 22.5 },
        'home_assistant'
      )
    );
    expect(screen.getByText('Updating…')).toBeInTheDocument();
    expect(field).toBeDisabled();
  });
  it('shows rejected writes and lets the household retry', async () => {
    dispatch.mockResolvedValue({ accepted: false, requiresEventConfirmation: false });
    renderWithProviders(
      <HelperValueControl
        id="text.note"
        name="Note"
        helper={{
          helperType: 'text',
          value: 'Home',
          writable: true,
          mode: 'text',
          minLength: 0,
          maxLength: 20,
        }}
      />
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), { target: { value: 'Away' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update the value. Try again.'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
  it('refreshes options and prevents submitting a removed choice', () => {
    const helper = {
      helperType: 'select' as const,
      value: 'Home',
      writable: true,
      options: ['Home', 'Away'],
    };
    const { rerender } = renderWithProviders(
      <HelperValueControl id="select.mode" name="Mode" helper={helper} />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Away' } });
    rerender(
      <HelperValueControl id="select.mode" name="Mode" helper={{ ...helper, options: ['Home'] }} />
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('Choose an available option')).toBeInTheDocument();
  });
  it('uses backend wall-clock date/time without a timezone conversion', async () => {
    renderWithProviders(
      <HelperValueControl
        id="input_datetime.start"
        name="Start"
        helper={{ helperType: 'datetime', value: '2026-10-10 07:30:00', writable: true }}
      />
    );
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2026-10-11T08:45:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        {
          type: 'set_datetime_value',
          entityId: 'input_datetime.start',
          value: '2026-10-11 08:45:00',
        },
        undefined
      )
    );
  });
  it('disables unavailable and read-only fields', () => {
    renderWithProviders(
      <HelperValueControl
        id="number.target"
        name="Target"
        unavailable
        helper={{ helperType: 'number', value: 21, writable: true, min: 15, max: 30, step: 1 }}
      />
    );
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
  it('opens the controls and keeps password values private', () => {
    renderWithProviders(
      <HelperCard
        id="text.password"
        name="Password"
        size="tiny"
        isEditMode={false}
        helper={{
          helperType: 'text',
          value: 'secret',
          writable: true,
          mode: 'password',
          minLength: 0,
          maxLength: 100,
        }}
      />
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute(
      'type',
      'password'
    );
  });
  it('preserves a dirty draft when realtime value changes', () => {
    const helper = {
      helperType: 'number' as const,
      value: 21,
      writable: true,
      min: 15,
      max: 30,
      step: 1,
    };
    const { rerender } = renderWithProviders(
      <HelperValueControl id="number.target" name="Target" helper={helper} />
    );
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '23' } });
    rerender(
      <HelperValueControl id="number.target" name="Target" helper={{ ...helper, value: 22 }} />
    );
    expect(screen.getByRole('spinbutton')).toHaveValue(23);
  });
  it('confirms semantically equal numeric provider updates', async () => {
    const helper = {
      helperType: 'number' as const,
      value: 21,
      writable: true,
      min: 15,
      max: 30,
      step: 0.5,
    };
    const { rerender } = renderWithProviders(
      <HelperValueControl id="number.target" name="Target" helper={helper} />
    );
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '22.0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    rerender(
      <HelperValueControl id="number.target" name="Target" helper={{ ...helper, value: 22 }} />
    );
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeEnabled();
  });
  it('confirms a time update when the provider includes seconds', async () => {
    const helper = { helperType: 'time' as const, value: '07:30:00', writable: true };
    const { rerender } = renderWithProviders(
      <HelperValueControl id="time.start" name="Start" helper={helper} />
    );
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '08:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        { type: 'set_datetime_value', entityId: 'time.start', value: '08:30:00' },
        undefined
      )
    );
    rerender(
      <HelperValueControl id="time.start" name="Start" helper={{ ...helper, value: '08:30:00' }} />
    );
    expect(screen.queryByText('Updating…')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Start')).toBeEnabled();
  });
  it('counts Unicode characters like the provider and rejects overlength text', async () => {
    dispatch.mockResolvedValue({ accepted: true, requiresEventConfirmation: false });
    renderWithProviders(
      <HelperValueControl
        id="text.note"
        name="Note"
        helper={{
          helperType: 'text',
          value: '',
          writable: true,
          mode: 'text',
          minLength: 0,
          maxLength: 4,
        }}
      />
    );
    const field = screen.getByRole('textbox', { name: 'Note' });
    fireEvent.change(field, { target: { value: '😀😀😀😀' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        { type: 'set_text_value', entityId: 'text.note', value: '😀😀😀😀' },
        undefined
      )
    );
    fireEvent.change(field, { target: { value: '😀😀😀😀😀' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Use 0–4 characters.')).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
