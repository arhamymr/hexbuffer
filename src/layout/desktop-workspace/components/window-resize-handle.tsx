import * as React from "react";

interface WindowResizeHandleProps {
  onMouseDown: React.MouseEventHandler;
}

export const WindowResizeHandle = React.memo(function WindowResizeHandle({
  onMouseDown,
}: WindowResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute bottom-0 right-0 z-30 size-4 cursor-se-resize flex items-end justify-end p-0.5"
    >
      <svg
        className="size-2.5 text-muted-foreground/40"
        viewBox="0 0 10 10"
      >
        <path
          d="M10,0 L0,10 M10,4 L4,10 M10,8 L8,10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});
