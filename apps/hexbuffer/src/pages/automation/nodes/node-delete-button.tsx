import { Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface NodeDeleteButtonProps {
  nodeId: string;
  selected?: boolean;
}

export function NodeDeleteButton({ nodeId, selected }: NodeDeleteButtonProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove the node
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    // Remove connected edges
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className={cn(
        'absolute -right-2 -top-2 z-10 flex size-5 items-center justify-center',
        'rounded-full bg-red-500 text-white shadow-sm',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        selected && 'opacity-100',
        'hover:bg-red-600 hover:scale-110 active:scale-95',
      )}
      title="Delete node"
    >
      <Trash2 className="size-2.5" />
    </button>
  );
}
