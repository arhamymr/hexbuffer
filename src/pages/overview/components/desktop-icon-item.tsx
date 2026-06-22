import * as React from 'react';
import { FEATURE_DESCRIPTIONS, FEATURE_IMAGES } from '../constants';

interface DesktopIconItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  devOnly?: boolean;
  onClick: (href: string) => void;
}

export function DesktopIconItem({ href, label, icon: IconComp, devOnly, onClick }: DesktopIconItemProps) {
  return (
    <div
      onClick={() => onClick(href)}
      className="group relative flex flex-col items-center justify-center p-2 w-24 h-24 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:shadow-[0_0_12px_-2px_rgba(0,201,80,0.15)] transition-all duration-200 cursor-pointer text-center select-none"
      title={FEATURE_DESCRIPTIONS[label]}
    >
      {devOnly && (
        <div
          className="absolute top-2 right-2 size-2 rounded-full bg-amber-500 ring-2 ring-background"
          title="Development Only"
        />
      )}

      {FEATURE_IMAGES[label] ? (
        <div className="flex items-center justify-center size-12">
          <img
            src={FEATURE_IMAGES[label]}
            alt={label}
            className="size-10 object-contain select-none transition-transform duration-200 group-hover:scale-110"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center size-12 rounded bg-muted/40 dark:bg-white/[0.03] group-hover:bg-primary/10 transition-all duration-200">
          <IconComp className="size-6 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
        </div>
      )}

      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground mt-2 line-clamp-2 leading-tight px-1 break-all">
        {label}
      </span>
    </div>
  );
}
