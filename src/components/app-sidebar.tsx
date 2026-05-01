'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { Separator } from './ui/separator';
import { Navbar } from './navbar';
import { Footer } from './footer';
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
} from 'lucide-react';
import { useTheme } from './theme-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/app/context/AppContext';

const mainNavItems = [
  { label: 'Live', icon: Zap, href: '/' },
  { label: 'Repeater', icon: Send, href: '/repeater' },
  { label: 'Intruder', icon: Crosshair, href: '/intruder' },
  { label: 'History', icon: History, href: '/history' },
  { label: 'Debugger', icon: Bug, href: '/debugger' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { state, toggleSidebar } = useSidebar();
  const [proxyRunning, setProxyRunning] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke<{ running: boolean }>('get_proxy_status');
        setProxyRunning(status.running);
      } catch (e) {
        console.error('Failed to get proxy status:', e);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/'}>
              <Link href="/">
                <Zap className="size-4" />
                <span>Bug Bounty Tools</span>
              </Link>
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
                const showBadge = item.href === '/' && proxyRunning;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
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
              isActive={pathname === '/settings'}
              tooltip="Settings"
            >
              <Link href="/settings">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip={state === 'expanded' ? 'Collapse Sidebar' : 'Expand Sidebar'}>
              {state === 'expanded' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              <span>{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { targets, selectedTarget, fetchTargets } = useAppState();
  const { onTargetSelect, onTargetUpdated } = React.useMemo(() => ({
    onTargetSelect: () => {},
    onTargetUpdated: fetchTargets,
  }), [fetchTargets]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar
          targets={targets}
          selectedTarget={selectedTarget}
          onTargetSelect={onTargetSelect}
          onTargetUpdated={onTargetUpdated}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}