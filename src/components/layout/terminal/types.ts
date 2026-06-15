export type TerminalStatus = 'loading' | 'ready' | 'exited' | 'error';

export interface TerminalPanelHandle {
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  focus(): void;
}

export interface TerminalInstanceHandle extends TerminalPanelHandle {
  findNext(query: string): boolean;
  findPrevious(query: string): boolean;
  clearSearch(): void;
}
