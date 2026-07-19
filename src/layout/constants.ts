import React from 'react';
import { HouseIcon, ArrowsDownUpIcon, BugIcon, PauseCircleIcon, FlaskIcon, BinaryIcon, AppWindowIcon, DatabaseIcon, FingerprintIcon, GearSixIcon, GitDiffIcon, LightningIcon, WifiHighIcon, SpinnerIcon, BlueprintIcon, MarkdownLogoIcon, InfinityIcon, StarFourIcon, CloverIcon, CubeFocusIcon, TargetIcon, SquaresFourIcon, BroadcastIcon, PencilIcon, PaintBrushIcon, HardDriveIcon, FolderOpenIcon, TerminalWindowIcon } from '@phosphor-icons/react';

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  rightIcon?: React.ComponentType<{ className?: string }>;
  description?: string;
  colors?: { bg: string; hoverBg: string; border: string };
  flag?: 'alpha' | 'beta' | 'release';
}

export const allNavItems: NavItem[] = [
  {
    label: 'Desktop',
    icon: HouseIcon,
    href: '/',
    description: 'Overview of all tools and features.',
    colors: { bg: 'bg-slate-500 dark:bg-slate-500', hoverBg: 'group-hover:bg-slate-500 dark:group-hover:bg-slate-500', border: 'border-slate-500 dark:border-slate-500' },
    flag: 'release'
  },
  {
    label: 'HTTP',
    icon: ArrowsDownUpIcon,
    href: '/http-history',
    description: 'Capture and inspect real-time HTTP/HTTPS network traffic.',
    colors: { bg: 'bg-emerald-500 dark:bg-emerald-500', hoverBg: 'group-hover:bg-emerald-500 dark:group-hover:bg-emerald-500', border: 'border-emerald-500 dark:border-emerald-500' },
    flag: 'release'
  },
  {
    label: 'WebSocket',
    icon: WifiHighIcon,
    href: '/websocket-history',
    description: 'Capture and inspect real-time WebSocket network traffic.',
    colors: { bg: 'bg-blue-500 dark:bg-blue-500', hoverBg: 'group-hover:bg-blue-500 dark:group-hover:bg-blue-500', border: 'border-blue-500 dark:border-blue-500' },
    flag: 'alpha'
  },
  {
    label: 'Workflow',
    icon: SpinnerIcon,
    href: '/automation',
    description: 'Build and execute automated visual workflows for target reconnaissance.',
    colors: { bg: 'bg-purple-500 dark:bg-purple-500', hoverBg: 'group-hover:bg-purple-500 dark:group-hover:bg-purple-500', border: 'border-purple-500 dark:border-purple-500' },
    flag: 'alpha'
  },
  {
    label: 'Browser',
    icon: AppWindowIcon,
    href: '/browser',
    description: 'Control an automated browser session to crawl websites and capture elements.',
    colors: { bg: 'bg-sky-500 dark:bg-sky-500', hoverBg: 'group-hover:bg-sky-500 dark:group-hover:bg-sky-500', border: 'border-sky-500 dark:border-sky-500' },
    flag: 'beta'
  },
  {
    label: 'Intercept',
    icon: PauseCircleIcon,
    href: '/intercept',
    description: 'Pause incoming or outgoing requests to modify headers, parameters, and bodies.',
    colors: { bg: 'bg-rose-500 dark:bg-rose-500', hoverBg: 'group-hover:bg-rose-500 dark:group-hover:bg-rose-500', border: 'border-rose-500 dark:border-rose-500' },
    flag: 'release'
  },
  {
    label: 'AI Assistant',
    icon: StarFourIcon,
    href: '/assistant',
    description: 'Interact with AI to analyze web traffic and write exploits.',
    colors: { bg: 'bg-violet-500 dark:bg-violet-500', hoverBg: 'group-hover:bg-violet-500 dark:group-hover:bg-violet-500', border: 'border-violet-500 dark:border-violet-500' },
    flag: 'beta'
  },
  {
    label: 'Scratchpad',
    icon: PencilIcon,
    href: '/scratchpad',
    description: 'Write quick notes, scripts, or documentation.',
    colors: { bg: 'bg-amber-500 dark:bg-amber-500', hoverBg: 'group-hover:bg-amber-500 dark:group-hover:bg-amber-500', border: 'border-amber-500 dark:border-amber-500' },
    flag: 'release'
  },
  {
    label: 'Kanban',
    icon: SquaresFourIcon,
    href: '/kanban',
    description: 'Visual project board: track tasks across status, priority, or assignee swimlanes with WIP limits.',
    colors: { bg: 'bg-rose-500 dark:bg-rose-500', hoverBg: 'group-hover:bg-rose-500 dark:group-hover:bg-rose-500', border: 'border-rose-500 dark:border-rose-500' },
    flag: 'alpha'
  },
  {
    label: 'Invoker',
    icon: CubeFocusIcon,
    href: '/invoker',
    description: 'Generate client-side requests, perform attacks, and trigger endpoints.',
    colors: { bg: 'bg-indigo-500 dark:bg-indigo-500', hoverBg: 'group-hover:bg-indigo-500 dark:group-hover:bg-indigo-500', border: 'border-indigo-500 dark:border-indigo-500' },
    flag: 'release'
  },
  {
    label: 'Repeater',
    icon: InfinityIcon,
    href: '/repeater',
    description: 'Modify HTTP requests, reissue them, and analyze responses side-by-side.',
    colors: { bg: 'bg-cyan-500 dark:bg-cyan-500', hoverBg: 'group-hover:bg-cyan-500 dark:group-hover:bg-cyan-500', border: 'border-cyan-500 dark:border-cyan-500' },
    flag: 'beta'
  },
  {
    label: 'MockForge',
    icon: BlueprintIcon,
    href: '/mock-forge',
    description: 'Mock HTTP endpoints, responses, and simulate server behaviors.',
    colors: { bg: 'bg-teal-600 dark:bg-teal-600', hoverBg: 'group-hover:bg-teal-600 dark:group-hover:bg-teal-600', border: 'border-teal-600 dark:border-teal-600' },
    flag: 'beta'
  },
  {
    label: 'Listener',
    icon: BroadcastIcon,
    href: '/listener',
    description: 'Generate out-of-band (OOB) payloads and monitor incoming DNS, HTTP, and HTTPS interactions.',
    colors: { bg: 'bg-green-500 dark:bg-green-500', hoverBg: 'group-hover:bg-green-500 dark:group-hover:bg-green-500', border: 'border-green-500 dark:border-green-500' },
    flag: 'alpha'
  },
  {
    label: 'Markdown',
    icon: MarkdownLogoIcon,
    href: '/documents',
    description: 'Create markdown documents, API definitions, and manage target scopes.',
    colors: { bg: 'bg-orange-500 dark:bg-orange-500', hoverBg: 'group-hover:bg-orange-500 dark:group-hover:bg-orange-500', border: 'border-orange-500 dark:border-orange-500' },
    flag: 'release'
  },
  {
    label: 'Encoder',
    icon: BinaryIcon,
    href: '/encoder',
    description: 'Access encoders, decoders, hashes, and other payload helper utilities.',
    colors: { bg: 'bg-teal-500 dark:bg-teal-500', hoverBg: 'group-hover:bg-teal-500 dark:group-hover:bg-teal-500', border: 'border-teal-500 dark:border-teal-500' },
    flag: 'release'
  },
  {
    label: 'Hash',
    icon: FingerprintIcon,
    href: '/hash',
    description: 'Generate and verify cryptographic hash functions.',
    colors: { bg: 'bg-red-500 dark:bg-red-500', hoverBg: 'group-hover:bg-red-500 dark:group-hover:bg-red-500', border: 'border-red-500 dark:border-red-500' },
    flag: 'release'
  },
  {
    label: 'Comparer',
    icon: GitDiffIcon,
    href: '/comparer',
    description: 'Compare files, requests, or text side-by-side.',
    colors: { bg: 'bg-fuchsia-500 dark:bg-fuchsia-500', hoverBg: 'group-hover:bg-fuchsia-500 dark:group-hover:bg-fuchsia-500', border: 'border-fuchsia-500 dark:border-fuchsia-500' },
    flag: 'release'
  },
  {
    label: 'Port Scanner',
    icon: TargetIcon,
    href: '/port-scanner',
    description: 'Scan host ports for open services and network vulnerabilities.',
    colors: { bg: 'bg-pink-500 dark:bg-pink-500', hoverBg: 'group-hover:bg-pink-500 dark:group-hover:bg-pink-500', border: 'border-pink-500 dark:border-pink-500' },
    flag: 'beta'
  },
  {
    label: 'JWT',
    icon: CloverIcon,
    href: '/jwt',
    description: 'Decode, edit, and sign JSON Web Tokens.',
    colors: { bg: 'bg-lime-700 dark:bg-lime-700', hoverBg: 'group-hover:bg-lime-700 dark:group-hover:bg-lime-700', border: 'border-lime-700 dark:border-lime-700' },
    flag: 'release'
  },
  {
    label: 'XSS',
    icon: LightningIcon,
    href: '/xss-generator',
    description: 'Generate cross-site scripting payloads and templates.',
    colors: { bg: 'bg-yellow-500 dark:bg-yellow-500', hoverBg: 'group-hover:bg-yellow-500 dark:group-hover:bg-yellow-500', border: 'border-yellow-500 dark:border-yellow-500' },
    flag: 'beta'
  },
  {
    label: 'SQL Inject',
    icon: DatabaseIcon,
    href: '/sql-injection',
    description: 'Test databases for SQL injection vulnerabilities.',
    colors: { bg: 'bg-cyan-600 dark:bg-cyan-600', hoverBg: 'group-hover:bg-cyan-600 dark:group-hover:bg-cyan-600', border: 'border-cyan-600 dark:border-cyan-600' },
    flag: 'alpha'
  },
  {
    label: 'Settings',
    icon: GearSixIcon,
    href: '/settings',
    description: 'Configure proxy certificate, theme, and application preferences.',
    colors: { bg: 'bg-slate-500 dark:bg-slate-500', hoverBg: 'group-hover:bg-slate-500 dark:group-hover:bg-slate-500', border: 'border-slate-500 dark:border-slate-500' },
    flag: 'release'
  },
  {
    label: 'Inspector',
    icon: BugIcon,
    href: '/inspector',
    description: 'Inspect external browser pages, network traffic, cookies, and console logs via CDP.',
    colors: { bg: 'bg-zinc-500 dark:bg-zinc-500', hoverBg: 'group-hover:bg-zinc-500 dark:group-hover:bg-zinc-500', border: 'border-zinc-500 dark:border-zinc-500' },
    flag: 'alpha'
  },
  {
    label: 'Regression',
    icon: FlaskIcon,
    href: '/regression',
    description: 'Execute automated regression tests on target endpoints.',
    colors: { bg: 'bg-indigo-600 dark:bg-indigo-600', hoverBg: 'group-hover:bg-indigo-600 dark:group-hover:bg-indigo-600', border: 'border-indigo-600 dark:border-indigo-600' },
    flag: 'alpha'
  },
  {
    label: 'Pixel',
    icon: PaintBrushIcon,
    href: '/pixel',
    description: 'Generate and edit pixel art matrices using AI prompting.',
    colors: { bg: 'bg-emerald-500 dark:bg-emerald-500', hoverBg: 'group-hover:bg-emerald-500 dark:group-hover:bg-emerald-500', border: 'border-emerald-500 dark:border-emerald-500' },
    flag: 'alpha'
  },
  {
    label: 'File Explorer',
    icon: FolderOpenIcon,
    href: '/file-explorer',
    description: 'Browse, stream, and manage Cloudflare R2 object storage files.',
    colors: { bg: 'bg-zinc-900 dark:bg-zinc-900', hoverBg: 'group-hover:bg-zinc-900 dark:group-hover:bg-zinc-900', border: 'border-zinc-900 dark:border-zinc-900' },
    flag: 'alpha'
  },
  {
    label: 'Terminal',
    icon: TerminalWindowIcon,
    href: '/terminal',
    description: 'Interactive command-line shell with multi-tab support.',
    colors: { bg: 'bg-slate-700 dark:bg-slate-700', hoverBg: 'group-hover:bg-slate-700 dark:group-hover:bg-slate-700', border: 'border-slate-700 dark:border-slate-700' },
    flag: 'alpha'
  }
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => item.flag !== 'alpha')
  : allNavItems;
