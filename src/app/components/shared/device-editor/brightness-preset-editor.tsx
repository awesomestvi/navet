import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import type { LucideIcon } from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { memo } from 'react';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import type { BrightnessPresetKey } from '@/app/features/lighting';
import { useI18n } from '@/app/hooks';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface BrightnessPresetEditorItem {
  icon: LucideIcon;
  brightness: number;
  key: BrightnessPresetKey;
  label: string;
}

interface BrightnessPresetEditorProps {
  presets: BrightnessPresetEditorItem[];
  isOn: boolean;
  onPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
  onPresetOrderChange: (keys: BrightnessPresetKey[]) => void;
  onlyApplyToThisLight?: boolean;
  onOnlyApplyToThisLightChange?: (checked: boolean) => void;
}

export const BrightnessPresetEditor = memo(function BrightnessPresetEditor({
  presets,
  isOn,
  onPresetValueChange,
  onPresetOrderChange,
  onlyApplyToThisLight = false,
  onOnlyApplyToThisLightChange,
}: BrightnessPresetEditorProps) {
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);
  const { t } = useI18n();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = presets.findIndex((preset) => preset.key === active.id);
    const newIndex = presets.findIndex((preset) => preset.key === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onPresetOrderChange(
      arrayMove(
        presets.map((preset) => preset.key),
        oldIndex,
        newIndex
      )
    );
  };

  return (
    <div>
      <div className="mb-4">
        <span
          className={`text-sm font-medium transition-colors duration-500 ${editorSurface.sectionLabelClassName}`}
        >
          {t('lighting.editBrightnessPresets')}
        </span>
      </div>

      {onOnlyApplyToThisLightChange ? (
        <div
          className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${editorSurface.settingPanelClassName}`}
        >
          <Checkbox
            id="brightness-preset-scope"
            checked={onlyApplyToThisLight}
            onCheckedChange={(checked) => onOnlyApplyToThisLightChange(checked === true)}
            aria-label={t('lighting.onlyApplyToThisLight')}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <Label
              htmlFor="brightness-preset-scope"
              className={`text-sm ${editorSurface.settingLabelClassName}`}
            >
              {t('lighting.onlyApplyToThisLight')}
            </Label>
            <p className={`mt-1 text-xs ${editorSurface.settingDescriptionClassName}`}>
              {t('lighting.applyToAllLightsDescription')}
            </p>
          </div>
        </div>
      ) : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={presets.map((preset) => preset.key)} strategy={rectSortingStrategy}>
          <div className="space-y-3">
            {presets.map((preset) => (
              <BrightnessPresetEditorRow
                key={preset.key}
                preset={preset}
                isOn={isOn}
                onPresetValueChange={onPresetValueChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});

interface BrightnessPresetEditorRowProps {
  preset: BrightnessPresetEditorItem;
  isOn: boolean;
  onPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
}

const BrightnessPresetEditorRow = memo(function BrightnessPresetEditorRow({
  preset,
  isOn,
  onPresetValueChange,
}: BrightnessPresetEditorRowProps) {
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: preset.key,
  });
  const IconComponent = preset.icon;

  return (
    <div
      ref={setNodeRef}
      style={getDndTransformStyle(transform, transition)}
      className="flex items-center gap-3"
    >
      <button
        type="button"
        aria-label={t('lighting.reorderPreset', { preset: preset.label })}
        className={`flex h-9 w-5 touch-none items-center justify-center rounded-md transition-colors ${editorSurface.dragHandleClassName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${editorSurface.iconChipClassName}`}
        >
          <IconComponent className={`h-4 w-4 ${editorSurface.iconClassName}`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-medium ${editorSurface.titleClassName}`}>
            {preset.label}
          </div>
        </div>
      </div>
      <label className="sr-only" htmlFor={`brightness-preset-${preset.key}`}>
        {t('lighting.brightnessPresetField', { preset: preset.label })}
      </label>
      <input
        id={`brightness-preset-${preset.key}`}
        type="number"
        min={1}
        max={100}
        step={1}
        value={preset.brightness}
        onChange={(e) => {
          const nextValue = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(nextValue)) {
            onPresetValueChange(preset.key, nextValue);
          }
        }}
        className={`w-20 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${editorSurface.inputClassName}`}
      />
      <span className={`text-xs ${editorSurface.suffixClassName}`}>%</span>
    </div>
  );
});
