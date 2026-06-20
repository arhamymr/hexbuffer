import React from 'react';
import { ArrowUpDown, Box, Bug, PauseCircle, RotateCw, LoaderPinwheel, Atom, Hexagon, FlaskConical, Binary, AppWindow, BookText, SquareLibrary, Radar } from 'lucide-react';

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
  items: NavItem[];
}

export const allNavItems: NavItem[] = [
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/' },
  { label: 'Workflow', icon: LoaderPinwheel, href: '/automation', devOnly: true },
  { label: 'Browser', icon: AppWindow, href: '/browser'},
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
  { label: 'Code', icon: Binary, href: '/playground', devOnly: true },
  { label: 'Invoker', icon: Hexagon, href: '/invoker' },
  { label: 'Repeater', icon: RotateCw, href: '/repeater' },
  { label: 'Threats', icon: Atom, href: '/threats', devOnly: true},
  { label: 'Documents', icon: BookText, href: '/documents'},
  { label: 'Tools', icon: Box, href: '/tools' },
  { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
  { label: 'Regression', icon: FlaskConical, href: '/regression', devOnly: true },
];

export const mainNavItems = import.meta.env.PROD
  ? allNavItems.filter((item) => !item.devOnly)
  : allNavItems;

export const allCategories: NavCategory[] = [
  {
    label: 'Recon',
    icon: SquareLibrary,
    items: [
      { label: 'Live Traffic', icon: ArrowUpDown, href: '/' },
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
      { label: 'Code', icon: Binary, href: '/playground', devOnly: true },
      { label: 'Threats', icon: Atom, href: '/threats', devOnly: true },
      { label: 'Debugger', icon: Bug, href: '/debugger', devOnly: true },
      { label: 'Tools', icon: Box, href: '/tools' },
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
