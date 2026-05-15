export type DecoderType = 'url' | 'base64' | 'hex';
export type HashType = 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'sha3-224' | 'sha3-256' | 'sha3-384' | 'sha3-512' | 'ripemd160';
export type EncoderType = 'url' | 'base64' | 'hex';

export interface DecoderResult {
  input: string;
  output: string;
  type: DecoderType;
  timestamp: number;
}

export interface HashResult {
  input: string;
  output: string;
  type: HashType;
  timestamp: number;
}

export interface EncoderResult {
  input: string;
  output: string;
  type: EncoderType;
  timestamp: number;
}

export interface SubdomainResult {
  subdomain: string;
  fullUrl: string;
  status: 'pending' | 'found' | 'error' | 'timeout';
  statusCode?: number;
  responseTime?: number;
}

export interface SubdomainConfig {
  domain: string;
  wordlist: string[];
  concurrency: number;
  timeout: number;
}

export interface FuzzResult {
  path: string;
  fullUrl: string;
  status: 'pending' | 'found' | 'error' | 'timeout';
  statusCode?: number;
  contentLength?: number;
  responseTime?: number;
}

export interface FuzzConfig {
  url: string;
  wordlist: string[];
  concurrency: number;
  timeout: number;
  followRedirects: boolean;
}