import type { AttackMode, PayloadProcessingStep, PayloadType } from './types';

export const ATTACK_MODES: AttackMode[] = [
  'Sniper',
  'BatteringRam',
  'Pitchfork',
  'ClusterBomb',
];

export const PAYLOAD_TYPES: PayloadType[] = [
  'SimpleList',
  'RuntimeFile',
  'NumberRange',
];

export const PROCESSING_STEPS: Array<{ label: string; value: PayloadProcessingStep }> = [
  { label: 'URL Encode', value: 'UrlEncode' },
  { label: 'URL Decode', value: 'UrlDecode' },
  { label: 'Base64 Encode', value: 'Base64Encode' },
  { label: 'Base64 Decode', value: 'Base64Decode' },
  { label: 'MD5 Hash', value: 'Md5Hash' },
  { label: 'SHA1 Hash', value: 'Sha1Hash' },
  { label: 'SHA256 Hash', value: 'Sha256Hash' },
];
