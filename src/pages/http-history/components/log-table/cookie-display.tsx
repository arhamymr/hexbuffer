import { COOKIE_COLORS, parseCookieHeader } from './utils';

interface CookieDisplayProps {
  cookies: { name: string; value: string }[];
}

export function CookieDisplay({ cookies }: CookieDisplayProps) {
  if (cookies.length === 0) {
    return <span className="text-muted-foreground">No cookies</span>;
  }
  return (
    <div className="bg-background p-2 rounded border border-border/50 overflow-auto max-h-48">
      <div className="flex flex-wrap gap-2 break-words">
        {[...cookies].reverse().map((cookie, i) => {
          const color = COOKIE_COLORS[i % COOKIE_COLORS.length];
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono border ${color.bg} ${color.text} ${color.border}`}
            >
              <span className="font-semibold">{cookie.name}</span>
              <span className="opacity-50">=</span>
              <span className="whitespace-normal break-all">{cookie.value}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export { parseCookieHeader };
