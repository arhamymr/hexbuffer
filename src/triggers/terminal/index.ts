import { useTerminalStore } from '@/stores/terminal';

// ponytail: keep triggers thin, directly forwarding calls to existing stores to avoid state duplication.

export function createTerminalSession(): Promise<void> {
  return useTerminalStore.getState().createSession();
}

export function closeTerminalSession(id: string): void {
  useTerminalStore.getState().closeSession(id);
}

export function renameTerminalSession(id: string, name: string): void {
  useTerminalStore.getState().renameSession(id, name);
}

export function closeTerminalTabsToLeft(id: string): void {
  useTerminalStore.getState().closeTabsToLeft(id);
}

export function closeTerminalTabsToRight(id: string): void {
  useTerminalStore.getState().closeTabsToRight(id);
}

export function clearActiveTerminalSessionBuffer(): void {
  useTerminalStore.getState().clearActiveSessionBuffer();
}

export function setTerminalFontSize(size: number): void {
  useTerminalStore.getState().setFontSize(size);
}

export function setTerminalShellPath(path: string): void {
  useTerminalStore.getState().setShellPath(path);
}

export function clearRecentTerminalCommands(): void {
  useTerminalStore.getState().clearRecentCommands();
}

export function runTerminalCommand(cmd: string): void {
  useTerminalStore.getState().runCommand(cmd);
}

export function toggleTerminalSidebar(): void {
  useTerminalStore.getState().toggleSidebar();
}

export function restartTerminalSession(id: string): Promise<void> {
  return useTerminalStore.getState().restartSession(id);
}

export function setActiveTerminalId(id: string | null): void {
  useTerminalStore.getState().setActiveId(id);
}
