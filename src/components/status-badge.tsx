export function getStatusColor(status: number | null | undefined) {
  if (!status) return 'bg-gray-500';
  if (status >= 200 && status < 300) return 'bg-green-600';
  if (status >= 300 && status < 400) return 'bg-blue-600';
  if (status >= 400 && status < 500) return 'bg-orange-600';
  if (status >= 500) return 'bg-red-600';
  return 'bg-gray-600';
}

export function StatusBadge({ status }: { status: number | null }) {
  if (status === null || status === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }
  const colorClass = getStatusColor(status);
  return (
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colorClass}`}>
      {status}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-600',
    POST: 'bg-blue-600',
    PUT: 'bg-orange-600',
    DELETE: 'bg-red-600',
    PATCH: 'bg-purple-600',
    HEAD: 'bg-gray-600',
    OPTIONS: 'bg-teal-600',
    CONNECT: 'bg-indigo-600',
    TRACE: 'bg-cyan-600',
  };
  return (
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colors[method.toUpperCase()] || 'bg-gray-600'}`}>
      {method.toUpperCase()}
    </span>
  );
}
