import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortScannerTool } from '../components/port-scanner';

export function PortScannerPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 bg-muted/20">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/tools')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs font-semibold text-foreground">Port Scanner</span>
      </div>
      <div className="flex-1 min-h-0">
        <PortScannerTool />
      </div>
    </div>
  );
}
