import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ListenerInteraction, ListenerPayload } from '../types';

const TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  dns: 'secondary',
  http: 'default',
  https: 'outline',
};

interface Props {
  interactions: ListenerInteraction[];
  payloads: ListenerPayload[];
  selectedPayloadFilter: string | null;
  setSelectedPayloadFilter: (id: string | null) => void;
  selectedTypeFilter: string | null;
  setSelectedTypeFilter: (type: string | null) => void;
  selectedInteractionId: string | null;
  setSelectedInteractionId: (id: string | null) => void;
}

export function ListenerInteractions({
  interactions,
  payloads,
  selectedPayloadFilter,
  setSelectedPayloadFilter,
  selectedTypeFilter,
  setSelectedTypeFilter,
  selectedInteractionId,
  setSelectedInteractionId,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-muted px-3 py-2">
        <span className="text-xs font-medium">
          {interactions.length} interaction{interactions.length !== 1 ? 's' : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={selectedPayloadFilter ?? 'all'}
            onValueChange={(v) => setSelectedPayloadFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-6 w-36 text-xs">
              <SelectValue placeholder="All Payloads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payloads</SelectItem>
              {payloads.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedTypeFilter ?? 'all'}
            onValueChange={(v) => setSelectedTypeFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-6 w-28 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dns">DNS</SelectItem>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="https">HTTPS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {interactions.length === 0 ? (
          <div className="flex h-full items-center justify-center p-2 text-xs text-muted-foreground">
            No interactions yet.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/50">
              <tr className="border-b">
                <th className="px-3 py-1.5 text-left font-medium">Type</th>
                <th className="px-3 py-1.5 text-left font-medium">Source IP</th>
                <th className="px-3 py-1.5 text-left font-medium">Method</th>
                <th className="px-3 py-1.5 text-left font-medium">Path</th>
                <th className="px-3 py-1.5 text-left font-medium">Payload</th>
                <th className="px-3 py-1.5 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {interactions.map((i) => {
                const payload = payloads.find((p) => p.id === i.payloadId);
                const isSelected = selectedInteractionId === i.id;
                return (
                  <tr
                    key={i.id}
                    onClick={() => setSelectedInteractionId(i.id)}
                    className={cn(
                      'cursor-pointer border-b transition-colors hover:bg-muted/30',
                      isSelected && 'bg-accent'
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <Badge variant={TYPE_VARIANT[i.interactionType] ?? 'outline'}>
                        {i.interactionType.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px]">{i.sourceIp}</td>
                    <td className="px-3 py-1.5 font-mono">{i.method ?? '-'}</td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate font-mono text-[10px]">
                      {i.path ?? '-'}
                    </td>
                    <td className="px-3 py-1.5">{payload?.name ?? i.payloadId.slice(0, 8)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-[10px]">
                      {new Date(i.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
