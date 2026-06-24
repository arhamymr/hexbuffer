import type { DataSchemaField } from './node-capability-types';

/** Standard HTTP/traffic context that flows through trigger → condition → action. */
export const HTTP_CONTEXT_INPUT: DataSchemaField[] = [
  { key: 'url', label: 'URL', type: 'string', description: 'Full request URL' },
  { key: 'method', label: 'Method', type: 'string', description: 'HTTP method (GET, POST, …)' },
  { key: 'statusCode', label: 'Status Code', type: 'number', description: 'HTTP response status' },
  { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
  { key: 'headers', label: 'Headers', type: 'object', description: 'Request / response headers' },
  { key: 'body', label: 'Body', type: 'string', description: 'Response body content' },
  { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the event occurred' },
];

/** Condition nodes add evaluation fields to the output. */
export const CONDITION_OUTPUT: DataSchemaField[] = [
  ...HTTP_CONTEXT_INPUT,
  { key: 'match', label: 'Match', type: 'boolean', description: 'Whether the condition evaluated to true' },
  { key: 'conditionMatch', label: 'Condition Match', type: 'boolean', description: 'Whether the condition evaluated to true' },
  { key: 'conditionDataPath', label: 'Condition Data Path', type: 'string', description: 'Input path used for evaluation' },
  { key: 'conditionActual', label: 'Condition Actual', type: 'string', description: 'Resolved input value used for evaluation' },
  { key: 'conditionOperator', label: 'Condition Operator', type: 'string', description: 'Comparison operator used for evaluation' },
  { key: 'conditionExpected', label: 'Condition Expected', type: 'string', description: 'Expected comparison value' },
  { key: 'condition', label: 'Condition Detail', type: 'object', description: 'Structured condition evaluation details' },
];

/** Action nodes pass through the HTTP context and may add result fields. */
export const ACTION_OUTPUT_BASE: DataSchemaField[] = [
  ...HTTP_CONTEXT_INPUT,
];

/** Empty schema for nodes with no input (triggers). */
export const NO_INPUT: DataSchemaField[] = [];

/** Empty schema for nodes with no / manual-only output. */
export const NO_OUTPUT: DataSchemaField[] = [];
