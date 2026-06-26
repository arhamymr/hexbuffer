import type { XssEncodingType } from '../types';

export function applyUrlEncode(str: string): string {
  return encodeURIComponent(str);
}

export function applyHtmlEntityEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function applyBase64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function applyDoubleUrlEncode(str: string): string {
  return encodeURIComponent(encodeURIComponent(str));
}

export function applyUnicodeEscape(str: string): string {
  return Array.from(str)
    .map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
}

export const ENCODING_FUNCTIONS: Record<XssEncodingType, (s: string) => string> = {
  url: applyUrlEncode,
  'html-entity': applyHtmlEntityEncode,
  base64: applyBase64Encode,
  'double-url': applyDoubleUrlEncode,
  'unicode-escape': applyUnicodeEscape,
};
