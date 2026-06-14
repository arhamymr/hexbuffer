import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import type { ShellInfo } from '@/lib/tauri-types';

let shellInfoCache: { path: string; args: string[] } | null = null;
let shellInfoPromise: Promise<{ path: string; args: string[] }> | null = null;

export async function getShellInfo(): Promise<{ path: string; args: string[] }> {
  if (shellInfoCache) return shellInfoCache;

  if (!shellInfoPromise) {
    shellInfoPromise = invoke<ShellInfo>('get_default_shell').then((info) => ({
      path: info.path,
      args: info.args ?? [],
    }));
  }

  const result = await shellInfoPromise;
  shellInfoCache = result;
  shellInfoPromise = null;
  return result;
}

let homeDirCache: string | null = null;
let homeDirPromise: Promise<string> | null = null;

export async function getHomeDirectory(): Promise<string> {
  if (homeDirCache) return homeDirCache;

  if (!homeDirPromise) {
    homeDirPromise = invoke<string>('get_home_directory').catch(() => {
      return platform() === 'windows' ? 'C:\\' : '/tmp';
    });
  }

  const result = await homeDirPromise;
  homeDirCache = result;
  homeDirPromise = null;
  return result;
}
