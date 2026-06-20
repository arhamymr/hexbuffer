import { useGlobalTerminalStore } from '@/stores/global-terminal';
import type { WorkspaceFolder } from '../../types';

export const LANGUAGE_LABELS: Record<string, string> = {
  rust: 'Rust',
  c: 'C',
  cpp: 'C++',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
};

interface UsePlaygroundToolbarProps {
  workspace: WorkspaceFolder;
}

export function usePlaygroundToolbar({ workspace }: UsePlaygroundToolbarProps) {
  const hasBuildSupport =
    (workspace.language !== 'unknown' && LANGUAGE_LABELS[workspace.language] !== undefined) ||
    ['rust', 'c', 'cpp'].includes(workspace.language);

  const languageLabel = LANGUAGE_LABELS[workspace.language] ?? null;

  const isTerminalOpen = useGlobalTerminalStore((s) => s.isOpen);
  const setIsOpen = useGlobalTerminalStore((s) => s.setIsOpen);

  const handleToggleTerminal = () => setIsOpen(!isTerminalOpen);

  return {
    hasBuildSupport,
    languageLabel,
    isTerminalOpen,
    handleToggleTerminal,
  };
}
