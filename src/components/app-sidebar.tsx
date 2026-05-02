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
import { ChevronLeft, ChevronRight, Target as TargetIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { Separator } from './ui/separator';
import { Footer } from './footer';
import type { Target } from '@/types';
import {
  History,
  Settings,
  Send,
  Crosshair,
  Bug,
  Moon,
  Sun,
  Play,
  Loader2,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { Button } from './ui/button';

const mainNavItems = [
  { label: 'Proxy', icon: TargetIcon, href: '/' },
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
  const [proxyLoading, setProxyLoading] = React.useState(false);

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

  const startProxy = async () => {
    setProxyLoading(true);
    try {
      await invoke('start_proxy', { port: 8888, targetId: null });
      setProxyRunning(true);
    } catch (e) {
      console.error('Failed to start proxy:', e);
    } finally {
      setProxyLoading(false);
    }
  };

  const stopProxy = async () => {
    setProxyLoading(true);
    try {
      await invoke('stop_proxy');
      setProxyRunning(false);
    } catch (e) {
      console.error('Failed to stop proxy:', e);
    } finally {
      setProxyLoading(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Bug Bounty Tools" className="group-data-[collapsible=icon]:![width:2rem] group-data-[collapsible=icon]:!p-0">
              <Link href="/">
                <img src="https://assets.apsaradigital.com/logo-white.png" className="h-3 w-6 shrink-0" alt="Logo" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
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
            {!proxyRunning ? (
              <Button onClick={startProxy} disabled={proxyLoading} size="sm" className="w-full justify-center">
                {proxyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span className="group-data-[collapsible=icon]:hidden">Start Proxy</span>
              </Button>
            ) : (
              <Button onClick={stopProxy} disabled={proxyLoading} variant="destructive" size="sm" className="w-full justify-start">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="group-data-[collapsible=icon]:hidden">Stop Proxy</span>
              </Button>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip="Settings">
              <Link href="/settings">
                <Settings className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              {theme === 'dark' ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
              <span className="ml-2 group-data-[collapsible=icon]:hidden">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip={state === 'expanded' ? 'Collapse' : 'Expand'}>
              {state === 'expanded' ? <ChevronLeft className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
              <span className="group-data-[collapsible=icon]:hidden">{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const targets = useAppStore((s) => s.targets);
  const selectedTarget = useAppStore((s) => s.selectedTarget);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const { onTargetSelect, onTargetUpdated } = React.useMemo(() => ({
    onTargetSelect: () => {},
    onTargetUpdated: fetchTargets,
  }), [fetchTargets]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col gap-4 p-4">
          {children}
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}