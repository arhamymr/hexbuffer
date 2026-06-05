import React from 'react';
import { ArrowUpDown, Box, Cog, Crosshair, Globe, PauseCircle, Radio, RefreshCw } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  devOnly?: boolean;
}

export const allNavItems: NavItem[] = [
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/' },
  // { label: 'Packets', icon: Network, href: '/packet-capture', devOnly: true },
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
  { label: 'Brute Force', icon: Crosshair, href: '/brute-force' },
  { label: 'Repeater', icon: RefreshCw, href: '/repeater' },
  { label: 'Browser', icon: Globe, href: '/browser-automation'},
  { label: 'Collaborator', icon: Radio, href: '/collaborator' },
  // { label: 'Documents', icon: FileText, href: '/documents'},
  // { label: 'AI Tools', icon: Bot, href: '/ai-tools', devOnly: true },
  { label: 'Tools', icon: Box, href: '/tools' },
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;
