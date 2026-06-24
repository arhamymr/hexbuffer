import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  Plus,
  Minus,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  FolderGit,
  Play,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { GitFileStatus, GitStatusResult } from '../lib/git-types';
import * as gitApi from '../lib/git-api';
import { getFileIconUrl } from '../lib/file-icons';

interface GitSidebarPanelProps {
  workspacePath: string;
  onFileDiffClick: (path: string, staged: boolean) => void;
  onRefreshWorkspace: () => void;
}

export function GitSidebarPanel({
  workspacePath,
  onFileDiffClick,
  onRefreshWorkspace,
}: GitSidebarPanelProps) {
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState<'pull' | 'push' | null>(null);

  // New branch state
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Clone repo state
  const [cloneUrl, setCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  // Load Status
  const loadGitStatus = useCallback(async () => {
    if (!workspacePath) return;
    setIsLoading(true);
    try {
      const status = await gitApi.gitStatus(workspacePath);
      setGitStatus(status);
      if (status.isRepo) {
        const branchList = await gitApi.gitGetBranches(workspacePath);
        setBranches(branchList);
      }
    } catch (err) {
      console.error('Failed to load git status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath]);

  useEffect(() => {
    loadGitStatus();
  }, [loadGitStatus]);

  // Actions
  const handleInit = async () => {
    setIsLoading(true);
    try {
      await gitApi.gitInit(workspacePath);
      toast.success('Git repository initialized successfully');
      loadGitStatus();
      onRefreshWorkspace();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to initialize Git');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl.trim()) return;
    setIsCloning(true);
    try {
      await gitApi.gitClone(workspacePath, cloneUrl.trim());
      toast.success('Repository cloned successfully');
      loadGitStatus();
      onRefreshWorkspace();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to clone repository');
    } finally {
      setIsCloning(false);
    }
  };

  const handleStageFile = async (filePath: string) => {
    try {
      await gitApi.gitStageFile(workspacePath, filePath);
      loadGitStatus();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to stage file');
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    try {
      await gitApi.gitUnstageFile(workspacePath, filePath);
      loadGitStatus();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to unstage file');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message');
      return;
    }
    setIsLoading(true);
    try {
      await gitApi.gitCommit(workspacePath, commitMessage.trim());
      toast.success('Committed successfully');
      setCommitMessage('');
      loadGitStatus();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to commit changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    setIsLoading(true);
    try {
      await gitApi.gitSwitchBranch(workspacePath, branchName);
      toast.success(`Switched to branch ${branchName}`);
      loadGitStatus();
      onRefreshWorkspace();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to switch branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setIsLoading(true);
    try {
      await gitApi.gitCreateBranch(workspacePath, newBranchName.trim());
      toast.success(`Created and switched to branch ${newBranchName.trim()}`);
      setNewBranchName('');
      setShowNewBranchInput(false);
      loadGitStatus();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsSyncing('pull');
    try {
      const log = await gitApi.gitPull(workspacePath);
      toast.success('Pulled changes successfully');
      console.log('Pull Output:', log);
      loadGitStatus();
      onRefreshWorkspace();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Pull failed');
    } finally {
      setIsSyncing(null);
    }
  };

  const handlePush = async () => {
    setIsSyncing('push');
    try {
      const log = await gitApi.gitPush(workspacePath);
      toast.success('Pushed changes successfully');
      console.log('Push Output:', log);
      loadGitStatus();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Push failed');
    } finally {
      setIsSyncing(null);
    }
  };

  // Group files by staged
  const stagedFiles = gitStatus?.files.filter((f) => f.staged) ?? [];
  const unstagedFiles = gitStatus?.files.filter((f) => !f.staged) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-background text-sm text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Source Control
        </span>
        {gitStatus?.isRepo && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isSyncing !== null || isLoading}
              onClick={handlePull}
              title="Pull changes"
            >
              <ArrowDown className={`h-4.5 w-4.5 ${isSyncing === 'pull' ? 'animate-bounce' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isSyncing !== null || isLoading}
              onClick={handlePush}
              title="Push changes"
            >
              <ArrowUp className={`h-4.5 w-4.5 ${isSyncing === 'push' ? 'animate-bounce' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadGitStatus}
              disabled={isLoading}
              title="Refresh status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Not a git repository */}
        {gitStatus && !gitStatus.isRepo && (
          <div className="flex flex-col gap-6 py-4">
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed bg-card gap-3">
              <FolderGit className="h-10 w-10 text-muted-foreground opacity-50" />
              <div>
                <p className="font-medium text-sm">Not a Git Repository</p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Initialize this directory to track changes, create branches, and collaborate.
                </p>
              </div>
              <Button size="sm" className="mt-2 w-full" onClick={handleInit}>
                Initialize Repository
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Clone Repository
              </p>
              <form onSubmit={handleClone} className="space-y-2">
                <Input
                  type="text"
                  placeholder="https://github.com/user/repo.git"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  disabled={isCloning}
                  className="h-8 text-xs"
                />
                <Button size="sm" type="submit" disabled={isCloning || !cloneUrl} className="w-full h-8 text-xs">
                  {isCloning ? 'Cloning...' : 'Clone Repository'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Git Repository UI */}
        {gitStatus?.isRepo && (
          <div className="space-y-4">
            {/* Branch Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Branch
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    className="w-full h-8 pl-8 pr-3 text-xs bg-input border rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
                    value={gitStatus.branch}
                    onChange={(e) => handleSwitchBranch(e.target.value)}
                    disabled={isLoading}
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <GitBranch className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowNewBranchInput(!showNewBranchInput)}
                  title="Create new branch"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {showNewBranchInput && (
                <form onSubmit={handleCreateBranch} className="flex gap-2 mt-2 pt-2 border-t">
                  <Input
                    placeholder="new-branch-name"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    required
                  />
                  <Button size="sm" type="submit" className="h-8 px-3">
                    Create
                  </Button>
                </form>
              )}
            </div>

            {/* Commit Message Form */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Commit Changes
              </label>
              <Textarea
                placeholder="Commit message..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="min-h-[60px] text-xs resize-none"
              />
              <Button
                size="sm"
                className="w-full flex items-center justify-center gap-1.5 h-8 text-xs font-medium"
                onClick={handleCommit}
                disabled={isLoading || stagedFiles.length === 0}
              >
                <GitCommit className="h-3.5 w-3.5" />
                Commit Staged Changes
              </Button>
            </div>

            {/* Staged Changes Section */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Staged Changes ({stagedFiles.length})
                </span>
              </div>
              {stagedFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1 px-1">
                  No staged changes. Use + to stage changes.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => onFileDiffClick(file.path, true)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getFileIconUrl(file.path)}
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                          alt=""
                        />
                        <span className="text-xs truncate font-mono" title={file.path}>
                          {file.path.split('/').pop()}
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                            {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : ''}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            file.status === 'added'
                              ? 'bg-green-500/10 text-green-500'
                              : file.status === 'deleted'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {file.status[0].toUpperCase()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnstageFile(file.path);
                          }}
                          title="Unstage changes"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unstaged Changes Section */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Changes ({unstagedFiles.length})
                </span>
              </div>
              {unstagedFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1 px-1">
                  No unstaged changes.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {unstagedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="group flex items-center justify-between p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => onFileDiffClick(file.path, false)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getFileIconUrl(file.path)}
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                          alt=""
                        />
                        <span className="text-xs truncate font-mono" title={file.path}>
                          {file.path.split('/').pop()}
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                            {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : ''}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            file.status === 'untracked'
                              ? 'bg-amber-500/10 text-amber-500'
                              : file.status === 'deleted'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {file.status === 'untracked' ? 'U' : file.status[0].toUpperCase()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageFile(file.path);
                          }}
                          title="Stage changes"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
