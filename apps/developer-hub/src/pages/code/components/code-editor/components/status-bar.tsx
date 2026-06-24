interface StatusBarProps {
  filePath: string | null;
  language: string;
}

export function StatusBar({ filePath, language }: StatusBarProps) {
  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t bg-muted/40 px-3 text-[11px] text-muted-foreground">
      <span className="min-w-0 truncate">{filePath ?? 'No file selected'}</span>
      <span className="shrink-0 uppercase">{language || 'text'}</span>
    </div>
  );
}
