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
