export const DOCUMENT_SECTION_DEFINITIONS = [
  {
    key: 'scope',
    title: 'Scope',
    description: 'In-scope domains, IP ranges, apps, exclusions, rules of engagement',
    placeholder: 'example.com\n10.0.0.0/24\nExclude staging.example.com',
  },
  {
    key: 'targetsDiscovered',
    title: 'Targets discovered',
    description: 'Subdomains, IPs, URLs, mobile apps, APIs, cloud assets',
    placeholder: 'api.example.com\nhttps://portal.example.com\nAndroid app: com.example.mobile',
  },
  {
    key: 'dnsData',
    title: 'DNS data',
    description: 'A/AAAA, CNAME, MX, TXT, NS records, dangling DNS, SPF/DMARC',
    placeholder: 'api.example.com CNAME edge.vendor.net\nTXT v=spf1 include:_spf.example.com ~all',
  },
  {
    key: 'hostsAndServices',
    title: 'Hosts and services',
    description: 'Open ports, service banners, versions, TLS info',
    placeholder: '203.0.113.10:443 nginx 1.24\n203.0.113.11:22 OpenSSH 9.6',
  },
  {
    key: 'webObservations',
    title: 'Web observations',
    description: 'Tech stack, login pages, admin panels, exposed directories, redirects',
    placeholder: 'React frontend\n/admin redirects to /login\n/.git returns 403',
  },
  {
    key: 'endpoints',
    title: 'Endpoints',
    description: 'API routes, parameters, forms, GraphQL endpoints, upload functions',
    placeholder: 'GET /api/v1/users?id=\nPOST /upload\nPOST /graphql',
  },
  {
    key: 'authenticationDetails',
    title: 'Authentication details',
    description: 'Login flows, SSO providers, password reset, MFA behavior, roles observed',
    placeholder: 'OIDC via Okta\nPassword reset reveals registered emails\nObserved roles: user, admin',
  },
  {
    key: 'usersAndOrgInfo',
    title: 'Users / org info',
    description: 'Employee names, email patterns, GitHub orgs, job posts, public docs',
    placeholder: 'Email pattern: first.last@example.com\nGitHub org: example-inc',
  },
  {
    key: 'potentialVulnerabilities',
    title: 'Potential vulnerabilities',
    description: 'Misconfigurations, exposed secrets, debug pages, old software, weak headers',
    placeholder: 'GraphQL introspection enabled\nMissing CSP\nOld Jenkins instance exposed',
  },
  {
    key: 'evidence',
    title: 'Evidence',
    description: 'Screenshots, request/response samples, command output, timestamps',
    placeholder: '2026-05-18 10:42 UTC — screenshot admin-login.png\ncurl output saved in notes',
  },
] as const;

export type DocumentSectionKey = (typeof DOCUMENT_SECTION_DEFINITIONS)[number]['key'];

export type DocumentTemplateId = 'blank' | 'developer' | 'qa' | 'securityResearcher';

export interface DocumentTemplateCustomSection {
  title: string;
  description: string;
  placeholder: string;
  content: string;
}

