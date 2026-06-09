import { NON_ACTIONABLE_FIELD_TYPES, MAX_EVIDENCE_ITEMS, PATTERNS } from './constants.mjs';

export function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

export function asString(value) {
  return typeof value === 'string' ? value : '';
}

export function cleanText(value) {
  return asString(value).replace(/\s+/g, ' ').trim();
}

export function normalizeHttpStatus(value) {
  const status = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(status) ? status : 0;
}

export function normalizeExtract(extract = {}) {
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

export function fieldText(field) {
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

export function linkText(link) {
  const safeLink = link || {};
  return cleanText(`${safeLink.text || ''} ${safeLink.href || ''}`);
}

export function buttonText(button) {
  const safeButton = button || {};
  return cleanText(`${safeButton.text || ''} ${safeButton.name || ''} ${safeButton.type || ''} ${safeButton.ariaLabel || ''}`);
}

export function scriptText(script) {
  if (typeof script === 'string') return script;
  return cleanText(`${script?.src || ''} ${script?.text || ''}`);
}

export function actionableFields(extract) {
  return extract.forms
    .flatMap((form) => form.fields)
    .filter((field) => {
      const fieldType = field.type?.toLowerCase();
      return !NON_ACTIONABLE_FIELD_TYPES.has(fieldType || '');
    });
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sampleValues(items, getValue, limit = MAX_EVIDENCE_ITEMS) {
  return uniqueBy(items.map(getValue).map(cleanText).filter(Boolean), (item) => item).slice(0, limit);
}

export function describeSamples(samples) {
  if (!samples.length) return '';
  return ` Evidence: ${samples.join(', ')}.`;
}

export function normalizeDefaultInsight(insight) {
  return {
    severity: insight.severity,
    type: insight.type,
    title: insight.title,
    description: insight.description,
    analysisSource: 'default',
  };
}

export function createInsight(insight, evidence = []) {
  return normalizeDefaultInsight({
    ...insight,
    description: `${insight.description}${describeSamples(evidence)}`,
  });
}

export function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function scorePrioritizedUrl(link) {
  const text = linkText(link);
  if (PATTERNS.auth.test(text) || PATTERNS.admin.test(text)) return 90;
  if (PATTERNS.api.test(text) || PATTERNS.upload.test(text)) return 80;
  if (PATTERNS.token.test(text) || PATTERNS.payment.test(text)) return 70;
  if (PATTERNS.riskyAction.test(text)) return 30;
  return 40;
}

export function reasonForLink(link) {
  const text = linkText(link);
  if (PATTERNS.admin.test(text)) return 'Admin-like route';
  if (PATTERNS.auth.test(text)) return 'Authentication-related route';
  if (PATTERNS.api.test(text)) return 'API or machine-readable route';
  if (PATTERNS.upload.test(text)) return 'Upload-related route';
  if (PATTERNS.payment.test(text)) return 'Payment-related route';
  return cleanText(link.text) || 'Linked page';
}

export function allFieldTexts(extract) {
  return extract.forms.flatMap((form) => form.fields).map(fieldText);
}

export function allButtonTexts(extract) {
  return extract.buttons.map(buttonText);
}

export function allScriptTexts(extract) {
  return extract.scripts.map(scriptText);
}

export function currentPageText(extract) {
  return cleanText(`${extract.finalUrl} ${extract.title} ${extract.visibleText}`);
}

export function currentPageEvidence(extract, pattern, label = extract.finalUrl) {
  return pattern.test(currentPageText(extract)) ? [label] : [];
}

export function matchSamples(items, getValue, pattern, limit = MAX_EVIDENCE_ITEMS) {
  return sampleValues(items.filter((item) => pattern.test(getValue(item))), getValue, limit);
}

export function matchTextSamples(values, pattern, limit = MAX_EVIDENCE_ITEMS) {
  return uniqueBy(values.map(cleanText).filter((value) => value && pattern.test(value)), (item) => item).slice(0, limit);
}

export function linkHrefSamples(extract, pattern) {
  return matchSamples(extract.links, (link) => link.href, pattern);
}

export function linkTextSamples(extract, pattern) {
  return matchSamples(extract.links, linkText, pattern);
}

export function fieldSamples(extract, pattern) {
  return matchTextSamples(allFieldTexts(extract), pattern);
}

export function buttonSamples(extract, pattern) {
  return matchTextSamples(allButtonTexts(extract), pattern);
}

export function scriptSamples(extract, pattern) {
  return matchTextSamples(allScriptTexts(extract), pattern);
}

export function formFields(extract) {
  return extract.forms.flatMap((form) => form.fields);
}

export function apiEvidence(extract) {
  return [
    ...linkHrefSamples(extract, PATTERNS.api),
    ...scriptSamples(extract, PATTERNS.api),
    ...currentPageEvidence(extract, PATTERNS.api),
  ].slice(0, MAX_EVIDENCE_ITEMS);
}

export function hasApiSurface(extract) {
  return apiEvidence(extract).length > 0;
}

export function uniqEvidence(...groups) {
  return uniqueBy(groups.flat().map(cleanText).filter(Boolean), (item) => item).slice(0, MAX_EVIDENCE_ITEMS);
}

export function withCategoryCode(category, evidence) {
  return createInsight({
    severity: category.severity,
    type: category.type,
    title: category.title,
    description: `${category.code} - ${category.description}`,
  }, evidence);
}

export function runOwaspCategories(categories, extract, collectEvidence) {
  return categories.flatMap((category) => {
    const evidence = collectEvidence(category.type, extract);
    return evidence.length > 0 ? [withCategoryCode(category, evidence)] : [];
  });
}

export function webOwaspEvidence(type, extract) {
  const fields = formFields(extract);
  const hasError = (extract.httpStatus || 0) >= 400;

  switch (type) {
    case 'owasp-web-a01-broken-access-control':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.admin),
        linkTextSamples(extract, PATTERNS.riskyAction),
        buttonSamples(extract, PATTERNS.riskyAction),
        currentPageEvidence(extract, PATTERNS.admin)
      );
    case 'owasp-web-a02-security-misconfiguration':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.debug),
        scriptSamples(extract, PATTERNS.debug),
        currentPageEvidence(extract, PATTERNS.debug),
        linkHrefSamples(extract, /swagger|openapi|redoc|graphiql|\.env|config|server-status|actuator/i)
      );
    case 'owasp-web-a03-software-supply-chain-failures':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.dependency),
        scriptSamples(extract, PATTERNS.dependency),
        currentPageEvidence(extract, PATTERNS.dependency)
      );
    case 'owasp-web-a04-cryptographic-failures':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.secrets),
        scriptSamples(extract, PATTERNS.secrets),
        fieldSamples(extract, PATTERNS.secrets),
        currentPageEvidence(extract, PATTERNS.secrets),
        currentPageEvidence(extract, PATTERNS.crypto),
        extract.finalUrl.startsWith('http://') ? ['non-HTTPS page URL'] : []
      );
    case 'owasp-web-a05-injection':
      return uniqEvidence(
        fieldSamples(extract, PATTERNS.injection),
        linkTextSamples(extract, PATTERNS.injection),
        buttonSamples(extract, PATTERNS.injection),
        currentPageEvidence(extract, /\?(q|query|search|filter|where|id)=/i, extract.finalUrl)
      );
    case 'owasp-web-a06-insecure-design':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.businessFlow),
        buttonSamples(extract, PATTERNS.businessFlow),
        fieldSamples(extract, PATTERNS.businessFlow),
        currentPageEvidence(extract, PATTERNS.businessFlow)
      );
    case 'owasp-web-a07-authentication-failures':
      return uniqEvidence(
        fieldSamples(extract, PATTERNS.auth),
        fieldSamples(extract, PATTERNS.token),
        linkTextSamples(extract, PATTERNS.auth),
        currentPageEvidence(extract, PATTERNS.auth),
        fields.some((field) => field.type?.toLowerCase() === 'password') ? ['password field'] : []
      );
    case 'owasp-web-a08-integrity-failures':
      return uniqEvidence(
        fieldSamples(extract, PATTERNS.upload),
        fieldSamples(extract, PATTERNS.integrity),
        linkTextSamples(extract, PATTERNS.integrity),
        buttonSamples(extract, PATTERNS.integrity),
        scriptSamples(extract, PATTERNS.integrity)
      );
    case 'owasp-web-a09-logging-alerting-failures':
      return uniqEvidence(
        linkTextSamples(extract, /\b(logs?|audit|monitor|metrics|alert|events?)\b/i),
        buttonSamples(extract, /\b(logs?|audit|monitor|metrics|alert|events?)\b/i),
        currentPageEvidence(extract, /\b(logs?|audit|monitor|metrics|alert|events?)\b/i)
      );
    case 'owasp-web-a10-exception-handling':
      return uniqEvidence(
        hasError ? [`HTTP ${extract.httpStatus}`] : [],
        currentPageEvidence(extract, PATTERNS.exceptionHandling),
        linkTextSamples(extract, PATTERNS.exceptionHandling)
      );
    default:
      return [];
  }
}

