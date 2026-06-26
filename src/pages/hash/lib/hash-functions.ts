import CryptoJS from 'crypto-js';
import type { HashType } from '../types';
import { HASH_OPTIONS } from '../constants';

export function computeHash(input: string, activeType: HashType): string {
  if (!input.trim()) return '';

  const option = HASH_OPTIONS.find((opt) => opt.value === activeType);
  if (!option) return '';

  try {
    const hash = CryptoJS[option.cryptoMethod](input);
    return hash.toString();
  } catch {
    return 'Error computing hash';
  }
}
