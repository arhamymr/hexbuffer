'use client';

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bug, Send, Crosshair, History, Settings, Moon, Sun, Asterisk } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';

const mainNavItems = [
  { label: 'Home', icon: Bug, href: '/' },
  { label: 'Repeater', icon: Send, href: '/repeater' },
  { label: 'Brute Force', icon: Crosshair, href: '/brute-force' },
  { label: 'History', icon: History, href: '/history' },
  { label: 'Debugger', icon: Bug, href: '/debugger' },
];

export function TopNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-1">
          <img src="https://assets.apsaradigital.com/logo.png" className="h-5 w-28 shrink-0" alt="Logo" />
        </div>

        <nav className="flex items-center gap-0.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm transition-colors
                  border-b-2 -mb-px
                  ${isActive
                    ? 'border-green-500 text-foreground bg-muted/30'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-md'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link to="/settings">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}