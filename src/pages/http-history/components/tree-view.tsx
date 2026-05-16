import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Globe, Folder, FileText } from "lucide-react";
import { useState } from "react";
import type { TreeNodeData } from "../mock";

interface TreeViewProps {
  data: TreeNodeData[];
  onSelectEndpoint: (node: TreeNodeData) => void;
  selectedId: string | null;
}

function getMethodVariant(method: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    GET: "default",
    POST: "default",
    PUT: "default",
    DELETE: "destructive",
    PATCH: "secondary",
  };
  return variants[method] || "secondary";
}

function TreeNodeComponent({
  node,
  level,
  onSelectEndpoint,
  selectedId,
  defaultExpanded,
}: {
  node: TreeNodeData;
  level: number;
  onSelectEndpoint: (node: TreeNodeData) => void;
  selectedId: string | null;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const isEndpoint = node.type === "endpoint";

  const Icon = node.type === "host" ? Globe : node.type === "path" ? Folder : FileText;
  const iconColor =
    node.type === "host"
      ? "text-blue-500"
      : node.type === "path"
        ? "text-yellow-500"
        : "text-gray-500";

  return (
    <div>
      <div
        className={cn(
          "flex items-center font-mono gap-1.5 px-2 py-1 hover:bg-muted/50 cursor-pointer rounded-sm transition-colors",
          selectedId === node.id && "bg-muted"
        )}
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={() => {
          if (isEndpoint) {
            onSelectEndpoint(node);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        <Icon className={cn("w-3 h-3 flex-shrink-0", iconColor)} />
        <span className={cn("text-xs truncate flex-1", isEndpoint && "font-mono")}>
          {node.label}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onSelectEndpoint={onSelectEndpoint}
              selectedId={selectedId}
              defaultExpanded={level < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({
  data,
  onSelectEndpoint,
  selectedId,
}: TreeViewProps) {
  return (
    <div className="h-full overflow-auto">
      {data.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          onSelectEndpoint={onSelectEndpoint}
          selectedId={selectedId}
          defaultExpanded={true}
        />
      ))}
    </div>
  );
}