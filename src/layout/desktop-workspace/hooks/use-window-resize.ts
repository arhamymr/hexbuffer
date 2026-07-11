import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useNavStore } from "@/stores/nav";

interface UseWindowResizeProps {
  id: string;
  size: { width: number; height: number };
  windowRef: React.RefObject<HTMLDivElement | null>;
}

export function useWindowResize({ id, size, windowRef }: UseWindowResizeProps) {
  const navigate = useNavigate();
  const focusWindow = useNavStore((s) => s.focusWindow);
  const updateWindowSize = useNavStore((s) => s.updateWindowSize);

  const [isResizing, setIsResizing] = React.useState(false);
  const resizeStartRef = React.useRef({
    mouseX: 0,
    mouseY: 0,
    startW: 0,
    startH: 0,
  });
  const resizeCurrentSizeRef = React.useRef(size);
  const resizeRafIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    resizeCurrentSizeRef.current = size;
  }, [size]);

  const handleResizeMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startW: size.width,
        startH: size.height,
      };
      resizeCurrentSizeRef.current = size;
      focusWindow(id, navigate);
    },
    [id, size, focusWindow, navigate]
  );

  React.useEffect(() => {
    if (!isResizing) return;

    document.body.classList.add("select-none-global");

    const handleMouseMove = (e: MouseEvent) => {
      const dw = e.clientX - resizeStartRef.current.mouseX;
      const dh = e.clientY - resizeStartRef.current.mouseY;

      const newWidth = Math.max(400, resizeStartRef.current.startW + dw);
      const newHeight = Math.max(300, resizeStartRef.current.startH + dh);

      resizeCurrentSizeRef.current = { width: newWidth, height: newHeight };

      if (resizeRafIdRef.current) cancelAnimationFrame(resizeRafIdRef.current);
      resizeRafIdRef.current = requestAnimationFrame(() => {
        if (windowRef.current) {
          windowRef.current.style.width = `${newWidth}px`;
          windowRef.current.style.height = `${newHeight}px`;
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      updateWindowSize(id, resizeCurrentSizeRef.current);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.classList.remove("select-none-global");
      if (resizeRafIdRef.current) cancelAnimationFrame(resizeRafIdRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, id, updateWindowSize, windowRef]);

  return { isResizing, handleResizeMouseDown };
}
