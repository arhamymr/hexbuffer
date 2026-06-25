import { invoke } from '@tauri-apps/api/core';
import type { GitStatusResult } from './git-types';

export async function gitInit(repoPath: string): Promise<void> {
  return invoke('git_init', { repoPath });
}

export async function gitStatus(repoPath: string): Promise<GitStatusResult> {
  return invoke<GitStatusResult>('git_status', { repoPath });
}

export async function gitStageFile(repoPath: string, filePath: string): Promise<void> {
  return invoke('git_stage_file', { repoPath, filePath });
}

export async function gitUnstageFile(repoPath: string, filePath: string): Promise<void> {
  return invoke('git_unstage_file', { repoPath, filePath });
}

export async function gitCommit(repoPath: string, message: string): Promise<void> {
  return invoke('git_commit', { repoPath, message });
}

export async function gitGetBranches(repoPath: string): Promise<string[]> {
  return invoke<string[]>('git_get_branches', { repoPath });
}

export async function gitSwitchBranch(repoPath: string, branch: string): Promise<void> {
  return invoke('git_switch_branch', { repoPath, branch });
}

export async function gitCreateBranch(repoPath: string, branch: string): Promise<void> {
  return invoke('git_create_branch', { repoPath, branch });
}

export async function gitGetOriginalContent(repoPath: string, filePath: string): Promise<string> {
  return invoke<string>('git_get_original_content', { repoPath, filePath });
}

export async function gitPull(repoPath: string): Promise<string> {
  return invoke<string>('git_pull', { repoPath });
}

export async function gitPush(repoPath: string): Promise<string> {
  return invoke<string>('git_push', { repoPath });
}

export async function gitClone(repoPath: string, url: string): Promise<void> {
  return invoke('git_clone', { repoPath, url });
}
