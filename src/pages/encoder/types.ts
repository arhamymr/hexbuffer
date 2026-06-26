export type CodecType = 'url' | 'base64' | 'hex';

export type CodecMode = 'encode' | 'decode';

export interface CodecResult {
  output: string;
  error: string | null;
}
