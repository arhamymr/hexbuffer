'use client'

import { useState } from 'react';
import { Maximize2, Minus, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const baseClass = "flex h-3 w-3 items-center justify-center rounded-full transition-colors cursor-pointer"
const iconClass = "size-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"

export function TitlebarButtons() {
  const [toggleFullscreen, setToggleFullscreen] = useState(false)

  const handleMinimize = async () => {
    await getCurrentWindow().minimize()
  }

  const handleFullscreen = async() => {
    setToggleFullscreen(!toggleFullscreen)
    await getCurrentWindow().setFullscreen(!toggleFullscreen)
  }

  const handleClose = async() => {
    await getCurrentWindow().close();
  }

  return (
    <div className="ml-3 flex items-center gap-2">
      
      <button
        id="titlebar-minimize"
        className={`${baseClass} bg-[#FFBD2E] group`}
        title="Minimize"
        onClick={handleMinimize}
      >
        <Minus className={iconClass} />
      </button>
      <button
        id="titlebar-maximize"
        className={`${baseClass} bg-[#28C840] group`}
        title="Fullscreen"
        onClick={handleFullscreen}
      >
        <Maximize2 className={iconClass} />
      </button>
      <button
        id="titlebar-close"
        className={`${baseClass} bg-[#FF5F57] group`}
        title="Close"
        onClick={handleClose}
      >
        <X className={iconClass} />
      </button>
    </div>
  );
}
