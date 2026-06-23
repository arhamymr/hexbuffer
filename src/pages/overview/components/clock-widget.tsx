import * as React from 'react';
import { Clock } from 'lucide-react';

export function ClockWidget() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateString = time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-2 rounded-md border bg-background/30 dark:bg-background/10 backdrop-blur-md flex flex-col justify-center select-none">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="size-3.5 text-primary" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">System Time</span>
      </div>
      <div className="text-2xl font-bold font-mono text-foreground tracking-widest leading-none">{timeString}</div>
      <div className="text-[10px] text-muted-foreground font-medium mt-1.5">{dateString}</div>
    </div>
  );
}
