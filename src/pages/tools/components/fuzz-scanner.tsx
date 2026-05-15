'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, Trash2, Download, Copy, Upload } from 'lucide-react';
import type { FuzzResult } from '../types';

const COMMON_PATHS = [
  'admin', 'api', 'backup', 'backups', 'bin', 'cgi-bin', 'config', 'conf', 'configuration',
  'dashboard', 'data', 'database', 'db', 'demo', 'dev', 'developer', 'developers', 'doc', 'docs',
  'download', 'downloads', 'editor', 'env', 'error', 'errors', 'ftp', 'git', 'github',
  'hidden', 'home', 'images', 'img', 'include', 'includes', 'index', 'index.php', 'info',
  'install', 'lib', 'library', 'login', 'logs', 'main', 'media', 'member', 'members',
  'monitor', 'new', 'old', 'panel', 'phpinfo', 'private', 'public', 'robots.txt',
  'script', 'scripts', 'search', 'server', 'server-status', 'site', 'sql', 'src',
  'static', 'stats', 'status', 'style', 'styles', 'sys', 'system', 'test', 'tests',
  'tmp', 'tools', 'tmp', 'uploads', 'uploads', 'var', 'vendor', 'web', 'webdav',
  'wp-admin', 'wp-content', 'wp-includes', 'xmlrpc.php', 'administrator', 'manage',
  'backend', 'office', 'portal', 'crm', 'sales', 'marketing', 'support', 'helpdesk',
  '.htaccess', '.git', '.env', '.bash_history', '.ssh', 'config.php', 'settings.php',
  'wp-config.php', 'configuration.php', 'database.php', 'db.php', 'connections',
  'phpmyadmin', 'mysql', 'sql', 'sqlite', 'api/v1', 'api/v2', 'api/v3', 'rest',
  'graphql', 'swagger', 'docs/api', 'api/docs', 'console', 'terminal', 'shell',
  'jenkins', 'ci', 'gitlab', 'bitbucket', 'monitor', 'metrics', 'health', 'ping',
  'auth', 'login', 'signin', 'logout', 'register', 'signup', 'forgot', 'reset',
  'user', 'users', 'account', 'profile', 'settings', 'password', 'avatar', 'upload',
  'file', 'files', 'document', 'documents', 'folder', 'folders', 'share', 'sharing',
  'backup', 'backups', 'dump', 'dumps', 'export', 'import', 'migrate', 'migration',
  'cache', 'caches', 'temp', 'tmp', 'session', 'sessions', 'log', 'logs', 'logging',
  'debug', 'trace', 'test', 'tests', 'testing', 'staging', 'production', 'prod',
  'admin.php', 'login.php', 'dashboard.php', 'index.php', 'main.php', 'home.php',
  'settings.php', 'config.php', 'wp-login.php', 'xmlrpc.php', 'restapi', 'soap',
];

const HTTP_STATUS_CODES: Record<number, { color: string; description: string }> = {
  200: { color: 'green', description: 'OK' },
  201: { color: 'green', description: 'Created' },
  204: { color: 'green', description: 'No Content' },
  301: { color: 'blue', description: 'Moved Permanently' },
  302: { color: 'blue', description: 'Found' },
  304: { color: 'blue', description: 'Not Modified' },
  400: { color: 'red', description: 'Bad Request' },
  401: { color: 'red', description: 'Unauthorized' },
  403: { color: 'orange', description: 'Forbidden' },
  404: { color: 'gray', description: 'Not Found' },
  405: { color: 'red', description: 'Method Not Allowed' },
  500: { color: 'red', description: 'Internal Server Error' },
  502: { color: 'red', description: 'Bad Gateway' },
  503: { color: 'red', description: 'Service Unavailable' },
};

type FuzzMode = 'quick' | 'full' | 'custom';

