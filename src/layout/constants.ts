import React from 'react';
import { Home, ArrowUpDown, Box, Bug, PauseCircle, RotateCw, LoaderPinwheel, Hexagon, FlaskConical, Binary, AppWindow, BookText, SquareLibrary, Radar, Database, ShieldCheck, Cat, KeyRound, Fingerprint, GitCompare, Network, Zap, List } from 'lucide-react';

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  devOnly?: boolean;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export interface NavCategory {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  devOnly?: boolean;
  items: NavItem[];
}

export const allNavItems: NavItem[] = [
  { label: 'Overview', icon: Home, href: '/' },
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/live-traffic' },
  { label: 'Workflow', icon: LoaderPinwheel, href: '/automation', devOnly: true },
  { label: 'Browser', icon: AppWindow, href: '/browser' },
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },

  { label: 'Invoker', icon: Hexagon, href: '/invoker' },
  { label: 'Repeater', icon: RotateCw, href: '/repeater' },
  { label: 'Documents', icon: BookText, href: '/documents' },
  
  { label: 'Encoder / Decoder', icon: Binary, href: '/encoder' },
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

export const allCategories: NavCategory[] = [
  {
    label: 'Overview',
    icon: Home,
    items: [
      { label: 'Overview', icon: Home, href: '/' },
    ],
  },
  {
    label: 'Recon',
    icon: SquareLibrary,
    items: [
      { label: 'Live Traffic', icon: ArrowUpDown, href: '/live-traffic' },
      { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
      { label: 'Repeater', icon: RotateCw, href: '/repeater' },
      { label: 'Invoker', icon: Hexagon, href: '/invoker' },
    ],
  },
  {
    label: 'Automation',
    icon: LoaderPinwheel,
    items: [
      { label: 'Workflow', icon: LoaderPinwheel, href: '/automation', devOnly: true },
      { label: 'Browser', icon: AppWindow, href: '/browser' },
      { label: 'Regression', icon: FlaskConical, href: '/regression', devOnly: true },
    ],
  },
  {
    label: 'Analyze',
    icon: Radar,
    items: [
      { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
      { label: 'Encoder', icon: Binary, href: '/encoder' },
      { label: 'Hash', icon: Fingerprint, href: '/hash' },
      { label: 'Comparer', icon: GitCompare, href: '/comparer' },
      { label: 'Port Scanner', icon: Network, href: '/port-scanner' },
      { label: 'JWT', icon: KeyRound, href: '/jwt' },
      { label: 'XSS Generator', icon: Zap, href: '/xss-generator' },
      { label: 'SQL Injection', icon: Database, href: '/sql-injection' },
      { label: 'Documents', icon: BookText, href: '/documents' },
    ],
  },

];

export const navCategories = import.meta.env.PROD
  ? allCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => !item.devOnly),
  }))
  : allCategories;
