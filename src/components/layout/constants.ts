import React from 'react';
import { ArrowUpDown, Box, Bug, FileText, Globe, PauseCircle, RotateCw, LoaderPinwheel, Atom, Hexagon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  devOnly?: boolean;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export const allNavItems: NavItem[] = [
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/live-traffic' },
  { label: 'Automation', icon: LoaderPinwheel, href: '/automation', devOnly: true },
  { label: 'Browser', icon: Globe, href: '/browser-automation'},
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
  { label: 'Invoker', icon: Hexagon, href: '/invoker' },
  { label: 'Repeater', icon: RotateCw, href: '/repeater' },
  { label: 'Threats', icon: Atom, href: '/threats', devOnly: true},
  { label: 'Documents', icon: FileText, href: '/documents'},
  { label: 'Tools', icon: Box, href: '/tools' },
  { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;
