import * as React from 'react';
import { FEATURE_DESCRIPTIONS, FEATURE_IMAGES } from '../constants';

const CONTAINER_SIZE = "size-24";
const INNER_SIZE = "size-[72px]";
const IMG_SIZE = "size-[50px]";
const ICON_SIZE = "size-9";
const TEXT_SIZE = "text-[11px]";

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
      className={`group relative flex flex-col items-center justify-center ${CONTAINER_SIZE} rounded-md border border-transparent transition-all duration-200 cursor-pointer text-center select-none`}
      title={FEATURE_DESCRIPTIONS[label]}
    >
      {FEATURE_IMAGES[label] ? (
        <div className={`flex items-center justify-center ${INNER_SIZE}`}>
          <img
            src={FEATURE_IMAGES[label]}
            alt={label}
            className={`${IMG_SIZE} object-contain select-none transition-transform duration-200 group-hover:scale-110 rounded-sm`}
          />
        </div>
      ) : (
        <div className={`flex items-center justify-center ${INNER_SIZE} rounded bg-muted/40 dark:bg-white/[0.03] group-hover:bg-primary/10 transition-all duration-200`}>
          <IconComp className={`${ICON_SIZE} text-muted-foreground group-hover:text-primary transition-colors duration-200`} />
        </div>
      )}

      <span className={`${TEXT_SIZE} font-medium text-muted-foreground group-hover:text-foreground mt-3 line-clamp-2 leading-tight px-1 break-all`}>
        {label}
      </span>
    </div>
  );
}
