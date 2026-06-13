import type { ITerminalOptions, ITheme } from '@xterm/xterm'

const darkTheme: ITheme = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#c9d1d9',
  selectionBackground: '#264f78',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
}

const lightTheme: ITheme = {
  background: '#f6f8fa',
  foreground: '#1f2328',
  cursor: '#1f2328',
  selectionBackground: '#b6d7ff',
  black: '#24292f',
  red: '#cf222e',
  green: '#116329',
  yellow: '#4d2d00',
  blue: '#0969da',
  magenta: '#8250df',
  cyan: '#1b7c83',
  white: '#6e7781',
  brightBlack: '#57606a',
  brightRed: '#a40e26',
  brightGreen: '#1a7f37',
  brightYellow: '#633c01',
  brightBlue: '#218bff',
  brightMagenta: '#a475f9',
  brightCyan: '#3192aa',
  brightWhite: '#8c959f',
}

export function getTerminalOptions(platform: string, isDark: boolean): ITerminalOptions {
  const base: ITerminalOptions = {
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    theme: isDark ? darkTheme : lightTheme,
    cursorBlink: true,
    allowProposedApi: true,
    scrollback: 10000,
    tabStopWidth: 4,
  }

  if (platform === 'Win32') {
    return {
      ...base,
      windowsMode: true,
    }
  }

  return base
}

export function getTerminalTheme(isDark: boolean): ITheme {
  return isDark ? darkTheme : lightTheme
}
