export interface GitFileStatus {
  path: string;
  status: 'untracked' | 'modified' | 'added' | 'deleted' | 'renamed';
  staged: boolean;
}

export interface GitStatusResult {
  isRepo: boolean;
  branch: string;
  files: GitFileStatus[];
}
