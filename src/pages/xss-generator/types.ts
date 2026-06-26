export type XssPayloadCategory = 'reflected' | 'dom-based' | 'polyglot' | 'filter-bypass' | 'context-specific';

export type XssEncodingType = 'url' | 'html-entity' | 'base64' | 'double-url' | 'unicode-escape';

export interface XssPayload {
  id: string;
  category: XssPayloadCategory;
  label: string;
  payload: string;
}
