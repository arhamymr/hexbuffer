import { useState, useEffect } from 'react';
import { MonacoDiffEditor } from '@/components/ui/monaco-diff-editor';
import * as gitApi from '../../lib/git-api';
import { readProjectFile } from '../../api';

interface GitDiffTabProps {
  path: string; // e.g. "gitdiff:src/main.rs:unstaged"
  workspacePath: string;
  className?: string;
  currentContent?: string;
}

export function GitDiffTab({ path, workspacePath, className, currentContent }: GitDiffTabProps) {
  const [originalValue, setOriginalValue] = useState<string>('');
  const [modifiedValue, setModifiedValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Parse path: "gitdiff:src/main.rs:unstaged" -> ["gitdiff", "src/main.rs", "unstaged"]
  // Note: path might contain multiple colons (e.g. Windows paths or complex subpaths), so split carefully:
  // Since path prefix is "gitdiff:", we strip it first, then split off the last colon for staged/unstaged
  const rawPath = path.substring(8); // strip "gitdiff:"
  const lastColonIndex = rawPath.lastIndexOf(':');
  const filePath = lastColonIndex !== -1 ? rawPath.substring(0, lastColonIndex) : rawPath;

  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      try {
        setIsLoading(true);
        // Load original (clean HEAD version)
        const orig = await gitApi.gitGetOriginalContent(workspacePath, filePath);

        // Load modified version
        let mod = '';
        if (currentContent) {
          mod = currentContent;
        } else {
          // If not in unsaved cache, read from project file
          try {
            const file = await readProjectFile(filePath, workspacePath);
            mod = file.content;
          } catch (e) {
            // Might be deleted file or new file
            mod = '';
          }
        }

        if (isMounted) {
          setOriginalValue(orig);
          setModifiedValue(mod);
        }
      } catch (err) {
        console.error('Failed to load diff content:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
  }, [path, workspacePath, currentContent, filePath]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-xs text-muted-foreground">
        Loading diff...
      </div>
    );
  }

  return (
    <MonacoDiffEditor
      originalValue={originalValue}
      modifiedValue={modifiedValue}
      originalPath={`original/${filePath}`}
      modifiedPath={filePath}
      className={className}
    />
  );
}
