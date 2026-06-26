import React from 'react';
import { Home, ArrowUpDown, Box, Bug, PauseCircle, RotateCw, LoaderPinwheel, Hexagon, FlaskConical, Binary, AppWindow, BookText, Database, ShieldCheck, Cat, KeyRound, Fingerprint, GitCompare, Network, Zap, List } from 'lucide-react';

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
  { label: 'Overview', icon: Home, href: '/' },
  { label: 'Live Traffic', icon: ArrowUpDown, iconImage: iconTerminal, href: '/live-traffic' },
  { label: 'Workflow', icon: LoaderPinwheel, iconImage: iconWorkflow, href: '/automation', devOnly: true },
  { label: 'Browser', icon: AppWindow, iconImage: iconBrowser, href: '/browser' },
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },

  { label: 'Invoker', icon: Hexagon, href: '/invoker' },
  { label: 'Repeater', icon: RotateCw, iconImage: iconRepeater, href: '/repeater' },
  { label: 'Documents', icon: BookText, iconImage: iconDocuments, href: '/documents' },
  
  { label: 'Encoder', icon: Binary, iconImage: iconBinary, href: '/encoder' },
  { label: 'Hash', icon: Fingerprint, href: '/hash' },
  { label: 'Comparer', icon: GitCompare, href: '/comparer' },
  { label: 'Port Scanner', icon: Network, href: '/port-scanner' },
  { label: 'JWT', icon: KeyRound, href: '/jwt' },
  { label: 'XSS Generator', icon: Zap, href: '/xss-generator' },
  { label: 'SQL Injection', icon: Database, href: '/sql-injection' },

  { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
  { label: 'Regression', icon: FlaskConical, href: '/regression', devOnly: true },

];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;


