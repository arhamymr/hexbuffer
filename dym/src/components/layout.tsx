'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from './ui/sidebar';
import { Navbar } from './navbar';
import type { Target } from '@/types';
import {
  Zap,
  History,
  Settings,
  Send,
  Crosshair,
  Bug,
  Moon,
  Sun,
  FileText,
} from 'lucide-react';
import { useTheme } from './theme-provider';

interface LayoutProps {
  targets: Target[];
  selectedTarget: Target | null;
  onTargetSelect: (target: Target | null) => void;
  onTargetUpdated: () => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
  children?: React.ReactNode;
}

const mainNavItems = [
  { label: 'Live', icon: Zap, href: '/' },
  { label: 'Repeater', icon: Send, href: '/repeater' },
  { label: 'Intruder', icon: Crosshair, href: '/intruder' },
  { label: 'Findings', icon: FileText, href: '/findings' },
  { label: 'History', icon: History, href: '/history' },
  { label: 'Debugger', icon: Bug, href: '/debugger' },
];

function AppSidebar({
  currentPage = '/',
  onNavigate,
}: {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPage === '/'}>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('/'); }}>
                <Zap className="size-4" />
                <span>Bug Bounty Tools</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPage === item.href}
                      tooltip={item.label}
                    >
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate?.(item.href);
                        }}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={currentPage === '/settings'}
              tooltip="Settings"
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.('/settings');
                }}
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function Layout({
  targets,
  selectedTarget,
  onTargetSelect,
  onTargetUpdated,
  currentPage = '/',
  onNavigate,
  children,
}: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col">
        <Navbar
          targets={targets}
          selectedTarget={selectedTarget}
          onTargetSelect={onTargetSelect}
          onTargetUpdated={onTargetUpdated}
        />

        <div className="flex flex-1 overflow-hidden">
          <AppSidebar currentPage={currentPage} onNavigate={onNavigate} />

          <SidebarInset>
            <main className="flex-1 overflow-auto p-6 bg-background">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
