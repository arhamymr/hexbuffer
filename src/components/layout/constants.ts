import React from 'react';
import { ArrowUpDown, Box, Bug, Code2, FileText, Globe, PauseCircle, RotateCw, LoaderPinwheel, Atom, Hexagon, FlaskConical } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  devOnly?: boolean;
  rightIcon?: React.ComponentType<{ className?: string }>;
}

export const allNavItems: NavItem[] = [
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/live-traffic' },
  { label: 'Workflow', icon: LoaderPinwheel, href: '/automation', devOnly: true },
  { label: 'Browser', icon: Globe, href: '/browser-automation'},
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
  { label: 'Playground', icon: Code2, href: '/playground' },
  { label: 'Invoker', icon: Hexagon, href: '/invoker' },
  { label: 'Repeater', icon: RotateCw, href: '/repeater' },
  { label: 'Threats', icon: Atom, href: '/threats', devOnly: true},
  { label: 'Documents', icon: FileText, href: '/documents'},
  { label: 'Tools', icon: Box, href: '/tools' },
  { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
  { label: 'Regression', icon: FlaskConical, href: '/regression', devOnly: true },
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;
