import React from 'react';
import { ArrowUpDown, Bot, Crosshair, FileText, Globe, Network, PauseCircle, RefreshCw, Wrench } from 'lucide-react';

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
  // { label: 'Documents', icon: FileText, href: '/documents'},
  // { label: 'AI Tools', icon: Bot, href: '/ai-tools', devOnly: true },
  // { label: 'Tools', icon: Wrench, href: '/tools' },
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;
