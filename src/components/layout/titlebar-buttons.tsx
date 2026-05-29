'use client'

import { useState } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitlebarButtons() {
  const [toggleFullscreen, setToggleFullscreen] = useState(false)

  const handleMinimize = async () => {
    await getCurrentWindow().setMinimizable(true)
  }

  const handleFullscreen = async() => {
    setToggleFullscreen(!toggleFullscreen)
    await getCurrentWindow().setFullscreen(!toggleFullscreen)
  }

  const handleClose = async() => {
    await getCurrentWindow().close();
  }

  return (
    <div className="ml-1 flex items-center border-l pl-1">
      <Button
        id="titlebar-minimize"
        variant="ghost"
        size="xs"
        className="h-8 w-8 p-0"
        title="Minimize"
        onClick={handleMinimize}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        id="titlebar-maximize"
        variant="ghost"
        size="xs"
        className="h-8 w-8 p-0"
        onClick={handleFullscreen}
      
      >
        {toggleFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
      </Button>
      <Button
        id="titlebar-close"
        variant="ghost"
        size="xs"
        className="p-2 hover:bg-destructive hover:text-destructive-foreground/80 dark:hover:bg-destructive/80"
        title="Close"
        onClick={handleClose}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
