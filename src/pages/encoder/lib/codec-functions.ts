import CryptoJS from 'crypto-js';
import type { CodecType, CodecResult } from '../types';

export const encoderFunctions: Record<CodecType, (input: string) => string> = {
  url: (input) => encodeURIComponent(input),
  base64: (input) => CryptoJS.enc.Utf8.parse(input).toString(CryptoJS.enc.Base64),
  hex: (input) => CryptoJS.enc.Utf8.parse(input).toString(CryptoJS.enc.Hex),
};

export const decoderFunctions: Record<CodecType, (input: string) => CodecResult> = {
  url: (input) => {
    try {
      return { output: decodeURIComponent(input), error: null };
    } catch {
      return { output: '', error: 'Invalid URL-encoded string' };
    }
  },
  base64: (input) => {
    try {
      const output = CryptoJS.enc.Base64.parse(input).toString(CryptoJS.enc.Utf8);
      return output
        ? { output, error: null }
        : { output: '', error: 'Invalid Base64 string' };
    } catch {
      return { output: '', error: 'Invalid Base64 string' };
    }
  },
  hex: (input) => {
    try {
      const hex = input.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
        return { output: '', error: 'Invalid hex string' };
      }
      return { output: CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Utf8), error: null };
    } catch {
      return { output: '', error: 'Invalid hex string' };
    }
  },
};

export function convert(input: string, activeType: CodecType, mode: 'encode' | 'decode'): CodecResult {
  if (!input.trim()) {
    return { output: '', error: null };
  }

  if (mode === 'encode') {
    try {
      return { output: encoderFunctions[activeType](input), error: null };
    } catch {
      return { output: '', error: 'Encoding failed' };
    }
  }

  return decoderFunctions[activeType](input);
}
