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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarInset,
  useSidebar,
} from './ui/sidebar';
import { ChevronLeft, ChevronRight, History, Settings, Send, Crosshair, Bug, Moon, Sun, Asterisk } from 'lucide-react';
import { Footer } from './footer';
import { useTheme } from './theme-provider';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';

const mainNavItems = [
  { label: 'Home', icon: Bug, href: '/' },
  { label: 'Repeater', icon: Send, href: '/repeater' },
  { label: 'Brute Force', icon: Crosshair, href: '/brute-force' },
  { label: 'History', icon: History, href: '/history' },
  { label: 'Debugger', icon: Bug, href: '/debugger' },
];

function NavButton({ item }: { item: typeof mainNavItems[0] }) {
  const location = useLocation();
  const pathname = location.pathname;
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
        <Link href={item.href}>
          <Icon className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function FooterButtons() {
  const location = useLocation();
  const pathname = location.pathname;
  const { theme, toggleTheme } = useTheme();
  const { state, toggleSidebar } = useSidebar();

  return (
    <>
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
          <span className="group-data-[collapsible=icon]:hidden">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={toggleSidebar} tooltip={state === 'expanded' ? 'Collapse' : 'Expand'}>
          {state === 'expanded' ? <ChevronLeft className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <span className="group-data-[collapsible=icon]:hidden">{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="group-data-[collapsible=icon]:hidden p-2">
          <img src="https://assets.apsaradigital.com/logo.png" className="h-4 w-24 shrink-0" alt="Logo" />
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex">
          <Button size="sm" variant="outline" className="w-full border-green-500">
            <Asterisk className="size-4  text-green-500" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainNavItems.map((item) => <NavButton key={item.href} item={item} />)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter><SidebarMenu><FooterButtons /></SidebarMenu></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col gap-4 p-4 h-full h-min-[100%]">{children}</div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}