export function apiOwaspEvidence(type, extract) {
  if (!hasApiSurface(extract)) return [];

  switch (type) {
    case 'owasp-api1-bola':
      return uniqEvidence(
        linkHrefSamples(extract, PATTERNS.objectId),
        currentPageEvidence(extract, PATTERNS.objectId, extract.finalUrl)
      );
    case 'owasp-api2-broken-authentication':
      return uniqEvidence(
        fieldSamples(extract, PATTERNS.auth),
        fieldSamples(extract, PATTERNS.token),
        linkTextSamples(extract, PATTERNS.auth),
        scriptSamples(extract, PATTERNS.secrets),
        scriptSamples(extract, PATTERNS.auth),
        currentPageEvidence(extract, PATTERNS.auth)
      );
    case 'owasp-api3-bopla':
      return uniqEvidence(
        fieldSamples(extract, /\b(role|roles|admin|is_admin|permissions?|scope|scopes|profile|email|address|metadata|properties|attrs?)\b/i),
        linkTextSamples(extract, /\b(fields?|include|expand|select|properties|attrs?|profile|metadata)\b/i),
        currentPageEvidence(extract, /\b(fields?|include|expand|select|properties|attrs?|profile|metadata)\b/i)
      );
    case 'owasp-api4-unrestricted-resource-consumption':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.bulkFlow),
        buttonSamples(extract, PATTERNS.bulkFlow),
        fieldSamples(extract, /\b(limit|offset|page|per_page|size|count|bulk|batch|export|download|file|image|video)\b/i),
        currentPageEvidence(extract, /\b(limit|offset|page|per_page|bulk|batch|export|download)\b/i)
      );
    case 'owasp-api5-broken-function-level-authorization':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.admin),
        linkTextSamples(extract, PATTERNS.riskyAction),
        buttonSamples(extract, PATTERNS.riskyAction),
        currentPageEvidence(extract, PATTERNS.admin)
      );
    case 'owasp-api6-sensitive-business-flows':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.businessFlow),
        buttonSamples(extract, PATTERNS.businessFlow),
        currentPageEvidence(extract, PATTERNS.businessFlow)
      );
    case 'owasp-api7-ssrf':
      return uniqEvidence(
        fieldSamples(extract, PATTERNS.ssrf),
        linkTextSamples(extract, PATTERNS.ssrf),
        currentPageEvidence(extract, PATTERNS.ssrf)
      );
    case 'owasp-api8-security-misconfiguration':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.debug),
        linkHrefSamples(extract, /swagger|openapi|redoc|graphiql|\.env|config|actuator|metrics|debug/i),
        scriptSamples(extract, PATTERNS.debug),
        currentPageEvidence(extract, PATTERNS.debug)
      );
    case 'owasp-api9-improper-inventory':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.endpointInventory),
        scriptSamples(extract, PATTERNS.endpointInventory),
        currentPageEvidence(extract, PATTERNS.endpointInventory),
        apiEvidence(extract)
      );
    case 'owasp-api10-unsafe-consumption-of-apis':
      return uniqEvidence(
        linkTextSamples(extract, PATTERNS.thirdParty),
        scriptSamples(extract, PATTERNS.thirdParty),
        fieldSamples(extract, PATTERNS.thirdParty),
        currentPageEvidence(extract, PATTERNS.thirdParty)
      );
    default:
      return [];
  }
}
