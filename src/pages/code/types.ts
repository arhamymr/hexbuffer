export type PlaygroundLanguage = 'rust' | 'c' | 'cpp';

export interface CompilerInfo {
  name: string;
  path: string;
  version: string;
  available: boolean;
}

export interface SystemInfo {
  os: string;
  arch: string;
  homeDir: string;
  compilers: CompilerInfo[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: FileTreeNode[];
}

export interface OpenTab {
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface PlaygroundProject {
  name: string;
  path: string;
  language: PlaygroundLanguage;
}

/** A tab in the Playground page tab bar. */
export interface PlaygroundTab {
  id: string;
  name: string;
  project: PlaygroundProject | null; // null = landing / "get started" tab
}

export interface ProjectSummary {
  name: string;
  path: string;
  language: string;
  lastModified: string;
}

export interface FileContent {
  path: string;
  content: string;
}

/** Map file extension to a language identifier for the TextEditor. */
export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'rs':
      return 'rust';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return 'cpp';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'html':
    case 'htm':
      return 'html';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return '';
  }
}
