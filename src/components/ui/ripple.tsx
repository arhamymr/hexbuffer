import * as React from "react";
import { cn } from '@/lib/utils';;

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

interface UseRippleOptions {
  disabled?: boolean;
  color?: string;
  duration?: number;
}

export function useRipple(options: UseRippleOptions = {}) {
  const { disabled = false, duration = 600 } = options;
  const [ripples, setRipples] = React.useState<RippleProps[]>([]);

  const addRipple = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;

      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      const newRipple = { x, y, size };
      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, duration);
    },
    [disabled, duration]
  );

  return { ripples, addRipple };
}

interface RippleContainerProps {
  ripples: RippleProps[];
  color?: string;
  duration?: number;
  className?: string;
}

export function RippleContainer({
  ripples,
  color = "currentColor",
  duration = 600,
  className,
}: RippleContainerProps) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className
      )}
    >
      {ripples.map((ripple, index) => (
        <span
          key={index}
          className="absolute animate-ripple rounded-full opacity-30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </span>
  );
}

// Global click ripple effect hook
export function useGlobalRipple(options: UseRippleOptions = {}) {
  const { disabled = false, color = "rgba(255, 255, 255, 0.4)", duration = 500 } = options;

  React.useEffect(() => {
    if (disabled) return;

    const handleClick = (event: MouseEvent) => {
      const ripple = document.createElement("span");
      const size = 20;
      const x = event.clientX - size / 2;
      const y = event.clientY - size / 2;

      ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        animation: globalRipple ${duration}ms ease-out forwards;
      `;

      document.body.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, duration);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [disabled, color, duration]);
}

// Inject global ripple animation styles
if (typeof document !== "undefined") {
  const styleId = "global-ripple-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes globalRipple {
        0% {
          transform: scale(1);
          opacity: 0.6;
        }
        100% {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
