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

/** An open workspace folder (replaces the old tab-based project model). */
export interface WorkspaceFolder {
  name: string;
  path: string;
  language: string; // auto-detected: 'rust' | 'c' | 'cpp' | 'unknown' | etc.
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

// Image file extensions that the code page can display as images
const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg',
  'avif', 'tiff', 'tif', 'heic', 'heif',
]);

/** Returns true if the file path has an image extension. */
export function isImageFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
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
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
    case 'mts':
      return 'typescript';
    case 'py':
    case 'pyw':
      return 'python';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'kt':
    case 'kts':
      return 'kotlin';
    case 'swift':
      return 'swift';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'css';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
    case 'ini':
    case 'cfg':
      return 'ini';
    case 'xml':
      return 'xml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'sql':
      return 'sql';
    case 'dockerfile':
      return 'dockerfile';
    default:
      // Check image extensions
      if (ext && IMAGE_EXTENSIONS.has(ext)) return 'image';
      return '';
  }
}

/** Detect workspace language by inspecting file tree for known markers. */
export function detectWorkspaceLanguage(tree: FileTreeNode[]): string {
  const rootNames = tree.map((n) => n.name);
  if (rootNames.includes('Cargo.toml')) return 'rust';
  if (rootNames.includes('main.cpp') || rootNames.includes('main.cc')) return 'cpp';
  if (rootNames.includes('main.c')) return 'c';
  if (rootNames.includes('package.json')) return 'javascript';
  if (rootNames.includes('go.mod')) return 'go';
  if (rootNames.includes('requirements.txt') || rootNames.includes('pyproject.toml')) return 'python';
  return 'unknown';
}
