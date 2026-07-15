import * as React from 'react';
import { allNavItems } from '@/layout/constants';

const CONTAINER_SIZE = "size-20";
const INNER_SIZE = "size-[56px]";
const ICON_SIZE = "size-10";
const TEXT_SIZE = "text-[10px]";

interface DesktopIconItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (href: string) => void;
}

const DEFAULT_COLORS = {
  bg: 'bg-muted/40 dark:bg-white/[0.03]',
  hoverBg: 'group-hover:bg-primary/10',
  border: 'border-transparent'
};

export function DesktopIconItem({ href, label, icon: IconComp, onClick }: DesktopIconItemProps) {
  const item = React.useMemo(() => {
    return allNavItems.find((i) => i.href === href);
  }, [href]);

  const CustomIcon = item?.icon || IconComp;
  const colors = item?.colors || DEFAULT_COLORS;
  const description = item?.description || '';

  return (
    <div
      onClick={() => onClick(href)}
      className={`group relative flex flex-col items-center justify-center ${CONTAINER_SIZE} rounded-sm transition-all duration-200 cursor-pointer text-center select-none`}
      title={description}
    >
      <div className="relative">
        <div className={`flex items-center justify-center ${INNER_SIZE} rounded-sm border ${colors.bg} ${colors.hoverBg} transition-all duration-200 shadow-sm`}>
          <CustomIcon className={`${ICON_SIZE} text-white transition-colors duration-200`} />
        </div>
        {item?.flag && item.flag !== 'release' && (
          <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-extrabold uppercase px-1 rounded-sm scale-90 select-none pointer-events-none tracking-wider ${item.flag === 'alpha'
            ? 'bg-rose-600 text-white dark:bg-rose-700'
            : 'bg-amber-500 text-black dark:bg-amber-600 dark:text-white'
            }`}>
            {item.flag}
          </span>
        )}
      </div>

      <span className={`${TEXT_SIZE} font-medium text-muted-foreground group-hover:text-foreground mt-2 leading-tight px-2 break-all bg-muted rounded-xs`}>
        {label}
      </span>

    </div>
  );
}
