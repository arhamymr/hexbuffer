import React from 'react';
import {
  CaretDownIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  FlaskIcon,
  CheckIcon,
  XIcon,
  ArrowClockwiseIcon,
  SquareIcon
} from '@phosphor-icons/react';
import folderIcon from '@/assets/explorer-icon/_folder.svg';
import folderOpenIcon from '@/assets/explorer-icon/_folder_open.svg';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestCase } from '../types';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ponytail: Simple folder-based test suite tree using local expand/collapse state. Avoids dnd complexity.

interface RegressionTreeProps {
  testCases: TestCase[];
  activeTestCaseId: string | null;
  onSelectTestCase: (id: string) => void;
  onDeleteTestCase: (id: string) => void;
  onEditTestCase: (tc: TestCase) => void;
  onRunTestCase: (id: string) => void;
  onRenameFolder: (oldName: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderName: string) => Promise<void>;
  onSaveTestCase: (tc: TestCase) => Promise<any>;
  onRefresh: () => void | Promise<void>;
  onAbortTestCase: () => void;
  isRunning: boolean;
}

export function RegressionTree({
  testCases,
  activeTestCaseId,
  onSelectTestCase,
  onDeleteTestCase,
  onEditTestCase,
  onRunTestCase,
  onRenameFolder,
  onDeleteFolder,
  onSaveTestCase,
  onRefresh,
  onAbortTestCase,
  isRunning,
}: RegressionTreeProps) {
  // Local expand/collapse state
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(() => new Set());
  
  // Folder rename state
  const [renamingFolder, setRenamingFolder] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  
  // Dialog state
  const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null);
  const [testCaseToDelete, setTestCaseToDelete] = React.useState<TestCase | null>(null);

  // Group test cases by testName (which represents the Folder)
  const folders = React.useMemo(() => {
    const names = new Set<string>();
    testCases.forEach((tc) => {
      names.add(tc.testName || 'Default Test');
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [testCases]);

  // Expand folders containing active test case on mount/update
  React.useEffect(() => {
    if (activeTestCaseId) {
      const activeTc = testCases.find((tc) => tc.id === activeTestCaseId);
      if (activeTc) {
        const folderName = activeTc.testName || 'Default Test';
        setExpandedFolders((prev) => {
          if (prev.has(folderName)) return prev;
          const next = new Set(prev);
          next.add(folderName);
          return next;
        });
      }
    }
  }, [activeTestCaseId, testCases]);

  const toggleExpand = (folderName: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  };

  const startRename = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFolder(folderName);
    setRenameValue(folderName);
  };

  const submitRename = async () => {
    if (!renamingFolder) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingFolder) {
      await onRenameFolder(renamingFolder, trimmed);
    }
    setRenamingFolder(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void submitRename();
    } else if (e.key === 'Escape') {
      setRenamingFolder(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card min-h-0 select-none">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-muted/20">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Regression Suites
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Update Suites"
          onClick={() => void onRefresh()}
        >
          <ArrowClockwiseIcon className="size-3.5" />
        </Button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-0">
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs text-muted-foreground">No test suites yet</p>
          </div>
        ) : (
          folders.map((folderName) => {
            const isExpanded = expandedFolders.has(folderName);
            const isRenaming = renamingFolder === folderName;
            const casesInFolder = testCases.filter((tc) => (tc.testName || 'Default Test') === folderName);
            
            return (
              <div key={folderName} className="space-y-0.5">
                {/* Folder Row */}
                <div
                  className="flex items-center gap-1 py-1 px-1.5 rounded-sm hover:bg-muted/50 cursor-pointer group/folder"
                  onClick={() => toggleExpand(folderName)}
                >
                  <button
                    type="button"
                    className="flex size-4 items-center justify-center text-muted-foreground/70 hover:text-foreground shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(folderName);
                    }}
                  >
                    <CaretDownIcon
                      className={cn('size-3 transition-transform', !isExpanded && '-rotate-90')}
                    />
                  </button>

                  <img
                    src={isExpanded ? folderOpenIcon : folderIcon}
                    alt="folder"
                    className="size-3.5 shrink-0"
                  />

                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={submitRename}
                      onKeyDown={handleKeyDown}
                      className="flex-1 h-5 text-xs px-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs font-medium text-foreground truncate flex-1 pr-1"
                      onDoubleClick={(e) => startRename(folderName, e)}
                    >
                      {folderName}
                    </span>
                  )}

                  {!isRenaming && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-foreground"
                        title="Rename Suite"
                        onClick={(e) => startRename(folderName, e)}
                      >
                        <PencilIcon className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-destructive hover:text-destructive"
                        title="Delete Suite"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete(folderName);
                        }}
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Test Cases inside Folder */}
                {isExpanded && (
                  <div className="pl-4 border-l border-border/50 ml-3.5 space-y-0.5">
                    {casesInFolder.length === 0 ? (
                      <div className="py-1 px-2 text-[10px] text-muted-foreground">
                        Empty suite
                      </div>
                    ) : (
                      casesInFolder.map((tc) => {
                        const isActive = activeTestCaseId === tc.id;
                        return (
                          <div
                            key={tc.id}
                            className={cn(
                              'group/case flex items-center gap-2 py-1 px-2 rounded-sm cursor-pointer transition-colors hover:bg-muted/70',
                              isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => onSelectTestCase(tc.id)}
                          >
                            <FlaskIcon className="size-3.5 shrink-0 text-muted-foreground/60 group-hover/case:text-primary transition-colors" />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={cn(
                                  'text-xs truncate font-medium',
                                  !tc.enabled && 'line-through opacity-50'
                                )}>
                                  {tc.name}
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground/60 truncate block max-w-full">
                                {tc.targetUrl || 'No target URL'} &middot; {tc.steps.length} step{tc.steps.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/case:opacity-100 transition-opacity">
                              <Checkbox
                                checked={tc.enabled}
                                onCheckedChange={async (checked) => {
                                  await onSaveTestCase({ ...tc, enabled: !!checked });
                                }}
                                className="size-3.5 mr-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {isRunning && isActive ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5 text-destructive hover:text-destructive animate-pulse"
                                  title="Stop Test Case"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAbortTestCase();
                                  }}
                                >
                                  <SquareIcon className="size-3 fill-current" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5"
                                  title="Run Test Case"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRunTestCase(tc.id);
                                  }}
                                  disabled={isRunning}
                                >
                                  <PlayIcon className="size-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-5"
                                title="Edit Test Case"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTestCase(tc);
                                }}
                              >
                                <PencilIcon className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-5 text-destructive hover:text-destructive"
                                title="Delete Test Case"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTestCaseToDelete(tc);
                                }}
                              >
                                <TrashIcon className="size-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Folder Dialog */}
      <AlertDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFolderToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete suite?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the suite &ldquo;{folderToDelete}&rdquo;? All test cases inside it will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (folderToDelete) {
                  await onDeleteFolder(folderToDelete);
                  setFolderToDelete(null);
                }
              }}
            >
              Delete Suite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Test Case Dialog */}
      <AlertDialog
        open={testCaseToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTestCaseToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test case?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{testCaseToDelete?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (testCaseToDelete) {
                  await onDeleteTestCase(testCaseToDelete.id);
                  setTestCaseToDelete(null);
                }
              }}
            >
              Delete Test Case
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
