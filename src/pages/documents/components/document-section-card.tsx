import { Textarea } from '@/components/ui/textarea';
import { type DocumentSectionKey } from '../constants';

interface DocumentSectionCardProps {
  sectionKey: DocumentSectionKey;
  title: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (sectionKey: DocumentSectionKey, value: string) => void;
}

export function DocumentSectionCard({
  sectionKey,
  title,
  description,
  placeholder,
  value,
  onChange,
}: DocumentSectionCardProps) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-xs">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(sectionKey, event.target.value)}
        placeholder={placeholder}
        className="min-h-28 resize-y"
      />
    </section>
  );
}
