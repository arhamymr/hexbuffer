import React from 'react';
import { HouseIcon, ArrowsDownUpIcon, CubeIcon, BugIcon, PauseCircleIcon, ArrowsClockwiseIcon, PinwheelIcon, SwordIcon, FlaskIcon, BinaryIcon, AppWindowIcon, FileTextIcon, DatabaseIcon, ShieldCheckIcon, CatIcon, KeyIcon, FingerprintIcon, GearSixIcon, GitDiffIcon, NetworkIcon, LightningIcon, ListIcon, RobotIcon, NoteIcon } from '@phosphor-icons/react';


import iconBrowser from '@/assets/feature/browser.png';
import iconDocuments from '@/assets/feature/documents.png';
import iconRepeater from '@/assets/feature/repeater.png';
import iconWorkflow from '@/assets/feature/workflow.png';
import iconBinary from '@/assets/feature/binary.png';
import iconTerminal from '@/assets/feature/terminal.png';

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional image URL (PNG, SVG, etc.) — takes precedence over icon when set */
  iconImage?: string;
  href: string;
  devOnly?: boolean;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export const allNavItems: NavItem[] = [
  { label: 'Overview', icon: HouseIcon, href: '/' },
  { label: 'HTTP', icon: ArrowsDownUpIcon, iconImage: iconTerminal, href: '/http-history' },
  { label: 'WebSocket', icon: ArrowsDownUpIcon, iconImage: iconTerminal, href: '/websocket-history' },
  { label: 'Workflow', icon: PinwheelIcon, iconImage: iconWorkflow, href: '/automation', devOnly: true },
  { label: 'Browser', icon: AppWindowIcon, iconImage: iconBrowser, href: '/browser' },
  { label: 'Intercept', icon: PauseCircleIcon, href: '/intercept' },
  { label: 'AI Assistant', icon: RobotIcon, href: '/assistant' },
  { label: 'Scratchpad', icon: NoteIcon, href: '/scratchpad' },

  { label: 'Invoker', icon: SwordIcon, href: '/invoker' },
  { label: 'Repeater', icon: ArrowsClockwiseIcon, iconImage: iconRepeater, href: '/repeater' },
  { label: 'Documents', icon: FileTextIcon, iconImage: iconDocuments, href: '/documents' },

  { label: 'Encoder', icon: BinaryIcon, iconImage: iconBinary, href: '/encoder' },
  { label: 'Hash', icon: FingerprintIcon, href: '/hash' },
  { label: 'Comparer', icon: GitDiffIcon, href: '/comparer' },
  { label: 'Port Scanner', icon: NetworkIcon, href: '/port-scanner' },
  { label: 'JWT', icon: KeyIcon, href: '/jwt' },
  { label: 'XSS', icon: LightningIcon, href: '/xss-generator' },
  { label: 'SQL Inject', icon: DatabaseIcon, href: '/sql-injection' },
  { label: 'Settings', icon: GearSixIcon, href: '/settings' },

  { label: 'Debugger', icon: BugIcon, href: '/debugger', devOnly: true },
  { label: 'Regression', icon: FlaskIcon, href: '/regression', devOnly: true },

];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;


