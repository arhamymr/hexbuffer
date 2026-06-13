import { invoke } from '@tauri-apps/api/core';
import type {
  SystemInfo,
  FileTreeNode,
  FileContent,
  CommandOutput,
  PlaygroundProject,
} from './types';

function toErrorMessage(error: unknown, prefix: string): string {
  if (typeof error === 'string') return `${prefix}: ${error}`;
  if (error instanceof Error) return `${prefix}: ${error.message}`;
  return `${prefix}: Unknown error`;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke<SystemInfo>('get_system_info');
}

export async function createProject(
  name: string,
  language: string,
  parentDir: string,
): Promise<PlaygroundProject> {
  return invoke<PlaygroundProject>('create_project', {
    projectName: name,
    language,
    parentDir,
  });
}

export async function listProjectFiles(
  projectPath: string,
): Promise<FileTreeNode[]> {
  return invoke<FileTreeNode[]>('list_project_files', {
    projectPath,
  });
}

export async function readProjectFile(
  filePath: string,
  projectPath: string,
): Promise<FileContent> {
  return invoke<FileContent>('read_project_file', {
    filePath,
    projectPath,
  });
}

export async function writeProjectFile(
  filePath: string,
  content: string,
  projectPath: string,
): Promise<void> {
  return invoke('write_project_file', {
    filePath,
    content,
    projectPath,
  });
}

export async function deleteProjectFile(
  filePath: string,
  projectPath: string,
): Promise<void> {
  return invoke('delete_project_file', {
    filePath,
    projectPath,
  });
}

export async function renameProjectFile(
  oldPath: string,
  newPath: string,
  projectPath: string,
): Promise<void> {
  return invoke('rename_project_file', {
    oldPath,
    newPath,
    projectPath,
  });
}

export async function runBuildCommand(
  workingDir: string,
  command: string,
  args: string[],
): Promise<CommandOutput> {
  return invoke<CommandOutput>('run_build_command', {
    workingDir,
    command,
    args,
  });
}
