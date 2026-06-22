import type { PageTabItem } from '@/components/tabs-layout/tab-bar';
import { HashTool } from './components/hash';
import { EncoderDecoderTool } from './components/encoder';
import { ComparerTool } from './components/comparer';
import { PortScannerTool } from './components/port-scanner';
import { ShellAnalyzerTool } from './components/shell-analyzer';
import { JwtTool } from './components/jwt';
import { XssGeneratorTool } from './components/xss-generator';
import type { ComponentType } from 'react';

export const TOOLS_TABS: PageTabItem[] = [
  { id: 'codec', name: 'Encoder / Decoder' },
  { id: 'hash', name: 'Hash' },
  { id: 'compare', name: 'Comparer' },
  { id: 'ports', name: 'Port Scanner' },
  { id: 'shell', name: 'Script Analyzer' },
  { id: 'jwt', name: 'JWT' },
  { id: 'xss', name: 'XSS Generator' },
  // { id: 'sqli', name: 'SQL Injection' },
  // { id: 'utils', name: 'Others' },
];

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  codec: EncoderDecoderTool,
  hash: HashTool,
  compare: ComparerTool,
  ports: PortScannerTool,
  shell: ShellAnalyzerTool,
  jwt: JwtTool,
  xss: XssGeneratorTool,
  // sqli: SqlInjectionTool,
  // utils: UtilsTool,
};
