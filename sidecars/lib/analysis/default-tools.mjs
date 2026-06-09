import { OWASP_WEB_TOP_10_2025, OWASP_API_TOP_10_2023, MAX_EVIDENCE_ITEMS, PATTERNS } from './constants.mjs';
import {
  normalizeExtract,
  fieldText,
  linkText,
  buttonText,
  scriptText,
  actionableFields,
  uniqueBy,
  sampleValues,
  createInsight,
  countLabel,
  scorePrioritizedUrl,
  reasonForLink,
  runOwaspCategories,
  webOwaspEvidence,
  apiOwaspEvidence,
} from './helpers.mjs';

export const DEFAULT_ANALYSIS_TOOLS = [
  {
    id: 'login-form',
    name: 'Login Form Detector',
    description: 'Finds authentication indicators, username fields, password fields, and auth-related routes.',
    run: (extract) => {
      const fields = extract.forms.flatMap((form) => form.fields);
      const passwordFields = fields.filter((field) => field.type?.toLowerCase() === 'password');
      const usernameFields = fields.filter((field) => /\b(email|user(name)?|login|account)\b/i.test(fieldText(field)));
      const authLinks = extract.links.filter((link) => PATTERNS.auth.test(linkText(link)));
      const hasLoginCopy = PATTERNS.auth.test(`${extract.finalUrl} ${extract.title} ${extract.visibleText}`);

      if (passwordFields.length === 0 && usernameFields.length === 0 && authLinks.length === 0 && !hasLoginCopy) return [];

      const severity = passwordFields.length > 0 ? 'medium' : 'info';
      const evidence = [
        ...sampleValues(passwordFields, fieldText),
        ...sampleValues(usernameFields, fieldText),
        ...sampleValues(authLinks, (link) => link.href),
      ].slice(0, MAX_EVIDENCE_ITEMS);

      return [createInsight({
        severity,
        type: 'login-form',
        title: passwordFields.length > 0 ? 'Login form detected' : 'Authentication surface detected',
        description: passwordFields.length > 0
          ? `The page contains ${countLabel(passwordFields.length, 'password field')} and may require credentials before deeper crawling.`
          : 'The page contains authentication indicators that may lead to restricted crawl paths.',
      }, evidence)];
    },
  },
  {
    id: 'admin-route',
    name: 'Admin Route Finder',
    description: 'Flags URLs and links that look like administration surfaces.',
    run: (extract) => {
      const adminLinks = extract.links.filter((link) => PATTERNS.admin.test(linkText(link)));
      const currentPageLooksAdmin = PATTERNS.admin.test(`${extract.finalUrl} ${extract.title}`);

      if (!currentPageLooksAdmin && adminLinks.length === 0) return [];

      return [createInsight({
        severity: currentPageLooksAdmin ? 'medium' : 'low',
        type: 'admin-route',
        title: currentPageLooksAdmin ? 'Admin route discovered' : 'Admin-like links discovered',
        description: currentPageLooksAdmin
          ? 'The crawler discovered a URL that appears to expose an administrative surface.'
          : `The page links to ${countLabel(adminLinks.length, 'admin-like route')}.`,
      }, sampleValues(adminLinks, (link) => link.href))];
    },
  },
  {
    id: 'upload-form',
    name: 'Upload Form Finder',
    description: 'Finds file input fields and upload-related controls that may need handling review.',
    run: (extract) => {
      const uploadFields = extract.forms.flatMap((form) =>
        form.fields.filter((field) => field.type?.toLowerCase() === 'file' || PATTERNS.upload.test(fieldText(field)))
      );
      const uploadButtons = extract.buttons.filter((button) => PATTERNS.upload.test(buttonText(button)));

      if (uploadFields.length === 0 && uploadButtons.length === 0) return [];

      return [createInsight({
        severity: uploadFields.some((field) => field.type?.toLowerCase() === 'file') ? 'medium' : 'low',
        type: 'upload-form',
        title: 'Upload workflow detected',
        description: `The page contains ${countLabel(uploadFields.length + uploadButtons.length, 'upload-related control')} and should be reviewed for upload handling.`,
      }, [
        ...sampleValues(uploadFields, fieldText),
        ...sampleValues(uploadButtons, buttonText),
      ].slice(0, MAX_EVIDENCE_ITEMS))];
    },
  },
  {
    id: 'form-review',
    name: 'Form Review Helper',
    description: 'Identifies forms with user-controlled fields for workflow review.',
    run: (extract) => {
      const fields = actionableFields(extract).filter((field) => {
        const type = field.type?.toLowerCase();
        return type !== 'password' && type !== 'file';
      });

      if (fields.length === 0) return [];

      const riskyFields = fields.filter((field) => PATTERNS.payment.test(fieldText(field)) || PATTERNS.riskyAction.test(fieldText(field)));

      return [createInsight({
        severity: riskyFields.length > 0 ? 'medium' : 'info',
        type: 'interactive-form',
        title: riskyFields.length > 0 ? 'Sensitive interactive form detected' : 'Interactive form detected',
        description: `The page contains ${countLabel(fields.length, 'user-controlled form field')} that may lead to additional crawl paths.`,
      }, sampleValues(riskyFields.length > 0 ? riskyFields : fields, fieldText))];
    },
  },
  {
    id: 'token-field',
    name: 'Token Field Finder',
    description: 'Looks for OTP, MFA, CSRF, token, nonce, captcha, and code fields.',
    run: (extract) => {
      const tokenFields = extract.forms
        .flatMap((form) => form.fields)
        .filter((field) => PATTERNS.token.test(fieldText(field)));

      if (tokenFields.length === 0) return [];

      return [createInsight({
        severity: 'low',
        type: 'token-field',
        title: 'Token or verification field detected',
        description: `The page contains ${countLabel(tokenFields.length, 'token-like field')} that may require manual review before continuing.`,
      }, sampleValues(tokenFields, fieldText))];
    },
  },
  {
    id: 'api-route',
    name: 'API Route Finder',
    description: 'Highlights linked API, JSON, GraphQL, Swagger/OpenAPI, and well-known routes.',
    run: (extract) => {
      const apiLinks = extract.links.filter((link) => PATTERNS.api.test(linkText(link)));
      const apiScripts = extract.scripts.filter((script) => PATTERNS.api.test(scriptText(script)));
      const count = apiLinks.length + apiScripts.length;

      if (count === 0) return [];

      return [createInsight({
        severity: 'low',
        type: 'api-surface',
        title: 'API surface discovered',
        description: `The page references ${countLabel(count, 'API-like route or script', 'API-like routes or scripts')} worth checking manually.`,
      }, [
        ...sampleValues(apiLinks, (link) => link.href),
        ...sampleValues(apiScripts, scriptText),
      ].slice(0, MAX_EVIDENCE_ITEMS))];
    },
  },
  {
    id: 'owasp-web-top-10',
    name: 'OWASP Web Top 10 Mapper',
    description: 'Maps page reconnaissance evidence to OWASP Top 10:2025 web application risk categories.',
    run: (extract) => runOwaspCategories(OWASP_WEB_TOP_10_2025, extract, webOwaspEvidence),
  },
  {
    id: 'owasp-api-top-10',
    name: 'OWASP API Top 10 Mapper',
    description: 'Maps API reconnaissance evidence to OWASP API Security Top 10:2023 risk categories.',
    run: (extract) => runOwaspCategories(OWASP_API_TOP_10_2023, extract, apiOwaspEvidence),
  },
  {
    id: 'secret-exposure',
    name: 'Secret Exposure Hint Finder',
    description: 'Flags visible text, links, and scripts that mention keys, tokens, JWTs, or client secrets.',
    run: (extract) => {
      const matchingLinks = extract.links.filter((link) => PATTERNS.secrets.test(linkText(link)));
      const matchingScripts = extract.scripts.filter((script) => PATTERNS.secrets.test(scriptText(script)));
      const pageTextMatches = PATTERNS.secrets.test(`${extract.title} ${extract.visibleText}`);
      const count = matchingLinks.length + matchingScripts.length + (pageTextMatches ? 1 : 0);

      if (count === 0) return [];

      return [createInsight({
        severity: matchingScripts.length > 0 || pageTextMatches ? 'medium' : 'low',
        type: 'secret-exposure-hint',
        title: 'Secret-related text detected',
        description: 'The page references secret-like terms. Review the rendered HTML, scripts, and network traffic for accidental exposure.',
      }, [
        ...sampleValues(matchingLinks, (link) => link.href),
        ...sampleValues(matchingScripts, scriptText),
        pageTextMatches ? 'visible page text' : '',
      ].filter(Boolean).slice(0, MAX_EVIDENCE_ITEMS))];
    },
  },
  {
    id: 'payment-workflow',
    name: 'Payment Workflow Detector',
    description: 'Finds payment, billing, checkout, and card collection indicators.',
    run: (extract) => {
      const paymentFields = extract.forms
        .flatMap((form) => form.fields)
        .filter((field) => PATTERNS.payment.test(fieldText(field)));
      const paymentLinks = extract.links.filter((link) => PATTERNS.payment.test(linkText(link)));
      const currentPageLooksPayment = PATTERNS.payment.test(`${extract.finalUrl} ${extract.title} ${extract.visibleText}`);

      if (!currentPageLooksPayment && paymentFields.length === 0 && paymentLinks.length === 0) return [];

      return [createInsight({
        severity: 'medium',
        type: 'payment-workflow',
        title: 'Payment workflow detected',
        description: 'The page contains payment or billing indicators and should remain under manual review.',
      }, [
        ...sampleValues(paymentFields, fieldText),
        ...sampleValues(paymentLinks, (link) => link.href),
        currentPageLooksPayment ? extract.finalUrl : '',
      ].filter(Boolean).slice(0, MAX_EVIDENCE_ITEMS))];
    },
  },
  {
    id: 'risky-action',
    name: 'Risky Action Detector',
    description: 'Flags links and controls that may trigger destructive or state-changing actions.',
    run: (extract) => {
      const riskyLinks = extract.links.filter((link) => PATTERNS.riskyAction.test(linkText(link)));
      const riskyButtons = extract.buttons.filter((button) => PATTERNS.riskyAction.test(buttonText(button)));
      const count = riskyLinks.length + riskyButtons.length;

      if (count === 0) return [];

      return [createInsight({
        severity: 'medium',
        type: 'risky-action',
        title: 'Risky action control detected',
        description: `The page contains ${countLabel(count, 'control')} that may perform a destructive or state-changing action.`,
      }, [
        ...sampleValues(riskyLinks, (link) => link.href),
        ...sampleValues(riskyButtons, buttonText),
      ].slice(0, MAX_EVIDENCE_ITEMS))];
    },
  },
  {
    id: 'error-page',
    name: 'HTTP Error Checker',
    description: 'Flags crawled pages with HTTP error responses.',
    run: (extract) => {
      if ((extract.httpStatus || 0) < 400) return [];

      const severity = extract.httpStatus >= 500 ? 'low' : 'info';
      return [createInsight({
        severity,
        type: 'error-page',
        title: 'Error page detected',
        description: `The page returned HTTP ${extract.httpStatus}.`,
      })];
    },
  },
];

