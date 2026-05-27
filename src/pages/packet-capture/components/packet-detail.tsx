import { InspectorSection, type KeyValue } from '@/pages/live-traffic/components/log-table/inspector';
import type { Packet, PacketField } from '../types';

interface PacketDetailProps {
  packet: Packet | null;
  selectedField: PacketField | null;
  onSelectField: (field: PacketField) => void;
}

export function PacketDetail({ packet, selectedField, onSelectField }: PacketDetailProps) {
  if (!packet) {
    return <EmptyPanel label="Select a packet to inspect decoded layers." />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-3 py-2">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Packet Details</div>
        <div className="truncate font-mono text-xs">{packet.info}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {packet.layers.map((layer) => (
          <InspectorSection
            key={layer.name}
            title={layer.name}
            defaultView="table"
            items={layer.fields.map(fieldToInspectorItem)}
            onItemSelect={(item) => {
              const field = layer.fields.find((candidate) => candidate.label === item.name && candidate.value === item.value);

              if (field) {
                onSelectField(field);
              }
            }}
            isItemSelected={(item) => selectedField?.label === item.name && selectedField?.value === item.value}
          />
        ))}
      </div>
    </div>
  );
}

function fieldToInspectorItem(field: PacketField): KeyValue {
  return {
    name: field.label,
    value: field.value,
  };
}

function EmptyPanel({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{label}</div>;
}
