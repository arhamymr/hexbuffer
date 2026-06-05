const NON_ACTIONABLE_FIELD_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);
const MAX_EVIDENCE_ITEMS = 5;

const PATTERNS = {
  auth: /\b(sign\s*in|log\s*in|login|logout|password|passwd|username|user\s*name|authenticate|authentication|session)\b/i,
  admin: /\b(admin|administrator|manage|dashboard|console|control[-_\s]*panel|cpanel|wp-admin)\b/i,
  upload: /\b(upload|avatar|attachment|document|media|file)\b/i,
  token: /\b(otp|mfa|2fa|csrf|xsrf|nonce|token|verification|verify|code|captcha)\b/i,
  api: /(?:\/api(?:\/|$)|graphql|graphiql|swagger|openapi|api-docs|redoc|\.json(?:\?|$)|\.well-known)/i,
  secrets: /\b(api[-_\s]*key|access[-_\s]*token|secret|bearer|jwt|private[-_\s]*key|client[-_\s]*secret)\b/i,
  payment: /\b(payment|checkout|billing|invoice|card\s*number|credit\s*card|cvv|cvc|stripe|paypal)\b/i,
  riskyAction: /\b(delete|destroy|remove|reset|disable|deactivate|terminate|revoke|purge|drop)\b/i,
};

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function cleanText(value) {
  return asString(value).replace(/\s+/g, ' ').trim();
}

function normalizeHttpStatus(value) {
  const status = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(status) ? status : 0;
}

function normalizeExtract(extract = {}) {
  return {
    finalUrl: asString(extract.finalUrl),
    title: cleanText(extract.title),
    visibleText: cleanText(extract.visibleText),
    httpStatus: normalizeHttpStatus(extract.httpStatus),
    forms: arrayOf(extract.forms).map((form) => ({
      ...form,
      fields: arrayOf(form?.fields).filter(Boolean),
    })),
    links: arrayOf(extract.links).filter((link) => link?.href),
    buttons: arrayOf(extract.buttons).filter(Boolean),
    scripts: arrayOf(extract.scripts).filter(Boolean),
  };
}

function fieldText(field) {
  const safeField = field || {};
  return cleanText([
    safeField.name,
    safeField.placeholder,
    safeField.label,
    safeField.type,
    safeField.id,
    safeField.autocomplete,
    safeField.ariaLabel,
  ].filter(Boolean).join(' '));
}

function linkText(link) {
  const safeLink = link || {};
  return cleanText(`${safeLink.text || ''} ${safeLink.href || ''}`);
}

function buttonText(button) {
  const safeButton = button || {};
  return cleanText(`${safeButton.text || ''} ${safeButton.name || ''} ${safeButton.type || ''} ${safeButton.ariaLabel || ''}`);
}

function scriptText(script) {
  if (typeof script === 'string') return script;
  return cleanText(`${script?.src || ''} ${script?.text || ''}`);
}

function actionableFields(extract) {
  return extract.forms
    .flatMap((form) => form.fields)
    .filter((field) => {
      const fieldType = field.type?.toLowerCase();
      return !NON_ACTIONABLE_FIELD_TYPES.has(fieldType || '');
    });
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sampleValues(items, getValue, limit = MAX_EVIDENCE_ITEMS) {
  return uniqueBy(items.map(getValue).map(cleanText).filter(Boolean), (item) => item).slice(0, limit);
}

function describeSamples(samples) {
  if (!samples.length) return '';
  return ` Evidence: ${samples.join(', ')}.`;
}

function normalizeDefaultInsight(insight) {
  return {
    severity: insight.severity,
    type: insight.type,
    title: insight.title,
    description: insight.description,
    analysisSource: 'default',
  };
}

function createInsight(insight, evidence = []) {
  return normalizeDefaultInsight({
    ...insight,
    description: `${insight.description}${describeSamples(evidence)}`,
  });
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function scorePrioritizedUrl(link) {
  const text = linkText(link);
  if (PATTERNS.auth.test(text) || PATTERNS.admin.test(text)) return 90;
  if (PATTERNS.api.test(text) || PATTERNS.upload.test(text)) return 80;
  if (PATTERNS.token.test(text) || PATTERNS.payment.test(text)) return 70;
  if (PATTERNS.riskyAction.test(text)) return 30;
  return 40;
}

function reasonForLink(link) {
  const text = linkText(link);
  if (PATTERNS.admin.test(text)) return 'Admin-like route';
  if (PATTERNS.auth.test(text)) return 'Authentication-related route';
  if (PATTERNS.api.test(text)) return 'API or machine-readable route';
  if (PATTERNS.upload.test(text)) return 'Upload-related route';
  if (PATTERNS.payment.test(text)) return 'Payment-related route';
  return cleanText(link.text) || 'Linked page';
}

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
