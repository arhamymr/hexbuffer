import * as React from "react";
import { useNavigate } from "react-router-dom";
import { XIcon } from "@phosphor-icons/react";

import { useNavStore } from "@/stores/nav";

interface WindowMinimizedOverlayProps {
  id: string;
  navItem?: any;
  currentScale: number;
}

export const WindowMinimizedOverlay = React.memo(function WindowMinimizedOverlay({
  id,
  navItem,
  currentScale,
}: WindowMinimizedOverlayProps) {
  const navigate = useNavigate();
  const closeWindow = useNavStore((s) => s.closeWindow);

  return (
    <div className="absolute inset-0 z-50 cursor-pointer bg-black/10 hover:bg-black/5 transition-colors flex items-center justify-center">
      <div 
        className="bg-background/95 p-2.5 rounded-full shadow-xl border border-border/60 flex items-center justify-center"
        style={{ transform: 'scale(8)' }}
      >
        {navItem && (
          <navItem.icon className="size-4 text-primary shrink-0" />
        )}
      </div>

      {/* Close button for minimized window */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          closeWindow(id, navigate);
        }}
        className="flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg border border-background/40 transition-all active:scale-95 duration-100"
        style={{ 
          position: 'absolute',
          top: `${6 / currentScale}px`,
          right: `${6 / currentScale}px`,
          width: '18px',
          height: '18px',
          transform: 'scale(7)',
          transformOrigin: 'center',
        }}
        title="Close Window"
      >
        <XIcon className="size-2.5 stroke-[2.5]" />
      </button>
    </div>
  );
});
