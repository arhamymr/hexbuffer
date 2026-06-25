import { Triangle, TriangleDashed } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTriangleLogo } from "./hooks/use-triangle-logo";

type PulseTriangleSize = "small" | "medium" | "large";

const triangleLogoSizes: Record<PulseTriangleSize, string> = {
  small: "size-3",
  medium: "size-4",
  large: "size-6",
};

const pulseTriangleAnimation =
  "animate-[triangle-pulse_2.8s_cubic-bezier(0.45,0,0.2,1)_infinite] motion-reduce:animate-none";
const pulseTriangleIconBase =
  "absolute inset-0 block origin-center stroke-current will-change-[opacity,transform]";
const pulseTriangleSolidAnimation =
  "animate-[triangle-solid_2.8s_cubic-bezier(0.45,0,0.2,1)_infinite] motion-reduce:animate-none";
const pulseTriangleDashedAnimation =
  "animate-[triangle-dashed_2.8s_cubic-bezier(0.45,0,0.2,1)_infinite] motion-reduce:animate-none";

type PulseTriangleProps = {
  size?: PulseTriangleSize;
  className?: string;
};

export function TriangleLogo({ size = "medium", className }: PulseTriangleProps) {
  const sizeClass = triangleLogoSizes[size];
  const { isConnected } = useTriangleLogo();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0",
        isConnected && pulseTriangleAnimation,
        isConnected ? "text-primary" : "text-muted-foreground",
        sizeClass,
        className
      )}
      aria-hidden="true"
    >
      <Triangle
        className={cn(
          pulseTriangleIconBase,
          isConnected && pulseTriangleSolidAnimation,
          sizeClass
        )}
      />
      <TriangleDashed
        className={cn(
          pulseTriangleIconBase,
          isConnected && pulseTriangleDashedAnimation,
          sizeClass
        )}
      />
    </span>
  );
}