export const MANUAL_ANALYSIS_TOOLS = DEFAULT_ANALYSIS_TOOLS;

export function runDefaultAnalysisTools(extract, toolIds = DEFAULT_ANALYSIS_TOOLS.map((item) => item.id)) {
  const normalizedExtract = normalizeExtract(extract);
  const enabled = new Set(toolIds);

  return DEFAULT_ANALYSIS_TOOLS
    .filter((defaultTool) => enabled.has(defaultTool.id))
    .flatMap((defaultTool) => defaultTool.run(normalizedExtract).map((insight) => ({
      ...insight,
      analysisToolId: defaultTool.id,
      analysisToolName: defaultTool.name,
    })));
}

export function runManualAnalysisTools(extract, toolIds) {
  return runDefaultAnalysisTools(extract, toolIds);
}

export function heuristicAnalyze(extract) {
  const normalizedExtract = normalizeExtract(extract);
  const insights = runDefaultAnalysisTools(normalizedExtract);
  const prioritizedUrls = uniqueBy(normalizedExtract.links, (link) => link.href)
    .map((link) => ({
      url: link.href,
      reason: reasonForLink(link),
      priorityScore: scorePrioritizedUrl(link),
    }))
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 20);

  const maxPriorityScore = prioritizedUrls[0]?.priorityScore || 40;
  const priorityScore = insights.length > 0 ? Math.max(70, Math.min(95, maxPriorityScore)) : 40;

  return {
    summary: normalizedExtract.title || normalizedExtract.visibleText.slice(0, 180) || 'No page summary available.',
    aiUsedForAnalysis: false,
    interesting: insights.length > 0,
    priorityScore,
    insights,
    prioritizedUrls,
  };
}
