import React from 'react';
import { Home, ShieldCheck, List } from 'lucide-react';

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
  { label: 'Playground', icon: Home, href: '/' },
  { label: 'Code Audit', icon: ShieldCheck, href: '/code-audit' },
  { label: 'APIs Collection', icon: List, href: '/api-collection' }
];

export const mainNavItems = allNavItems;

export const allCategories: NavCategory[] = [
  {
    label: 'Develop',
    icon: Home,
    items: [
      { label: 'Playground', icon: Home, href: '/' },
      { label: 'Code Audit', icon: ShieldCheck, href: '/code-audit' },
      { label: 'APIs Collection', icon: List, href: '/api-collection' }
    ],
  }
];

export const navCategories = allCategories;
