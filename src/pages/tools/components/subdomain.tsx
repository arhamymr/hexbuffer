'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Trash2, Download, Copy } from 'lucide-react';
import type { SubdomainResult } from '../types';

const COMMON_SUBDOMAINS = [
  'www', 'api', 'admin', 'mail', 'ftp', 'localhost', 'webmail', 'smtp',
  'pop', 'ns1', 'webdisk', 'ns2', 'cpanel', 'whm', 'autodiscover', 'autoconfig',
  'm', 'imap', 'test', 'ns', 'blog', 'pop3', 'dev', 'www2', 'cdn',
  'webdav', 'store', 'relay', 'docs', 'forum', 'news', 'git', 'svn',
  'mx1', 'composer', 'chat', 'support', 'help', 'status', 'docs',
  'vpn', 'ssh', 'sftp', 'jenkins', 'ci', 'gitlab', 'bitbucket',
  'proxy', 'phpmyadmin', 'mysql', 'pgsql', 'postgresql', 'mongo',
  'redis', 'mongodb', 'elasticsearch', 'kibana', 'grafana', 'prometheus',
  'staging', 'stage', 'demo', 'trial', 'preprod', 'pre', 'prod',
  'app', 'apps', 'dashboard', 'control', 'manage', 'panel', 'portal',
  'intranet', 'extranet', 'internal', 'private', 'public', 'secure',
  'auth', 'login', 'signin', 'signup', 'register', 'account', 'accounts',
  'oauth', 'openid', 'ldap', 'saml', 'cas', 'verify', 'confirm',
  'assets', 'static', 'media', 'files', 'upload', 'download', 'backups',
  'backup', 'data', 'db', 'database', 'sql', 'oracle', 'mssql',
  'server', 'host', 'node', 'instance', 'vm', 'cloud', 'aws', 'azure', 'gcp',
  'digitalocean', 'linode', 'vultr', 'heroku', 'netlify', 'vercel',
  'api1', 'api2', 'api3', 'api4', 'api5', 'v1', 'v2', 'v3', 'v4',
  'gateway', 'router', 'firewall', 'VPN', 'dns', 'ddns', 'proxy',
  'search', 'index', 'catalog', 'shop', 'store', 'cart', 'checkout',
  'pay', 'payment', 'billing', 'invoice', 'subscription', 'pricing',
  'asset', 'image', 'img', 'photo', 'video', 'media', 'cdn',
  'logs', 'analytics', 'stats', 'metrics', 'monitor', 'alerts',
  'sandbox', 'dev1', 'dev2', 'qa', 'test1', 'test2', 'lab',
  'git', 'github', 'gitlab', 'bitbucket', 'svn', 'hg', 'cvs',
  'jira', 'confluence', 'slack', 'discord', 'teams', 'zoom',
  'mail1', 'mail2', 'mail3', 'lists', 'newsletter', 'subscribe', 'unsubscribe',
];

export function SubdomainTool() {
  const [domain, setDomain] = React.useState('');
  const [results, setResults] = React.useState<SubdomainResult[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const [selectedResult, setSelectedResult] = React.useState<SubdomainResult | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const startDiscovery = async () => {
    if (!domain.trim()) return;

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    abortControllerRef.current = new AbortController();

    const wordlist = [...new Set([...COMMON_SUBDOMAINS])];
    const filteredWordlist = wordlist.filter((sub) => !sub.includes('.'));

    setResults([]);
    setIsRunning(true);
    setProgress({ current: 0, total: filteredWordlist.length });
    setSelectedResult(null);

    const foundUrls = new Set<string>();
    const concurrency = 50;
    const timeout = 3000;

    const checkSubdomain = async (subdomain: string): Promise<SubdomainResult> => {
      const fullUrl = `https://${subdomain}.${cleanDomain}`;
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        return {
          subdomain,
          fullUrl,
          status: 'found',
          statusCode: undefined,
          responseTime,
        };
      } catch {
        const responseTime = Date.now() - startTime;
        if (responseTime >= timeout) {
          return {
            subdomain,
            fullUrl,
            status: 'timeout',
            responseTime,
          };
        }
        return {
          subdomain,
          fullUrl,
          status: 'error',
          responseTime,
        };
      }
    };

    const processBatch = async (batch: string[]) => {
      const promises = batch.map((sub) => checkSubdomain(sub));
      const batchResults = await Promise.all(promises);

      setResults((prev) => {
        const newResults = [...prev];
        batchResults.forEach((result) => {
          if (result.status === 'found' && !foundUrls.has(result.fullUrl)) {
            foundUrls.add(result.fullUrl);
            newResults.push(result);
          } else if (result.status === 'timeout') {
            newResults.push(result);
          }
        });
        return newResults;
      });

      setProgress((prev) => ({ ...prev, current: prev.current + batch.length }));
    };

    for (let i = 0; i < filteredWordlist.length; i += concurrency) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = filteredWordlist.slice(i, i + concurrency);
      await processBatch(batch);
    }

    setIsRunning(false);
  };

  const stopDiscovery = () => {
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

  const exportResults = (format: 'txt' | 'json') => {
    const found = results.filter((r) => r.status === 'found');
    if (format === 'txt') {
      const content = found.map((r) => r.fullUrl).join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subdomains-${domain}-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const content = JSON.stringify(found, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subdomains-${domain}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const foundCount = results.filter((r) => r.status === 'found').length;
  const timeoutCount = results.filter((r) => r.status === 'timeout').length;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Subdomain Discovery</h3>
          <p className="text-xs text-muted-foreground">Find subdomains using wordlist brute force</p>
        </div>
        {isRunning && progress.total > 0 && (
          <Badge variant="secondary" className="animate-pulse">
            {progress.current} / {progress.total}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter domain (e.g., example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1"
        />
        {isRunning ? (
          <Button size="xs" variant="destructive" onClick={stopDiscovery}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        ) : (
          <Button size="xs" onClick={startDiscovery} disabled={!domain.trim()}>
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
          Timeout: <span className="text-yellow-500 font-medium">{timeoutCount}</span>
        </span>
        <span className="text-muted-foreground">
          Total: <span className="font-medium">{results.length}</span>
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="xs" onClick={() => exportResults('txt')} disabled={foundCount === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />
          TXT
        </Button>
        <Button variant="outline" size="xs" onClick={() => exportResults('json')} disabled={results.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />
          JSON
        </Button>
        <Button variant="outline" size="xs" onClick={clearResults} disabled={results.length === 0}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
        <div className="h-full overflow-auto">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Enter a domain and click Start to begin subdomain discovery
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-12">#</th>
                  <th className="px-3 py-2 text-left font-medium">Subdomain</th>
                  <th className="px-3 py-2 text-left font-medium w-24">Status</th>
                  <th className="px-3 py-2 text-left font-medium w-20">Time</th>
                  <th className="px-3 py-2 text-left font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr
                    key={result.subdomain + index}
                    className={`border-b cursor-pointer hover:bg-muted/50 ${
                      result.status === 'found' ? 'bg-green-500/5' : result.status === 'timeout' ? 'bg-yellow-500/5' : ''
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{result.subdomain}.{domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}</td>
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
                          size="xs"
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