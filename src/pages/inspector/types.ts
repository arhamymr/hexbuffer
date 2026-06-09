export interface InspectorConsoleLog {
  id: string;
  level: 'log' | 'info' | 'warning' | 'error' | 'debug' | 'pageerror';
  text: string;
  url: string;
  timestamp: number;
}

export type ConsoleFilterLevel = 'all' | 'log' | 'info' | 'warning' | 'error' | 'pageerror';
