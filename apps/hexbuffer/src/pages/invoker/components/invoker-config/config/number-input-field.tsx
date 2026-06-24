import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumberInputFieldProps {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function NumberInputField({
  label,
  value,
  onChange,
  placeholder,
}: NumberInputFieldProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
