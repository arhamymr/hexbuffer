import type { ConditionConfig, ConditionType } from '../types';

const DEFAULT_DATA_PATH_BY_CONDITION: Record<ConditionType, string> = {
  'condition:status-code': 'statusCode',
  'condition:url-contains': 'url',
  'condition:body-contains': 'body',
  'condition:header-exists': 'headers',
  'condition:severity': 'severity',
  'condition:ai-confidence': 'confidence',
  'condition:method': 'method',
  'condition:content-type': 'headers.content-type',
  'condition:response-size': 'body',
  'condition:crawl-status': 'status',
  'condition:grep-match': 'body',
  'condition:port-open': 'ports',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePathSegment(segment: string): string {
  return segment.trim().toLowerCase();
}

function getObjectValue(source: Record<string, unknown>, segment: string): unknown {
  if (segment in source) return source[segment];

  const normalizedSegment = normalizePathSegment(segment);
  const matchingKey = Object.keys(source).find(
    (key) => normalizePathSegment(key) === normalizedSegment
  );
  return matchingKey ? source[matchingKey] : undefined;
}

export function defaultDataPathForCondition(type: ConditionType): string {
  return DEFAULT_DATA_PATH_BY_CONDITION[type] ?? '';
}

export function resolveJsonPath(source: unknown, path: string): unknown {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.reduce<unknown>((current, segment) => {
    if (current == null) return undefined;

    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (isRecord(current)) {
      return getObjectValue(current, segment);
    }

    return undefined;
  }, source);
}

function valueToComparableString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function valueToNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.trim());
  if (Array.isArray(value)) return value.length;
  return Number.NaN;
}

function compareScalar(
  actual: unknown,
  operator: ConditionConfig['operator'],
  expected: string
): boolean {
  const actualString = valueToComparableString(actual);

  switch (operator) {
    case 'equals':
      return actualString.toLowerCase() === expected.toLowerCase();
    case 'not_equals':
      return actualString.toLowerCase() !== expected.toLowerCase();
    case 'contains':
      return actualString.toLowerCase().includes(expected.toLowerCase());
    case 'gt':
      return valueToNumber(actual) > Number(expected);
    case 'lt':
      return valueToNumber(actual) < Number(expected);
    case 'regex':
      try {
        return new RegExp(expected, 'i').test(actualString);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function normalizeConditionActual(config: ConditionConfig, actual: unknown): unknown {
  if (config.conditionType !== 'condition:response-size') return actual;
  if (typeof actual === 'string') return actual.length;
  if (Array.isArray(actual)) return actual.length;
  if (isRecord(actual)) return JSON.stringify(actual).length;
  return actual;
}

export interface ConditionEvaluationResult {
  dataPath: string;
  actual: unknown;
  expected: string;
  match: boolean;
}

export function evaluateCondition(
  config: ConditionConfig,
  inputData: unknown
): ConditionEvaluationResult {
  const dataPath = config.dataPath?.trim() || defaultDataPathForCondition(config.conditionType);
  const resolvedActual = resolveJsonPath(inputData, dataPath);
  const actual = normalizeConditionActual(config, resolvedActual);
  const expected = config.value ?? '';

  if (config.conditionType === 'condition:header-exists') {
    const headers = isRecord(actual) ? actual : {};
    const expectedHeader = expected.trim().toLowerCase();
    const match = Object.keys(headers).some((key) => key.toLowerCase() === expectedHeader);
    return { dataPath, actual, expected, match };
  }

  if (Array.isArray(actual)) {
    const match = actual.some((item) => compareScalar(item, config.operator, expected));
    return { dataPath, actual, expected, match };
  }

  const match = compareScalar(actual, config.operator, expected);
  return { dataPath, actual, expected, match };
}
