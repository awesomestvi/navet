export interface OpenHABItemStateDescription {
  pattern?: string;
  readOnly?: boolean;
  options?: Array<{
    value?: string;
    label?: string;
  }>;
}

export interface OpenHABItem {
  name: string;
  type?: string;
  label?: string;
  category?: string | null;
  state?: string;
  tags?: string[];
  groupNames?: string[];
  stateDescription?: OpenHABItemStateDescription;
  editable?: boolean;
}

export interface OpenHABSnapshot {
  connected: boolean;
  items: Record<string, OpenHABItem>;
}
