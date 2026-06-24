import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from '@xterm/xterm';

export const FIT_DEBOUNCE_MS = 8;
export const PTY_RESIZE_DEBOUNCE_MS = 256;
export const MIN_FIT_WIDTH = 40;
export const MIN_FIT_HEIGHT = 40;

interface FitTerminalArgs {
  fitAddon: FitAddon | null;
  terminal: Terminal | null;
  container: HTMLDivElement | null;
  lastWidth: number;
  lastHeight: number;
  force?: boolean;
}

export interface FitTerminalResult {
  didFit: boolean;
  width: number;
  height: number;
}

export function fitTerminal({
  fitAddon,
  terminal,
  container,
  lastWidth,
  lastHeight,
  force = false,
}: FitTerminalArgs): FitTerminalResult {
  if (!fitAddon || !terminal || !container) {
    return { didFit: false, width: lastWidth, height: lastHeight };
  }

  const rect = container.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (width < MIN_FIT_WIDTH || height < MIN_FIT_HEIGHT) {
    return { didFit: false, width: lastWidth, height: lastHeight };
  }

  if (!force && width === lastWidth && height === lastHeight) {
    return { didFit: false, width, height };
  }

  const buffer = terminal.buffer?.active;
  const scrollTop = buffer?.viewportY ?? 0;
  const baseY = buffer?.baseY ?? 0;

  try {
    fitAddon.fit();
  } catch {
    return { didFit: false, width: lastWidth, height: lastHeight };
  }

  if (scrollTop > 0 && scrollTop < baseY) {
    terminal.scrollToLine(scrollTop);
  }

  return { didFit: true, width, height };
}
