import type { PageTabItem } from '@/components/tabs-layout/tab-bar';
import { HashTool } from './components/hash';
import { EncoderDecoderTool } from './components/encoder';
import { ComparerTool } from './components/comparer';
import { PortScannerTool } from './components/port-scanner';
import { JwtTool } from './components/jwt';
import { XssGeneratorTool } from './components/xss-generator';
import type { ComponentType } from 'react';
import {
  ArrowLeftRight,
  Fingerprint,
  GitCompare,
  Network,
  KeyRound,
  Zap,
} from 'lucide-react';

export const TOOLS_TABS: PageTabItem[] = [
  { id: 'codec', name: 'Encoder / Decoder' },
  { id: 'hash', name: 'Hash' },
  { id: 'compare', name: 'Comparer' },
  { id: 'ports', name: 'Port Scanner' },
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
  jwt: JwtTool,
  xss: XssGeneratorTool,
  // sqli: SqlInjectionTool,
  // utils: UtilsTool,
};

export interface ToolOverviewItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export const TOOL_OVERVIEW_ITEMS: ToolOverviewItem[] = [
  {
    id: 'codec',
    label: 'Encoder / Decoder',
    description: 'Encode and decode strings with URL, Base64, and Hex formats.',
    href: '/tools/codec',
    icon: ArrowLeftRight,
  },
  {
    id: 'hash',
    label: 'Hash',
    description: 'Generate cryptographic hashes with MD5, SHA, and RIPEMD algorithms.',
    href: '/tools/hash',
    icon: Fingerprint,
  },
  {
    id: 'compare',
    label: 'Comparer',
    description: 'Diff and compare two text blocks side-by-side.',
    href: '/tools/compare',
    icon: GitCompare,
  },
  {
    id: 'ports',
    label: 'Port Scanner',
    description: 'Scan TCP ports on a target host to identify open services.',
    href: '/tools/ports',
    icon: Network,
  },
  {
    id: 'jwt',
    label: 'JWT',
    description: 'Decode, inspect, and test JSON Web Tokens for vulnerabilities.',
    href: '/tools/jwt',
    icon: KeyRound,
  },
  {
    id: 'xss',
    label: 'XSS Generator',
    description: 'Generate and encode XSS payloads for web application testing.',
    href: '/tools/xss',
    icon: Zap,
  },
];
