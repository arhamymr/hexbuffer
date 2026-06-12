import React from 'react';
import { ArrowUpDown, Bot, Box, Bug, Cog, Crosshair, FileText, Globe, PauseCircle, Radio, RefreshCw, Search, Workflow } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  devOnly?: boolean;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export const allNavItems: NavItem[] = [
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/live-traffic' },
  { label: 'Automation', icon: Workflow, href: '/automation' },
  { label: 'Browser', icon: Globe, href: '/browser-automation'},
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
  { label: 'Invoker', icon: Crosshair, href: '/invoker' },
  { label: 'Repeater', icon: RefreshCw, href: '/repeater' },
  { label: 'Documents', icon: FileText, href: '/documents'},
  { label: 'Tools', icon: Box, href: '/tools' },
  { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;
