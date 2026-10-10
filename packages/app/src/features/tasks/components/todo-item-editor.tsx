import { Button, Input, Select } from '@navet/app/components/primitives';
import { BaseCardDialog } from '@navet/app/components/primitives/Cards/BaseCardDialog';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { NavetTodoItem, NavetTodoItemInput, NavetTodoList } from '@navet/core/todo-types';
import { ListChecks } from 'lucide-react';
import { useId, useState } from 'react';

function localDateTime(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}

export function TodoItemEditor({
  list,
  item,
  pending,
  error,
  onSave,
  onClose,
}: {
  list: NavetTodoList;
  item?: NavetTodoItem;
  pending: boolean;
  error: boolean;
  onSave: (input: NavetTodoItemInput) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const prefix = useId();
  const [summary, setSummary] = useState(item?.summary ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const initialDueType =
    item?.dueDateTime && list.capabilities.dueDateTime
      ? 'datetime'
      : item?.dueDate && list.capabilities.dueDate
        ? 'date'
        : 'none';
  const [dueType, setDueType] = useState(initialDueType);
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [dueDateTime, setDueDateTime] = useState(localDateTime(item?.dueDateTime));
  const disabled =
    pending || !list.available || !(item ? list.capabilities.update : list.capabilities.add);
  const title = item ? t('todo.editItem') : t('todo.addItem');
  return (
    <BaseCardDialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={title}
      theme={theme}
      tabs={[
        {
          key: 'details',
          label: t('todo.details'),
          icon: ListChecks,
          content: (
            <form
              className={`space-y-4 ${surface.textPrimary}`}
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                if (disabled || !summary.trim()) return;
                const input: NavetTodoItemInput = { summary: summary.trim() };
                if (list.capabilities.description && description !== (item?.description ?? ''))
                  input.description = description || null;
                if (
                  dueType === 'date' &&
                  list.capabilities.dueDate &&
                  (initialDueType !== 'date' || dueDate !== item?.dueDate)
                )
                  input.dueDate = dueDate;
                else if (
                  dueType === 'datetime' &&
                  list.capabilities.dueDateTime &&
                  (initialDueType !== 'datetime' ||
                    dueDateTime !== localDateTime(item?.dueDateTime))
                ) {
                  const due = new Date(dueDateTime);
                  if (!Number.isFinite(due.getTime())) return;
                  input.dueDateTime = due.toISOString();
                } else if (dueType === 'none' && item?.dueDate && list.capabilities.dueDate)
                  input.dueDate = null;
                else if (dueType === 'none' && item?.dueDateTime && list.capabilities.dueDateTime)
                  input.dueDateTime = null;
                onSave(input);
              }}
            >
              <label className="block space-y-1 text-sm" htmlFor={`${prefix}-summary`}>
                <span>{t('todo.itemName')}</span>
                <Input
                  id={`${prefix}-summary`}
                  required
                  disabled={disabled}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
              {list.capabilities.description ? (
                <label className="block space-y-1 text-sm" htmlFor={`${prefix}-description`}>
                  <span>{t('todo.description')}</span>
                  <Input
                    id={`${prefix}-description`}
                    disabled={disabled}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              ) : null}
              {list.capabilities.dueDate || list.capabilities.dueDateTime ? (
                <div className="space-y-3">
                  <label className="block space-y-1 text-sm" htmlFor={`${prefix}-due-type`}>
                    <span>{t('todo.due')}</span>
                    <Select
                      id={`${prefix}-due-type`}
                      disabled={disabled}
                      value={dueType}
                      onChange={(event) => setDueType(event.target.value)}
                    >
                      <option value="none">{t('todo.noDue')}</option>
                      {list.capabilities.dueDate ? (
                        <option value="date">{t('todo.dueDate')}</option>
                      ) : null}
                      {list.capabilities.dueDateTime ? (
                        <option value="datetime">{t('todo.dueDateTime')}</option>
                      ) : null}
                    </Select>
                  </label>
                  {dueType === 'date' && list.capabilities.dueDate ? (
                    <label className="block space-y-1 text-sm" htmlFor={`${prefix}-due-date`}>
                      <span>{t('todo.dueDate')}</span>
                      <Input
                        id={`${prefix}-due-date`}
                        type="date"
                        style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }}
                        required
                        disabled={disabled}
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                      />
                    </label>
                  ) : null}
                  {dueType === 'datetime' && list.capabilities.dueDateTime ? (
                    <label className="block space-y-1 text-sm" htmlFor={`${prefix}-due-time`}>
                      <span>{t('todo.dueDateTime')}</span>
                      <Input
                        id={`${prefix}-due-time`}
                        type="datetime-local"
                        style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }}
                        step={1}
                        required
                        disabled={disabled}
                        value={dueDateTime}
                        onChange={(event) => setDueDateTime(event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm">
                  {t('todo.saveFailed')}
                </p>
              ) : null}
              {!list.available ? <p role="status">{t('todo.unavailable')}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={disabled || !summary.trim()} loading={pending}>
                  {item ? t('common.save') : t('todo.addItem')}
                </Button>
              </div>
            </form>
          ),
        },
      ]}
    />
  );
}
