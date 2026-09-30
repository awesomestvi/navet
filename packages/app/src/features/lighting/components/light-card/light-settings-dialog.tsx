import { BaseCardDialog, type BaseCardDialogTab } from '@navet/app/components/primitives';
import { Button } from '@navet/app/components/primitives/button';
import {
  BrightnessPresetEditor,
  CustomCardTintPicker,
  IconPicker,
} from '@navet/app/components/shared/device-editor';
import { EntityRoomSelector } from '@navet/app/components/shared/entity-room-selector';
import { NEUTRAL_DIALOG_CONTROL_ACCENT } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import type { BrightnessPresetKey } from '@navet/app/features/lighting/stores/light-preset-store';
import { useI18n, useTheme } from '@navet/app/hooks';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import { ArrowLeft, MapPin, MoreHorizontal, Palette, Pencil, Sliders, Star } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import type { LightBrightnessPreset, LightEffectOption } from './light-card-types';
import { LightDialogControls } from './light-dialog-controls';

export interface LightSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  room?: string;
  isOn: boolean;
  onPowerChange: (isOn: boolean) => void;
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsColorControl: boolean;
  minColorTemp: number;
  maxColorTemp: number;
  tempOptions: Array<{ value: number; color: string; label: string }>;
  brightnessPresets: LightBrightnessPreset[];
  currentEffect: string | null;
  effectOptions: LightEffectOption[];
  colorTemp: number;
  selectedColor: string | null;
  customColor: string;
  brightness: number;
  selectedIcon: string;
  tintColor: string;
  supportsEffects: boolean;
  onTempChange: (temp: number) => void;
  onTempCommit?: (temp: number) => void;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
  onEffectSelect: (effect: string) => void;
  onBrightnessChange: (brightness: number) => void;
  /** When set, slider drag uses `onBrightnessChange`; release uses this (matches card + HA). */
  onBrightnessCommit?: (brightness: number) => void;
  applyBrightnessPresetsToAll: boolean;
  onApplyBrightnessPresetsToAllChange: (applyToAll: boolean) => void;
  onBrightnessPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
  onBrightnessPresetOrderChange: (keys: BrightnessPresetKey[]) => void;
  onIconChange: (icon: string) => void;
  onTintColorChange: (color: string) => void;
}

