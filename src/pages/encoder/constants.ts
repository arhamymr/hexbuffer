import type { CodecType, CodecMode } from './types';

export const CODEC_LABELS: Record<CodecType, string> = {
  url: 'URL',
  base64: 'Base64',
  hex: 'Hex',
};

export const MODE_LABELS: Record<CodecMode, { source: string; target: string; action: string }> = {
  encode: {
    source: 'Plain text',
    target: 'Encoded',
    action: 'Encode',
  },
  decode: {
    source: 'Encoded',
    target: 'Plain text',
    action: 'Decode',
  },
};
