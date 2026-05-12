"use client";

import * as React from 'react';
import { Badge } from './ui/badge';

export function Footer() {
  return (
    <footer className="flex items-center justify-between h-10 px-4 border-t bg-card text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          AppRecon
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <span>Bug Bounty Tools v0.1.0</span>
      </div>
    </footer>
  );
}
