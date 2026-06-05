'use client'

import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const baseClass = "flex h-3 w-3 items-center justify-center rounded-full transition-colors cursor-pointer"

export function TitlebarButtons() {
  const [toggleFullscreen, setToggleFullscreen] = useState(false)

  const handleMinimize = async () => {
    await getCurrentWindow().minimize()
  }

  const handleFullscreen = async () => {
    setToggleFullscreen(!toggleFullscreen)
    await getCurrentWindow().setFullscreen(!toggleFullscreen)
  }

  const handleClose = async () => {
    await getCurrentWindow().close();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        id="titlebar-close"
        className={`${baseClass} bg-[#FF5F57]`}
        title="Close"
        onClick={handleClose}
      />

      <button
        id="titlebar-minimize"
        className={`${baseClass} bg-[#FFBD2E]`}
        title="Minimize"
        onClick={handleMinimize}
      />

      <button
        id="titlebar-maximize"
        className={`${baseClass} bg-[#28C840]`}
        title="Fullscreen"
        onClick={handleFullscreen}
      />

    </div>
  );
}
