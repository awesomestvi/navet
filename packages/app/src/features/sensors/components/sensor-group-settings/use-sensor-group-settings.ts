import { useCallback, useRef, useState } from 'react';
import type { SensorReading } from '../sensors';
import { AVAILABLE_SENSORS } from './data';
import type { AvailableSensor, SensorGroupSettingsDialogProps } from './types';

export function useSensorGroupSettings({
  availableSensors = AVAILABLE_SENSORS,
  currentSensors,
  maxSensors,
  onClose,
  onSensorsUpdate,
  closeOnSelect = false,
}: Pick<
  SensorGroupSettingsDialogProps,
  | 'availableSensors'
  | 'currentSensors'
  | 'maxSensors'
  | 'onClose'
  | 'onSensorsUpdate'
  | 'closeOnSelect'
>) {
  const [selectedSensors, setSelectedSensors] = useState<SensorReading[]>(currentSensors);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredSensors = availableSensors.filter((sensor) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return true;
    }
    return (
      sensor.label.toLowerCase().includes(query) ||
      sensor.category.toLowerCase().includes(query) ||
      sensor.unit.toLowerCase().includes(query) ||
      sensor.id.toLowerCase().includes(query) ||
      (sensor.room?.toLowerCase().includes(query) ?? false)
    );
  });

  const isSensorSelected = useCallback(
    (sensorId: string) => selectedSensors.some((sensor) => sensor.id === sensorId),
    [selectedSensors]
  );

  const handleAddSensor = useCallback(
    (sensor: AvailableSensor) => {
      const alreadySelected = selectedSensors.some((current) => current.id === sensor.id);
      if (alreadySelected) {
        return;
      }

      if (selectedSensors.length >= maxSensors && maxSensors !== 1) {
        return;
      }

      const nextSensor = {
        id: sensor.id,
        label: sensor.label,
        value: sensor.value,
        unit: sensor.unit,
        icon: sensor.icon,
      };
      const nextSensors = maxSensors === 1 ? [nextSensor] : [...selectedSensors, nextSensor];

      setSelectedSensors(nextSensors);
      onSensorsUpdate(nextSensors);
      setSearchQuery('');
      setHighlightedIndex(-1);
      if (closeOnSelect) {
        onClose();
        return;
      }
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [closeOnSelect, maxSensors, onClose, onSensorsUpdate, selectedSensors]
  );

  const handleRemoveSensor = useCallback(
    (sensorId: string) => {
      const nextSensors = selectedSensors.filter((sensor) => sensor.id !== sensorId);
      setSelectedSensors(nextSensors);
      onSensorsUpdate(nextSensors);
    },
    [onSensorsUpdate, selectedSensors]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    filteredSensors,
    handleAddSensor,
    handleCancel,
    handleRemoveSensor,
    handleSave,
    highlightedIndex,
    inputRef,
    isSensorSelected,
    searchQuery,
    selectedSensors,
    setHighlightedIndex,
    setSearchQuery,
  };
}