export function FuzzScannerTool() {
  const [url, setUrl] = React.useState('');
  const [results, setResults] = React.useState<FuzzResult[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const [selectedResult, setSelectedResult] = React.useState<FuzzResult | null>(null);
  const [fuzzMode, setFuzzMode] = React.useState<FuzzMode>('quick');
  const [customWordlist, setCustomWordlist] = React.useState<string[]>([]);
  const [filterStatus, setFilterStatus] = React.useState<string>('');

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getWordlist = (): string[] => {
    if (fuzzMode === 'custom' && customWordlist.length > 0) {
      return customWordlist;
    }
    if (fuzzMode === 'full') {
      return COMMON_PATHS;
    }
    return COMMON_PATHS.slice(0, 50);
  };

  const loadWordlistFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      setCustomWordlist(lines);
    };
    reader.readAsText(file);
  };

  const startFuzzing = async () => {
    if (!url.trim()) return;

    let baseUrl = url.trim();
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    abortControllerRef.current = new AbortController();
    const wordlist = getWordlist();

    setResults([]);
    setIsRunning(true);
    setProgress({ current: 0, total: wordlist.length });
    setSelectedResult(null);

    const concurrency = 30;
    const timeout = 5000;

    const checkPath = async (path: string): Promise<FuzzResult> => {
      const fullUrl = `${baseUrl}${path}`;
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        return {
          path,
          fullUrl,
          status: 'found',
          statusCode: undefined,
          responseTime,
        };
      } catch {
        const responseTime = Date.now() - startTime;
        if (responseTime >= timeout) {
          return {
            path,
            fullUrl,
            status: 'timeout',
            responseTime,
          };
        }
        return {
          path,
          fullUrl,
          status: 'error',
          responseTime,
        };
      }
    };

    for (let i = 0; i < wordlist.length; i += concurrency) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = wordlist.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((path) => checkPath(path)));

      setResults((prev) => [...prev, ...batchResults]);
      setProgress((prev) => ({ ...prev, current: prev.current + batch.length }));
    }

    setIsRunning(false);
  };

  const stopFuzzing = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedResult(null);
    setProgress({ current: 0, total: 0 });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const exportResults = (format: 'txt' | 'json' | 'csv') => {
    const found = results.filter((r) => r.status === 'found');

    if (format === 'txt') {
      const content = found.map((r) => r.fullUrl).join('\n');
      downloadFile(content, `fuzz-${Date.now()}.txt`, 'text/plain');
    } else if (format === 'json') {
      const content = JSON.stringify(found, null, 2);
      downloadFile(content, `fuzz-${Date.now()}.json`, 'application/json');
    } else {
      const headers = ['Path', 'URL', 'Status', 'Content Length', 'Response Time'];
      const rows = found.map((r) => [r.path, r.fullUrl, r.status, r.contentLength || '-', r.responseTime ? `${r.responseTime}ms` : '-']);
      const content = [headers, ...rows].map((row) => row.join(',')).join('\n');
      downloadFile(content, `fuzz-${Date.now()}.csv`, 'text/csv');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResults = React.useMemo(() => {
    if (!filterStatus) return results;
    return results.filter((r) => {
      if (filterStatus === 'found') return r.status === 'found';
      if (filterStatus === 'timeout') return r.status === 'timeout';
      return true;
    });
  }, [results, filterStatus]);

  const foundCount = results.filter((r) => r.status === 'found').length;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Directory Fuzz Scanner</h3>
          <p className="text-xs text-muted-foreground">Discover directories and files using wordlist brute force</p>
        </div>
        {isRunning && progress.total > 0 && (
          <Badge variant="secondary" className="animate-pulse">
            {progress.current} / {progress.total}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter URL (e.g., https://example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Select value={fuzzMode} onValueChange={(v) => setFuzzMode(v as FuzzMode)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick">Quick (50)</SelectItem>
            <SelectItem value="full">Full (100+)</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {fuzzMode === 'custom' && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={loadWordlistFile}
              accept=".txt,.lst,.wordlist"
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />
              Wordlist
            </Button>
          </>
        )}
        {isRunning ? (
          <Button variant="destructive" onClick={stopFuzzing}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        ) : (
          <Button onClick={startFuzzing} disabled={!url.trim()}>
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        )}
      </div>

      {progress.total > 0 && !isRunning && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Found: <span className="text-green-500 font-medium">{foundCount}</span>
        </span>
        <span className="text-muted-foreground">
          Total: <span className="font-medium">{results.length}</span>
        </span>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder="Filter..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="found">Found Only</SelectItem>
            <SelectItem value="timeout">Timeout Only</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => exportResults('csv')} disabled={results.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportResults('json')} disabled={results.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />
          JSON
        </Button>
        <Button variant="outline" size="sm" onClick={clearResults} disabled={results.length === 0}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
        <div className="h-full overflow-auto">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Enter a URL and click Start to begin fuzzing
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-12">#</th>
                  <th className="px-3 py-2 text-left font-medium">Path</th>
                  <th className="px-3 py-2 text-left font-medium w-24">Status</th>
                  <th className="px-3 py-2 text-left font-medium w-20">Time</th>
                  <th className="px-3 py-2 text-left font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, index) => (
                  <tr
                    key={result.path + index}
                    className={`border-b cursor-pointer hover:bg-muted/50 ${
                      result.status === 'found' ? 'bg-green-500/5' : result.status === 'timeout' ? 'bg-yellow-500/5' : ''
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{result.path}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={result.status === 'found' ? 'default' : result.status === 'timeout' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {result.status === 'found' ? 'Found' : result.status === 'timeout' ? 'Timeout' : 'Error'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {result.responseTime ? `${result.responseTime}ms` : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {result.status === 'found' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(result.fullUrl);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}