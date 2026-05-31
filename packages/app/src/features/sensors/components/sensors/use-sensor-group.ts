import { useEffect, useState } from 'react';
import type { SensorReading } from './sensor-types';

interface UseSensorGroupProps {
  initialSensors: SensorReading[];
  maxSensors?: number;
}

interface UseSensorGroupReturn {
  selectedSensors: SensorReading[];
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  handleSensorsUpdate: (newSensors: SensorReading[]) => void;
  visibleSensors: SensorReading[];
}

export function useSensorGroup({
  initialSensors,
  maxSensors = 6,
}: UseSensorGroupProps): UseSensorGroupReturn {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<SensorReading[]>(initialSensors);

  useEffect(() => {
    setSelectedSensors(initialSensors);
  }, [initialSensors]);

  const handleSensorsUpdate = (newSensors: SensorReading[]) => {
    setSelectedSensors(newSensors.slice(0, maxSensors));
  };

  const visibleSensors = selectedSensors.slice(0, maxSensors);

  return {
    selectedSensors,
    isSettingsOpen,
    setIsSettingsOpen,
    handleSensorsUpdate,
    visibleSensors,
  };
}
