import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROTOCOLS } from '../constants';
import type { PacketFilters } from '../types';

interface PacketFiltersProps {
  filters: PacketFilters;
  onFilterChange: <Key extends keyof PacketFilters>(key: Key, value: PacketFilters[Key]) => void;
  onReset: () => void;
}

export function PacketFilters({ filters, onFilterChange, onReset }: PacketFiltersProps) {
  return (
    <div className="grid shrink-0 grid-cols-1 gap-2 border-b bg-background px-3 py-2 lg:grid-cols-[minmax(180px,1.2fr)_repeat(5,minmax(100px,0.8fr))_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => onFilterChange('query', event.target.value)}
          placeholder="Search packets"
          className="h-8 pl-8"
        />
      </div>
      <Select value={filters.protocol} onValueChange={(value) => onFilterChange('protocol', value as PacketFilters['protocol'])}>
        <SelectTrigger size="sm" className="w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROTOCOLS.map((protocol) => (
            <SelectItem key={protocol} value={protocol}>
              {protocol === 'all' ? 'Any protocol' : protocol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={filters.sourceIp} onChange={(event) => onFilterChange('sourceIp', event.target.value)} placeholder="Source IP" className="h-8" />
      <Input value={filters.destinationIp} onChange={(event) => onFilterChange('destinationIp', event.target.value)} placeholder="Destination IP" className="h-8" />
      <Input value={filters.destinationPort} onChange={(event) => onFilterChange('destinationPort', event.target.value)} placeholder="Port" className="h-8" />
      <Input value={filters.host} onChange={(event) => onFilterChange('host', event.target.value)} placeholder="Host contains" className="h-8" />
      <div className="flex items-center gap-1">
        <Button type="button" size="icon-sm" variant="outline" onClick={onReset} title="Reset filters">
          <X className="size-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" title="Filter fields include protocol, IP, ports, method, host, URL, status, and content type">
          <Filter className="size-4" />
        </Button>
      </div>
    </div>
  );
}
