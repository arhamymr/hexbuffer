import { useNavigate } from 'react-router-dom';
import { TOOL_OVERVIEW_ITEMS } from './constants';
import type { ToolOverviewItem } from './constants';

interface ToolIconCardProps {
  item: ToolOverviewItem;
  onClick: (href: string) => void;
}

function ToolIconCard({ item, onClick }: ToolIconCardProps) {
  const Icon = item.icon;
  return (
    <div
      onClick={() => onClick(item.href)}
      title={item.description}
      className="group relative flex flex-col items-center justify-center size-24 rounded-md border border-transparent transition-all duration-200 cursor-pointer text-center select-none"
    >
      <div className="flex items-center justify-center size-[72px] rounded bg-muted/40 dark:bg-white/[0.03] group-hover:bg-primary/10 transition-all duration-200">
        <Icon className="size-9 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground mt-3 line-clamp-2 leading-tight px-1 break-all">
        {item.label}
      </span>
    </div>
  );
}

export function ToolsOverviewPage() {
  const navigate = useNavigate();

  const handleClick = (href: string) => {
    navigate(href);
  };

  return (
    <div className="bg-background flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-base font-semibold text-foreground">Tools</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Encoders, decoders, hashes, and other payload helper utilities.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {TOOL_OVERVIEW_ITEMS.map((item) => (
            <ToolIconCard key={item.id} item={item} onClick={handleClick} />
          ))}
        </div>
      </div>
    </div>
  );
}
