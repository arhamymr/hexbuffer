import type { HashType } from './types';

export const HASH_OPTIONS: { value: HashType; label: string; cryptoMethod: string }[] = [
  { value: 'md5', label: 'MD5', cryptoMethod: 'MD5' },
  { value: 'sha1', label: 'SHA-1', cryptoMethod: 'SHA1' },
  { value: 'sha224', label: 'SHA-224', cryptoMethod: 'SHA224' },
  { value: 'sha256', label: 'SHA-256', cryptoMethod: 'SHA256' },
  { value: 'sha384', label: 'SHA-384', cryptoMethod: 'SHA384' },
  { value: 'sha512', label: 'SHA-512', cryptoMethod: 'SHA512' },
  { value: 'sha3-224', label: 'SHA3-224', cryptoMethod: 'SHA3_224' },
  { value: 'sha3-256', label: 'SHA3-256', cryptoMethod: 'SHA3_256' },
  { value: 'sha3-384', label: 'SHA3-384', cryptoMethod: 'SHA3_384' },
  { value: 'sha3-512', label: 'SHA3-512', cryptoMethod: 'SHA3_512' },
  { value: 'ripemd160', label: 'RIPEMD-160', cryptoMethod: 'RIPEMD160' },
];
