import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useNavStore } from "@/stores/nav";

interface UseWindowDragProps {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  windowRef: React.RefObject<HTMLDivElement | null>;
}

export function useWindowDrag({ id, position, size, windowRef }: UseWindowDragProps) {
  const navigate = useNavigate();
  const focusWindow = useNavStore((s) => s.focusWindow);
  const updateWindowPosition = useNavStore((s) => s.updateWindowPosition);

  const dragStartRef = React.useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const dragCurrentPosRef = React.useRef(position);
  const dragRafIdRef = React.useRef<number | null>(null);
  // ponytail: capture container bounds once at drag start, not on every mousemove
  const dragContainerRectRef = React.useRef<DOMRect | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    dragCurrentPosRef.current = position;
  }, [position]);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      // Only drag with left click
      if (e.button !== 0) return;

      // Do not drag if clicking control buttons
      const target = e.target as HTMLElement;
      if (target.closest(".window-control-btn")) return;

      // Capture the container bounds once at drag start
      dragContainerRectRef.current =
        windowRef.current?.parentElement?.getBoundingClientRect() ?? null;

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      dragCurrentPosRef.current = position;

      focusWindow(id, navigate);
    },
    [id, position, focusWindow, navigate, windowRef]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    document.body.classList.add("select-none-global");

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const raw = dragContainerRectRef.current;
      // ponytail: container is inset-0, so left/top are always 0; only width/height bound the drag
      const containerW = raw ? raw.width : window.innerWidth;
      const containerH = raw ? raw.height : window.innerHeight;

      const HEADER_H = 36; // keep title bar reachable
      const newX = Math.min(Math.max(0, dragStartRef.current.posX + dx), containerW - size.width);
      const newY = Math.min(Math.max(0, dragStartRef.current.posY + dy), containerH - HEADER_H);

      dragCurrentPosRef.current = { x: newX, y: newY };

      if (dragRafIdRef.current) cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = requestAnimationFrame(() => {
        if (windowRef.current) {
          windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      updateWindowPosition(id, dragCurrentPosRef.current);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.classList.remove("select-none-global");
      if (dragRafIdRef.current) cancelAnimationFrame(dragRafIdRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, id, size, updateWindowPosition, windowRef]);

  return { isDragging, handleMouseDown };
}
