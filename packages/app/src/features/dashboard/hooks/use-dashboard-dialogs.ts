import { useState } from 'react';

export interface DashboardDialogs {
  showAddCardDialog: boolean;
  showAddEntityDialog: boolean;
  addCardTargetSectionId: string | null;
  onOpenAddCardDialog: (targetSectionId?: string) => void;
  onCloseAddCardDialog: () => void;
  onOpenAddEntityDialog: () => void;
  onCloseAddEntityDialog: () => void;
}

export function useDashboardDialogs(): DashboardDialogs {
  const [showAddCardDialog, setShowAddCardDialog] = useState(false);
  const [showAddEntityDialog, setShowAddEntityDialog] = useState(false);
  const [addCardTargetSectionId, setAddCardTargetSectionId] = useState<string | null>(null);

  return {
    showAddCardDialog,
    showAddEntityDialog,
    addCardTargetSectionId,
    onOpenAddCardDialog: (targetSectionId) => {
      setAddCardTargetSectionId(targetSectionId ?? null);
      setShowAddCardDialog(true);
    },
    onCloseAddCardDialog: () => {
      setShowAddCardDialog(false);
      setAddCardTargetSectionId(null);
    },
    onOpenAddEntityDialog: () => setShowAddEntityDialog(true),
    onCloseAddEntityDialog: () => setShowAddEntityDialog(false),
  };
}