export interface DocumentTemplate {
  id: DocumentTemplateId;
  title: string;
  description: string;
  documentTitle: string;
  sections: Partial<Record<DocumentSectionKey, string>>;
  customSections: DocumentTemplateCustomSection[];
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'developer',
    title: 'Developer',
    description: 'Implementation notes, API behavior, dependencies, and remediation work.',
    documentTitle: 'Developer Report',
    sections: {
      scope: '## Project / Component\n\n## In Scope\n\n## Out of Scope\n',
      targetsDiscovered:
        '## Applications\n\n## Services\n\n## APIs\n\n## Repositories / Packages\n',
      hostsAndServices: '## Runtime Services\n\n## Dependencies\n\n## External Integrations\n',
      endpoints: '## API Inventory\n\n| Method | Path | Purpose | Auth | Notes |\n| --- | --- | --- | --- | --- |\n',
      webObservations: '## Frontend / Client Behavior\n\n## State Management\n\n## Error Handling\n',
      potentialVulnerabilities: '## Implementation Risks\n\n## Technical Debt\n\n## Remediation Tasks\n',
      evidence: '## Evidence\n\n## Links / References\n',
    },
    customSections: [
      {
        title: 'Architecture',
        description: 'Components, data flow, queues, storage, and trust boundaries.',
        placeholder: 'Frontend -> API -> worker -> database',
        content: '## Components\n\n## Data Flow\n\n## Trust Boundaries\n',
      },
      {
        title: 'Release Notes',
        description: 'Deployment impact, feature flags, migration notes, and rollback plan.',
        placeholder: 'Feature flag: report_templates\nRollback: restore previous build',
        content: '## Deployment Notes\n\n## Migration Notes\n\n## Rollback Plan\n',
      },
    ],
  },
  {
    id: 'qa',
    title: 'QA',
    description: 'Test scope, environments, scenarios, defects, regressions, and evidence.',
    documentTitle: 'QA Report',
    sections: {
      scope: '## Feature Under Test\n\n## In Scope\n\n## Out of Scope\n\n## Acceptance Criteria\n',
      targetsDiscovered: '## Builds\n\n## Environments\n\n## Test Accounts\n\n## Test Data\n',
      webObservations: '## UI Coverage\n\n## Browser / Device Coverage\n\n## Accessibility Notes\n',
      endpoints: '## API Coverage\n\n| Method | Path | Scenario | Expected Result | Status |\n| --- | --- | --- | --- | --- |\n',
      authenticationDetails: '## Roles Tested\n\n## Login / Logout\n\n## Permissions\n',
      potentialVulnerabilities: '## Defects\n\n| Severity | Area | Summary | Status |\n| --- | --- | --- | --- |\n',
      evidence: '## Screenshots\n\n## Logs\n\n## Reproduction Notes\n',
    },
    customSections: [
      {
        title: 'Test Matrix',
        description: 'Scenario coverage and pass/fail tracking.',
        placeholder: 'Scenario: user can create a report from template',
        content: '| Scenario | Priority | Result | Notes |\n| --- | --- | --- | --- |\n',
      },
      {
        title: 'Regression Notes',
        description: 'Areas retested after fixes or release candidates.',
        placeholder: 'Retested document creation after template selector change',
        content: '## Retested Areas\n\n## Open Risks\n',
      },
    ],
  },
  {
    id: 'securityResearcher',
    title: 'Security Researcher',
    description: 'Recon scope, attack surface, findings, proof of concept, and impact.',
    documentTitle: 'Security Research Report',
    sections: {
      scope: '## Program / Target\n\n## In Scope\n\n## Out of Scope\n\n## Rules of Engagement\n',
      targetsDiscovered: '## Assets\n\n## Subdomains\n\n## Applications\n\n## APIs\n',
      dnsData: '## DNS Records\n\n## Interesting DNS Findings\n',
      hostsAndServices: '## Exposed Services\n\n## TLS Notes\n\n## Service Versions\n',
      webObservations: '## Attack Surface\n\n## Technologies\n\n## Interesting Behavior\n',
      endpoints: '## Endpoints\n\n| Method | Path | Parameters | Auth | Notes |\n| --- | --- | --- | --- | --- |\n',
      authenticationDetails: '## Auth Flow\n\n## Roles / Permissions\n\n## Session Behavior\n',
      potentialVulnerabilities:
        '## Findings\n\n| Severity | Title | Asset | Status |\n| --- | --- | --- | --- |\n\n## Impact\n\n## Recommendations\n',
      evidence: '## Proof of Concept\n\n## Requests / Responses\n\n## Screenshots\n',
    },
    customSections: [
      {
        title: 'Methodology',
        description: 'Tools, wordlists, payloads, and testing approach.',
        placeholder: 'Tools: proxy, repeater, browser automation',
        content: '## Tools\n\n## Approach\n\n## Constraints\n',
      },
      {
        title: 'Disclosure Timeline',
        description: 'Report submission and communication timeline.',
        placeholder: '2026-06-07 - Submitted initial report',
        content: '| Date | Event |\n| --- | --- |\n',
      },
    ],
  },
  {
    id: 'blank',
    title: 'Blank',
    description: 'Start with the default empty recon document.',
    documentTitle: '',
    sections: {},
    customSections: [],
  },
];

export function getDocumentTemplate(templateId: DocumentTemplateId = 'blank') {
  return (
    DOCUMENT_TEMPLATES.find((template) => template.id === templateId) ??
    DOCUMENT_TEMPLATES.find((template) => template.id === 'blank') ??
    DOCUMENT_TEMPLATES[0]
  );
}