export const LightSettingsDialog = memo(function LightSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  room,
  isOn,
  onPowerChange,
  supportsBrightness,
  supportsColorTemperature,
  supportsColorControl,
  minColorTemp,
  maxColorTemp,
  tempOptions,
  brightnessPresets,
  currentEffect,
  effectOptions,
  colorTemp,
  selectedColor,
  customColor,
  brightness,
  selectedIcon,
  tintColor,
  supportsEffects,
  onTempChange,
  onTempCommit,
  onColorChange,
  onCustomColorChange,
  onEffectSelect,
  onBrightnessChange,
  onBrightnessCommit,
  applyBrightnessPresetsToAll,
  onApplyBrightnessPresetsToAllChange,
  onBrightnessPresetValueChange,
  onBrightnessPresetOrderChange,
  onIconChange,
  onTintColorChange,
}: LightSettingsDialogProps) {
  const { accentColor, theme } = useTheme();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('controls');
  const [titleEditing, setTitleEditing] = useState(false);
  const editTitleAfterMenuClose = useRef(false);
  const surface = getThemeSurfaceTokens(theme);

  const tabs: BaseCardDialogTab[] = [
    {
      key: 'controls',
      label: t('common.controls'),
      icon: Sliders,
      content: (
        <LightDialogControls
          isOn={isOn}
          onPowerChange={onPowerChange}
          brightness={brightness}
          brightnessPresets={brightnessPresets}
          supportsBrightness={supportsBrightness}
          onBrightnessChange={onBrightnessChange}
          onBrightnessCommit={onBrightnessCommit}
          supportsColorTemperature={supportsColorTemperature}
          colorTemp={colorTemp}
          minColorTemp={minColorTemp}
          maxColorTemp={maxColorTemp}
          tempOptions={tempOptions}
          onTempChange={onTempChange}
          onTempCommit={onTempCommit}
          supportsColorControl={supportsColorControl}
          selectedColor={selectedColor}
          customColor={customColor}
          onColorChange={onColorChange}
          onCustomColorChange={onCustomColorChange}
          supportsEffects={supportsEffects}
          currentEffect={currentEffect}
          effectOptions={effectOptions}
          onEffectSelect={onEffectSelect}
        />
      ),
    },
    ...(supportsBrightness
      ? [
          {
            key: 'presets',
            label: t('climate.presets'),
            icon: Star,
            content: (
              <div className="space-y-6">
                <BrightnessPresetEditor
                  surfaceTheme={theme}
                  presets={brightnessPresets}
                  isOn={isOn}
                  onPresetValueChange={onBrightnessPresetValueChange}
                  onPresetOrderChange={onBrightnessPresetOrderChange}
                  onlyApplyToThisLight={!applyBrightnessPresetsToAll}
                  onOnlyApplyToThisLightChange={(checked) =>
                    onApplyBrightnessPresetsToAllChange(!checked)
                  }
                />
              </div>
            ),
          } satisfies BaseCardDialogTab,
        ]
      : []),
    {
      key: 'card',
      label: t('common.customize'),
      icon: Palette,
      content: (
        <div className="space-y-6">
          <CustomCardTintPicker
            surfaceTheme={theme}
            value={tintColor}
            onChange={onTintColorChange}
            isOn={isOn}
          />
          <IconPicker
            surfaceTheme={theme}
            selectedIcon={selectedIcon}
            onIconChange={onIconChange}
            isLightOn={isOn}
          />
        </div>
      ),
    },
  ];

  tabs.push({
    key: 'room',
    label: t('dashboard.roomsWorkspace.editRoom'),
    icon: MapPin,
    content: <EntityRoomSelector entityId={entityId} fallbackRoomName={room} />,
  });
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          iconOnly
          variant="soft"
          label={t('common.moreActions')}
          className="pointer-events-auto h-10 w-10 rounded-full"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onCloseAutoFocus={(event) => {
          if (editTitleAfterMenuClose.current) {
            event.preventDefault();
            editTitleAfterMenuClose.current = false;
            setTitleEditing(true);
          }
        }}
      >
        <DropdownMenuItem onSelect={() => setActiveTab('room')}>
          <MapPin className="h-4 w-4" />
          {t('dashboard.roomsWorkspace.editRoom')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setActiveTab('controls');
            editTitleAfterMenuClose.current = true;
          }}
        >
          <Pencil className="h-4 w-4" />
          {t('entityNameEditor.editCardName')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {supportsBrightness && (
          <DropdownMenuItem onSelect={() => setActiveTab('presets')}>
            <Star className="h-4 w-4" />
            {t('climate.presets')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => setActiveTab('card')}>
          <Palette className="h-4 w-4" />
          {t('common.customize')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="space-y-1 font-normal">
          <span className="block text-xs text-muted-foreground">{t('common.entityId')}</span>
          <code className="block select-text break-all text-xs">
            {getProviderNativeId(entityId)}
          </code>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const dialogTabs = tabs.map((tab) =>
    tab.key === 'controls'
      ? tab
      : {
          ...tab,
          content: (
            <div className="space-y-4">
              <Button
                variant="soft"
                size="compact"
                leading={<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />}
                onClick={() => setActiveTab('controls')}
              >
                {t('lighting.backToControls')}
              </Button>
              {tab.content}
            </div>
          ),
        }
  );

  return (
    <BaseCardDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setActiveTab('controls');
          setTitleEditing(false);
        }
        onOpenChange(open);
      }}
      title={name}
      entityId={entityId}
      headerEyebrow={
        <div
          className={`flex min-w-0 items-center gap-1.5 text-xs font-medium ${surface.textSecondary}`}
        >
          <EntityRoomSelector
            entityId={entityId}
            fallbackRoomName={room}
            readOnly
            className="truncate"
          />
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{t(isOn ? 'common.on' : 'common.off')}</span>
        </div>
      }
      tabs={dialogTabs}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      showTabList={false}
      headerPresentation="compact"
      headerClassName="max-sm:pr-24"
      titleEditing={titleEditing}
      onTitleEditingChange={setTitleEditing}
      headerTrailing={<div className="hidden sm:block">{menu}</div>}
      mobileCoverSheetActions={menu}
      theme={theme}
      tintColor={isOn ? tintColor : NEUTRAL_DIALOG_CONTROL_ACCENT}
      defaultTintAccent={accentColor}
      disableOpenAutoFocus
      maxWidth="md"
      height="capped"
      scrollClassName="max-sm:min-h-0 max-sm:flex-1"
    />
  );
});
