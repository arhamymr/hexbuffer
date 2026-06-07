import { tool } from 'ai';
import { z } from 'zod';

import { extractTitle, extractVisibleText } from '../../extract-html.mjs';

export function createExtractSecurityInfoTool(emitAction) {
  return tool({
    description: 'Fetch a URL and extract its security configuration: security headers (CSP, HSTS, X-Frame-Options, etc.), security.txt file contents, server info, and security-relevant cookie flags. Use this as a SOURCE tool for security posture analysis.',
    inputSchema: z.object({
      url: z.string().describe('The fully qualified URL to inspect for security configuration.'),
    }),
    execute: async ({ url }) => {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0xbuffer/1.0)' },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        const finalUrl = response.url;
        const status = response.status;

        // Extract security headers
        const securityHeaders = {
          'strict-transport-security': response.headers.get('strict-transport-security') || null,
          'content-security-policy': response.headers.get('content-security-policy') || null,
          'x-frame-options': response.headers.get('x-frame-options') || null,
          'x-content-type-options': response.headers.get('x-content-type-options') || null,
          'x-xss-protection': response.headers.get('x-xss-protection') || null,
          'referrer-policy': response.headers.get('referrer-policy') || null,
          'permissions-policy': response.headers.get('permissions-policy') || null,
          'cross-origin-opener-policy': response.headers.get('cross-origin-opener-policy') || null,
          'cross-origin-resource-policy': response.headers.get('cross-origin-resource-policy') || null,
          'cross-origin-embedder-policy': response.headers.get('cross-origin-embedder-policy') || null,
          'server': response.headers.get('server') || null,
          'x-powered-by': response.headers.get('x-powered-by') || null,
        };

        // Extract cookies with security flags
        const setCookieHeaders = response.headers.getSetCookie?.() || [];
        const cookies = setCookieHeaders.map((header) => {
          const parts = header.split(';').map((p) => p.trim().toLowerCase());
          const nameValue = parts[0];
          return {
            name: nameValue?.split('=')[0] || 'unknown',
            httpOnly: parts.some((p) => p === 'httponly'),
            secure: parts.some((p) => p === 'secure'),
            sameSite: parts.find((p) => p.startsWith('samesite='))?.replace('samesite=', '') || 'none',
          };
        });

        // Try to fetch security.txt
        let securityTxt = null;
        try {
          const rootUrl = new URL(url);
          for (const path of ['/security.txt', '/.well-known/security.txt']) {
            try {
              const txtRes = await fetch(`${rootUrl.protocol}//${rootUrl.host}${path}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0xbuffer/1.0)' },
                signal: AbortSignal.timeout(5000),
              });
              if (txtRes.ok) {
                securityTxt = await txtRes.text();
                break;
              }
            } catch {}
          }
        } catch {}

        // Extract HTML info if it's HTML
        let title = null;
        let visibleText = null;
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            const html = await response.text();
            title = extractTitle(html);
            visibleText = extractVisibleText(html).slice(0, 2000);
          }
        }

        // Compile security findings
        const findings = [];
        if (!securityHeaders['strict-transport-security']) findings.push({ level: 'info', header: 'Strict-Transport-Security', issue: 'HSTS header is missing. Consider enforcing HTTPS with HSTS.' });
        if (!securityHeaders['content-security-policy']) findings.push({ level: 'info', header: 'Content-Security-Policy', issue: 'CSP header is missing. Consider defining a content security policy.' });
        if (!securityHeaders['x-frame-options'] && !(securityHeaders['content-security-policy'] || '').includes('frame-ancestors')) findings.push({ level: 'low', header: 'X-Frame-Options', issue: 'No frame protection header found. The page may be vulnerable to clickjacking.' });
        if (!securityHeaders['x-content-type-options']) findings.push({ level: 'low', header: 'X-Content-Type-Options', issue: 'Missing X-Content-Type-Options header. Add it to prevent MIME sniffing.' });
        if (securityHeaders['server']) findings.push({ level: 'info', header: 'Server', issue: `Server header reveals: ${securityHeaders['server']}` });
        if (securityHeaders['x-powered-by']) findings.push({ level: 'info', header: 'X-Powered-By', issue: `Technology disclosure: ${securityHeaders['x-powered-by']}` });
        const insecureCookies = cookies.filter((c) => !c.secure || !c.httpOnly);
        if (insecureCookies.length > 0) findings.push({ level: 'low', header: 'Set-Cookie', issue: `${insecureCookies.length} cookie(s) missing Secure or HttpOnly flags: ${insecureCookies.map((c) => c.name).join(', ')}` });

        const result = {
          url,
          finalUrl: finalUrl !== url ? finalUrl : null,
          status,
          title,
          securityHeaders,
          cookies: cookies.slice(0, 20),
          insecureCookieCount: insecureCookies.length,
          securityTxt,
          findings,
          findingsCount: findings.length,
          textPreview: visibleText,
        };
        emitAction({
          action: 'url_extracted',
          payload: { url, title, status, findingsCount: findings.length },
        });
        return result;
      } catch (error) {
        return { error: error.message, url };
      }
    },
  });
}
