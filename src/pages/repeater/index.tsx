'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Components removed for dummy data

const TOOLS_TABS = [
  { id: 'decoder', name: 'Decoder' },
  { id: 'encoder', name: 'Encoder' },
  { id: 'hash', name: 'Hash' },
  { id: 'subdomain', name: 'Subdomain' },
  { id: 'fuzz', name: 'Fuzz Scanner' },
  { id: 'utils', name: 'Others' },
];

export function RepeaterPage() {

  const handleSendRequest = async () => {
    
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">

      <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
    
        <Input
          type="text"
          placeholder="Enter URL (e.g., https://api.example.com/endpoint)"
          value={" https://api.example.com/endpoint"}
          onChange={(e) => console.log("onchange")}
          className="flex-1 font-mono text-sm"
        />

        <Button onClick={handleSendRequest} className="gap-2">
          Send
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r flex flex-col">
          <div className="p-4">
            <h3 className="font-semibold mb-2">Request Headers</h3>
            <pre className="text-sm font-mono bg-muted p-2 rounded">{`{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer token"\n}`}</pre>
            <h3 className="font-semibold mb-2 mt-4">Request Body</h3>
            <pre className="text-sm font-mono bg-muted p-2 rounded">{`{\n  "key": "value"\n}`}</pre>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="p-4">
            <h3 className="font-semibold mb-2">Response</h3>
            <pre className="text-sm font-mono bg-muted p-2 rounded">{`{\n  "status": 200,\n  "message": "OK"\n}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}