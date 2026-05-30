import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatLine {
  label: string;
  value: React.ReactNode;
  sub?: string;
}

interface DashboardCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  stats: StatLine[];
  to: string;
  className?: string;
}

export function DashboardCard({ title, icon: Icon, stats, to, className }: DashboardCardProps) {
  return (
    <Card className={cn('flex flex-col justify-between', className)} size="sm">
      <div>
        <CardHeader className="flex-row items-center gap-2 pb-1">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono font-medium tabular-nums">{stat.value}</span>
                {stat.sub && (
                  <span className="text-xs text-muted-foreground">{stat.sub}</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </div>
      <CardContent className="pt-0">
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open {title}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
