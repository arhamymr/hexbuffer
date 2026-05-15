import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { MOCK_TREE_DATA, type TreeNodeData } from "./data/mock";
import { TreeView } from "./components/TreeView";
import { EndpointDetail } from "./components/EndpointDetail";
import { MethodFilter } from "./components/MethodFilter";
import { useState } from "react";
import { Map } from "lucide-react";

export function SitemapPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<TreeNodeData | null>(MOCK_TREE_DATA[0]?.children[0]?.children[0]?.children[0] || null);
  const [methodFilter, setMethodFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4" />
          <h1 className="text-sm font-semibold">Sitemap</h1>
        </div>
        <MethodFilter
          value={methodFilter}
          onChange={setMethodFilter}
          onSearch={setSearchQuery}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={30} minSize={30}>
            <div className="h-full overflow-hidden border-r">
              <TreeView
                data={MOCK_TREE_DATA}
                onSelectEndpoint={setSelectedEndpoint}
                selectedId={selectedEndpoint?.id || null}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} minSize={30}>
            <EndpointDetail node={selectedEndpoint} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default SitemapPage;