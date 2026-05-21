export type DashboardAnalysisMode = 'surface' | 'review' | 'report';
export type DashboardAnalysisFramework = 'general' | 'owasp-api-top-10' | 'owasp-web-top-10' | 'recon' | 'misconfiguration';

export type AnalysisSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AnalysisAsset {
  type: 'url' | 'host' | 'ip' | 'email' | 'storage' | 'technology';
  value: string;
  context: string;
}

export interface AnalysisFinding {
  title: string;
  severity: AnalysisSeverity;
  detail: string;
}

export interface DashboardAnalysisResult {
  summary: string;
  score: number;
  findings: AnalysisFinding[];
  assets: AnalysisAsset[];
  nextSteps: string[];
  analystNote: string;
  framework: DashboardAnalysisFramework;
}

const severityRank: Record<AnalysisSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getLineContext(input: string, needle: string) {
  const line = input
    .split('\n')
    .find((entry) => entry.toLowerCase().includes(needle.toLowerCase()));

  return line?.trim() || `Detected from pasted content: ${needle}`;
}

function toAssetObjects(values: string[], type: AnalysisAsset['type'], input: string) {
  return uniqueStrings(values).map((value) => ({
    type,
    value,
    context: getLineContext(input, value),
  }));
}

export function analyzeAssetInput(
  input: string,
  mode: DashboardAnalysisMode,
  framework: DashboardAnalysisFramework = 'general'
): DashboardAnalysisResult {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();

  const urlMatches = normalized.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const hostMatches = (normalized.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) || []).filter(
    (value) => !value.startsWith('http')
  );
  const ipMatches = normalized.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  const emailMatches = normalized.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || [];
  const storageMatches = normalized.match(
    /\b(?:s3:\/\/[^\s"'<>]+|[a-z0-9.-]+\.s3\.amazonaws\.com|storage\.googleapis\.com\/[^\s"'<>]+)\b/gi
  ) || [];

  const technologySignals = [
    'graphql',
    'swagger',
    'next.js',
    'react',
    'tauri',
    'aws',
    'nginx',
    'cloudflare',
    'postgres',
    'redis',
    'kubernetes',
  ].filter((signal) => lower.includes(signal));

  const findings: AnalysisFinding[] = [];

  if (/(authorization:\s*bearer|api[_-]?key|x-api-key|secret=|access[_-]?token|refresh[_-]?token)/i.test(normalized)) {
    findings.push({
      title: 'Potential credential exposure',
      severity: 'critical',
      detail: 'The pasted material includes token or secret-looking strings that should be rotated and stored securely.',
    });
  }

  if (/(admin|internal|staging|sandbox|debug|dev)\./i.test(normalized) || /\/(?:admin|internal|debug|actuator)\b/i.test(normalized)) {
    findings.push({
      title: 'Sensitive environment surface detected',
      severity: 'high',
      detail: 'The content references internal, staging, admin, or debug-facing assets that deserve access review.',
    });
  }

  if (/access-control-allow-origin:\s*\*/i.test(normalized) || /access-control-allow-credentials:\s*true/i.test(normalized)) {
    findings.push({
      title: 'Potentially risky CORS configuration',
      severity: 'medium',
      detail: 'The response appears to allow broad cross-origin access and should be validated against the intended trust model.',
    });
  }

  if (/(exception|stack trace|traceback|sql syntax|undefined is not a function|panic)/i.test(normalized)) {
    findings.push({
      title: 'Verbose error leakage',
      severity: 'medium',
      detail: 'The input suggests stack traces or implementation details are exposed, which can help attackers map internals.',
    });
  }

  if (storageMatches.length > 0) {
    findings.push({
      title: 'Storage asset discovered',
      severity: mode === 'surface' ? 'low' : 'medium',
      detail: 'Cloud object storage references were found and should be reviewed for public exposure, naming leaks, and data sensitivity.',
    });
  }

  if (urlMatches.length + hostMatches.length + ipMatches.length >= 6) {
    findings.push({
      title: 'Broad attack surface candidate',
      severity: 'info',
      detail: 'The supplied text contains multiple hosts, URLs, or IPs, which is a good candidate for asset clustering and deduplication.',
    });
  }

  if (framework === 'owasp-api-top-10' && /(graphql|swagger|api|json|bearer|x-api-key|mass assignment|rate limit|idor|bola|ssrf)/i.test(normalized)) {
    findings.push({
      title: 'OWASP API Top 10 review candidate',
      severity: 'high',
      detail: 'The input contains API-focused indicators and should be reviewed for BOLA, auth gaps, rate limiting, SSRF, and unsafe API data exposure.',
    });
  }

  if (framework === 'owasp-web-top-10' && /(cookie|csrf|cors|sql|script|auth|session|admin|upload|xss)/i.test(normalized)) {
    findings.push({
      title: 'OWASP Web Top 10 review candidate',
      severity: 'high',
      detail: 'The input includes web application attack-surface indicators that deserve review for access control, injection, XSS, session, and configuration issues.',
    });
  }

  if (framework === 'recon' && assetsLikeCount(normalized) >= 4) {
    findings.push({
      title: 'Recon surface worth clustering',
      severity: 'medium',
      detail: 'This data looks better suited for attack-surface mapping, environment tagging, and prioritization before deeper testing.',
    });
  }

  if (framework === 'misconfiguration' && /(cors|traceback|stack trace|debug|server:|nginx|apache|bucket|public|directory listing)/i.test(normalized)) {
    findings.push({
      title: 'Misconfiguration review candidate',
      severity: 'medium',
      detail: 'The evidence suggests configuration-level exposure that should be validated across headers, debug behavior, storage access, and environment hardening.',
    });
  }

  if (findings.length === 0) {
    findings.push({
      title: 'No obvious high-signal issue yet',
      severity: 'info',
      detail: 'This looks more like reconnaissance input than a confirmed weakness, so the next step is to enrich and correlate it.',
    });
  }

  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  const assets: AnalysisAsset[] = [
    ...toAssetObjects(urlMatches, 'url', normalized),
    ...toAssetObjects(hostMatches, 'host', normalized),
    ...toAssetObjects(ipMatches, 'ip', normalized),
    ...toAssetObjects(emailMatches, 'email', normalized),
    ...toAssetObjects(storageMatches, 'storage', normalized),
    ...toAssetObjects(technologySignals, 'technology', normalized),
  ].slice(0, 12);

  const scoreBase = findings.reduce((sum, finding) => sum + severityRank[finding.severity] * 10, 0);
  const assetBonus = Math.min(assets.length * 2, 20);
  const modeBonus = mode === 'review' ? 8 : mode === 'report' ? 4 : 0;
  const frameworkBonus =
    framework === 'owasp-api-top-10' || framework === 'owasp-web-top-10'
      ? 10
      : framework === 'misconfiguration'
        ? 6
        : framework === 'recon'
          ? 4
          : 0;
  const score = Math.min(100, Math.max(18, scoreBase + assetBonus + modeBonus + frameworkBonus));

  const summary =
    framework === 'owasp-api-top-10'
      ? 'I reviewed the asset through an OWASP API Top 10 lens and highlighted the API-specific risks worth validating first.'
      : framework === 'owasp-web-top-10'
        ? 'I reviewed the asset through an OWASP Web Top 10 lens and ranked the strongest web security signals.'
        : framework === 'recon'
          ? 'I mapped the likely exposed surface and highlighted the best reconnaissance leads for next-step validation.'
          : framework === 'misconfiguration'
            ? 'I reviewed the asset for common misconfiguration signals and highlighted the most actionable setup issues.'
            : mode === 'surface'
              ? 'I mapped the likely exposed surface and highlighted the strongest clues worth triaging first.'
              : mode === 'review'
                ? 'I reviewed the pasted evidence for risky patterns and ranked the most actionable security observations.'
                : 'I converted the input into a lightweight analyst report with findings, assets, and follow-up actions.';

  const nextSteps = uniqueStrings([
    assets.some((asset) => asset.type === 'host' || asset.type === 'url')
      ? 'Cluster hosts by environment and ownership so later findings attach to the right asset.'
      : '',
    findings.some((finding) => finding.severity === 'critical')
      ? 'Rotate any exposed token-like values and confirm they are not valid in production.'
      : '',
    findings.some((finding) => finding.title.includes('CORS'))
      ? 'Replay the affected endpoint with trusted and untrusted origins to verify exploitability.'
      : '',
    findings.some((finding) => finding.title.includes('error'))
      ? 'Capture the triggering request and sanitize server-side error handling for external clients.'
      : '',
    storageMatches.length > 0
      ? 'Check bucket ACLs, object listing behavior, and naming conventions for data leakage.'
      : '',
    framework === 'owasp-api-top-10'
      ? 'Map the asset against BOLA, authentication, authorization, rate limiting, and SSRF abuse cases from the OWASP API Top 10.'
      : '',
    framework === 'owasp-web-top-10'
      ? 'Validate access control, session handling, injection paths, and browser-side abuse cases against the OWASP Web Top 10.'
      : '',
    framework === 'misconfiguration'
      ? 'Verify headers, environment exposure, storage permissions, and verbose error handling across the selected target.'
      : '',
    framework === 'recon'
      ? 'Group the discovered hosts and paths by environment, ownership, and exposure level before deeper manual testing.'
      : '',
    'Store confirmed assets, findings, and analyst notes as separate records so the dashboard can become your working recon memory.',
  ]).slice(0, 5);

  const analystNote =
    `Detected ${assets.length} candidate asset${assets.length === 1 ? '' : 's'} and ${findings.length} finding` +
    `${findings.length === 1 ? '' : 's'}. Highest severity: ${findings[0].severity}.`;

  return {
    summary,
    score,
    findings,
    assets,
    nextSteps,
    analystNote,
    framework,
  };
}

function assetsLikeCount(input: string) {
  const urls = input.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const hosts = input.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) || [];
  const ips = input.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  return new Set([...urls, ...hosts, ...ips]).size;
}
