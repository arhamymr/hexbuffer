'use client'

import { useTitlebarButtons } from './hooks/use-titlebar-buttons';

const baseClass = "flex size-3 items-center justify-center rounded-full transition-all duration-200 cursor-pointer hover:scale-110"

export function TitlebarButtons() {
  const { handleClose, handleFullscreen, handleMinimize } = useTitlebarButtons();

  return (
    <div className="flex items-center gap-3 bg-muted p-1 rounded-full">
      <button
        id="titlebar-close"
        className={`${baseClass} bg-[#FF5F57] hover:shadow-[0_0_5px_1px_rgba(255,95,87,0.35)]`}
        title="Close"
        onClick={handleClose}
      />

      <button
        id="titlebar-minimize"
        className={`${baseClass} bg-[#FFBD2E] hover:shadow-[0_0_5px_1px_rgba(255,189,46,0.35)]`}
        title="Minimize"
        onClick={handleMinimize}
      />

      <button
        id="titlebar-maximize"
        className={`${baseClass} bg-[#28C840] hover:shadow-[0_0_5px_1px_rgba(40,200,64,0.35)]`}
        title="Fullscreen"
        onClick={handleFullscreen}
      />

    </div>
  );
}
