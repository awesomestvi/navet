export interface OpenHABItemStateDescription {
  pattern?: string;
  readOnly?: boolean;
  options?: Array<{
    value?: string;
    label?: string;
  }>;
}

export interface OpenHABSemanticsMetadata {
  value?: string;
  config?: {
    hasLocation?: string;
    isPointOf?: string;
    relatesTo?: string;
    isPartOf?: string;
  };
  editable?: boolean;
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
  metadata?: {
    semantics?: OpenHABSemanticsMetadata;
  };
  editable?: boolean;
}

export interface OpenHABSnapshot {
  connected: boolean;
  items: Record<string, OpenHABItem>;
  reconnecting?: boolean;
  error?: string | null;
}
