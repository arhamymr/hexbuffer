export interface PredefinedPayload {
  id: string;
  category: string;
  name: string;
  description: string;
  values: string[];
}

export const PREDEFINED_PAYLOADS: PredefinedPayload[] = [
  {
    id: 'auth-common-usernames',
    category: 'Auth',
    name: 'Common usernames',
    description: 'Small starter list for username discovery in authorized tests.',
    values: ['admin', 'administrator', 'root', 'user', 'test', 'guest', 'support', 'dev'],
  },
  {
    id: 'auth-common-passwords',
    category: 'Auth',
    name: 'Common weak passwords',
    description: 'Short weak-password set for validating lockout and rate-limit behavior.',
    values: ['password', 'password1', 'admin', 'admin123', '123456', 'qwerty', 'letmein', 'welcome'],
  },
  {
    id: 'auth-default-creds',
    category: 'Auth',
    name: 'Default credential words',
    description: 'Default-ish words often used in lab devices and test environments.',
    values: ['admin:admin', 'admin:password', 'root:root', 'test:test', 'guest:guest'],
  },
  {
    id: 'numeric-pins-compact',
    category: 'Numeric',
    name: 'Compact PIN samples',
    description: 'Representative PIN values for workflow testing without a huge list.',
    values: ['0000', '1111', '1234', '1212', '2222', '4321', '9999', '2580'],
  },
  {
    id: 'discovery-common-paths',
    category: 'Discovery',
    name: 'Common paths',
    description: 'Common application paths for authorized endpoint discovery.',
    values: ['/admin', '/login', '/api', '/debug', '/status', '/health', '/config', '/backup'],
  },
  {
    id: 'sql-auth-checks',
    category: 'Injection',
    name: 'SQL auth checks',
    description: 'Small set of SQL payloads for checking input handling in owned targets.',
    values: ["' OR '1'='1", "' OR 1=1--", '" OR "1"="1', "admin'--", "') OR ('1'='1"],
  },
  {
    id: 'xss-basic-reflection',
    category: 'Injection',
    name: 'Basic XSS reflection',
    description: 'Simple strings for checking whether input is reflected unsafely.',
    values: ['<script>alert(1)</script>', '"><script>alert(1)</script>', '<img src=x onerror=alert(1)>'],
  },
  {
    id: 'path-traversal-basic',
    category: 'Traversal',
    name: 'Basic traversal',
    description: 'Compact path traversal checks for authorized file path testing.',
    values: ['../', '../../', '../../../etc/passwd', '..\\..\\windows\\win.ini', '%2e%2e%2f'],
  },
];

export const PAYLOAD_CATEGORIES = Array.from(
  new Set(PREDEFINED_PAYLOADS.map((payload) => payload.category))
);
