import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface MethodFilterProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
}

const METHODS = ['All', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

export function MethodFilter({ value, onChange, onSearch }: MethodFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          className="h-7 pl-8 pr-3 w-36 text-xs"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-24 text-xs">
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent>
          {METHODS.map((method) => (
            <SelectItem key={method} value={method}>
              {method}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}