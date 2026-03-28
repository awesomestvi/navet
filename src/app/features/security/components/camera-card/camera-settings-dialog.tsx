import type { HassEntity } from 'home-assistant-js-websocket';
import { memo, useCallback } from 'react';
import {
  CustomScrollbar,
  DialogHeader,
  DialogSectionRow,
} from '@/app/components/shared/device-editor';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

export interface SiblingEntity {
  id: string;
  entity: HassEntity;
}

interface CameraSettingsDialogProps {
  entityId: string;
  name: string;
  room: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  siblingEntities: SiblingEntity[];
}

function getDisplayName(entityId: string, entity: HassEntity): string {
  const friendly = entity.attributes?.friendly_name as string | undefined;
  if (friendly) return friendly;
  // Derive from entity_id: strip domain prefix, replace underscores
  const withoutDomain = entityId.replace(/^[^.]+\./, '');
  return withoutDomain.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function SwitchRow({ entityId, label, isOn }: { entityId: string; label: string; isOn: boolean }) {
  const handleToggle = useCallback(async () => {
    await homeAssistantService.callService(
      'switch',
      isOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: entityId }
    );
  }, [entityId, isOn]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
    >
      <span className="text-sm text-white/80">{label}</span>
      <div
        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
          isOn ? 'bg-blue-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            isOn ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

function SelectRow({
  entityId,
  label,
  current,
  options,
}: {
  entityId: string;
  label: string;
  current: string;
  options: string[];
}) {
  const handleSelect = useCallback(
    async (option: string) => {
      await homeAssistantService.callService(
        'select',
        'select_option',
        { option },
        { entity_id: entityId }
      );
    },
    [entityId]
  );

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-white/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleSelect(option)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              option === current
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberRow({
  entityId,
  label,
  value,
  min,
  max,
  step,
}: {
  entityId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
}) {
  const handleChange = useCallback(
    async (newValue: number) => {
      await homeAssistantService.callService(
        'number',
        'set_value',
        { value: newValue },
        { entity_id: entityId }
      );
    },
    [entityId]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-white/50">{label}</p>
        <span className="text-xs font-semibold text-white">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        onMouseUp={(e) => handleChange(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => handleChange(Number((e.target as HTMLInputElement).value))}
        className="h-1.5 w-full cursor-pointer accent-blue-500"
      />
    </div>
  );
}

export const CameraSettingsDialog = memo(function CameraSettingsDialog({
  entityId,
  name,
  room,
  isOpen,
  onOpenChange,
  siblingEntities,
}: CameraSettingsDialogProps) {
  const { t } = useI18n();

  const switches = siblingEntities.filter((s) => s.id.startsWith('switch.'));
  const selects = siblingEntities.filter((s) => s.id.startsWith('select.'));
  const numbers = siblingEntities.filter((s) => s.id.startsWith('number.'));
  const hasControls = switches.length > 0 || selects.length > 0 || numbers.length > 0;

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName="bg-black/80 backdrop-blur-sm animate-in fade-in"
      contentClassName="fixed left-1/2 top-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200"
    >
      <CustomScrollbar isOn>
        <div className="p-6">
          {/* Header */}
          <DialogHeader title={t('camera.settings.title')} description={`${name} · ${room}`} isOn />
          <DialogSectionRow label={t('camera.settings.room')}>
            <EntityRoomSelector entityId={entityId} label={t('camera.settings.room')} compact />
          </DialogSectionRow>

          {hasControls ? (
            <div className="space-y-6">
              {/* Switches */}
              {switches.length > 0 && (
                <div className="space-y-2">
                  {switches.map(({ id, entity }) => (
                    <SwitchRow
                      key={id}
                      entityId={id}
                      label={getDisplayName(id, entity)}
                      isOn={entity.state === 'on'}
                    />
                  ))}
                </div>
              )}

              {/* Selects */}
              {selects.length > 0 && (
                <div className="space-y-4">
                  {selects.map(({ id, entity }) => {
                    const attrs = entity.attributes as Record<string, unknown>;
                    const options = Array.isArray(attrs?.options)
                      ? (attrs.options as string[])
                      : [];
                    return (
                      <SelectRow
                        key={id}
                        entityId={id}
                        label={getDisplayName(id, entity)}
                        current={entity.state}
                        options={options}
                      />
                    );
                  })}
                </div>
              )}

              {/* Numbers */}
              {numbers.length > 0 && (
                <div className="space-y-4">
                  {numbers.map(({ id, entity }) => {
                    const attrs = entity.attributes as Record<string, unknown>;
                    return (
                      <NumberRow
                        key={id}
                        entityId={id}
                        label={getDisplayName(id, entity)}
                        value={Number(entity.state)}
                        min={Number(attrs?.min ?? 0)}
                        max={Number(attrs?.max ?? 100)}
                        step={Number(attrs?.step ?? 1)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-white/40">{t('camera.settings.noControls')}</p>
          )}
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});
