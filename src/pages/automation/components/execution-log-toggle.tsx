import { Button } from '@/components/ui/button';
import { PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionLogToggleProps {
  showExecutionLog: boolean;
  onToggle: (show: boolean) => void;
}

export function ExecutionLogToggle({ showExecutionLog, onToggle }: ExecutionLogToggleProps) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className={cn(
        'absolute bottom-2 left-2 z-20 h-7 w-7 rounded-md p-0',
        'bg-background/80 backdrop-blur-sm border',
        'hover:bg-accent'
      )}
      onClick={() => onToggle(!showExecutionLog)}
      title={showExecutionLog ? 'Hide execution log' : 'Show execution log'}
    >
      {showExecutionLog ? (
        <PanelBottomClose className="size-3.5" />
      ) : (
        <PanelBottomOpen className="size-3.5" />
      )}
    </Button>
  );
}
