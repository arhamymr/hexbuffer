import type { AutomationNodeType, NodeCategory } from '../types';

export interface AutomationNodeCapability {
  supported: boolean;
  reason: string | null;
}

export interface DataSchemaField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
}

export interface NodeDataSchema {
  input: DataSchemaField[];
  output: DataSchemaField[];
}

export interface NodeProfile {
  type: AutomationNodeType;
  category: NodeCategory;
  wired: boolean;
  reason: string | null;
  sourceHandleIds: string[];
  sourceHandleLabels: Record<string, string>;
  targetHandleRequired: boolean;
  dataSchema: NodeDataSchema;
}
