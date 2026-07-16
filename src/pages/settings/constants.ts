import { WarningCircleIcon, GitBranchIcon, ChatCircleIcon } from '@phosphor-icons/react';

export const INSTALLATION_GUIDES = [
  {
    id: 'chrome-windows',
    title: 'Chrome / Edge (Windows)',
    steps: [
      'Open Chrome and go to Settings → Privacy and security',
      'Click "Manage certificates"',
      'Go to the "Authorities" tab',
      'Click "Import" and select the saved hexbuffer-ca.pem file',
      'When prompted, check "Trust this certificate for identification of websites"',
      'Click "OK" and restart your browser',
    ],
  },
  {
    id: 'chrome-mac',
    title: 'Chrome / Edge (macOS)',
    steps: [
      'Open Chrome and go to Settings → Privacy and security → Security',
      'Scroll down and click "Manage certificates"',
      'Click "Import" in the dialog that appears',
      'Select the saved hexbuffer-ca.pem file',
      'CheckIcon "Trust for SSL/TLS websites" when prompted',
      'Click "OK" and restart your browser',
    ],
  },
  {
    id: 'firefox',
    title: 'Firefox (All Platforms)',
    steps: [
      'Open Firefox and go to Options → Privacy & Security',
      'Scroll to "Certificates" section and click "View Certificates"',
      'Click "Authorities" tab',
      'Click "Import" and select the saved hexbuffer-ca.pem file',
      'CheckIcon "Trust this CA to identify websites"',
      'Click "OK" and restart Firefox',
    ],
  },
  {
    id: 'safari',
    title: 'Safari (macOS)',
    steps: [
      'Open Safari → Preferences → Privacy',
      'Click "Manage Websites" then "Certificates"',
      'Import the saved hexbuffer-ca.pem file',
      'Set certificate trust to "Always Trust"',
      'Authenticate with Touch ID if prompted',
      'Restart Safari',
    ],
  },
];

export const HOW_IT_WORKS = [
  {
    title: '1. Certificate Generation',
    body: 'When you first run the proxy, hexbuffer generates a unique Root CA certificate stored locally on your device.',
  },
  {
    title: '2. CA Installation',
    body: 'Installing this CA in your browser/device tells it to trust certificates signed by hexbuffer.',
  },
  {
    title: '3. Dynamic Certificate Signing',
    body: 'When you visit an HTTPS site (e.g., example.com), the proxy dynamically creates a certificate for that site, signed by the trusted hexbuffer CA.',
  },
  {
    title: '4. Secure Passthrough',
    body: 'The proxy decrypts, inspects, and re-encrypts traffic. Your browser sees a valid certificate and shows the padlock.',
  },
  {
    title: '5. Privacy NoteIcon',
    body: 'Only traffic passing through hexbuffer proxy is intercepted. Your browsing outside the proxy remains private.',
  },
];

export const TROUBLESHOOTING_GUIDES = [
  {
    id: 'cert-warning',
    title: 'Browser shows "Certificate Not Trusted" warning',
    bullets: [
      'Correctly imported the CA certificate',
      'Set the CA to "Trusted" or "Always Trust" in your browser settings',
      'Restarted your browser after installing the certificate',
    ],
  },
  {
    id: 'some-apps-not-working',
    title: "Some apps don't work with interception enabled",
    body: "Some apps use certificate pinning and won't accept the proxy's certificate. This is a security feature. To bypass for testing, you would need to disable certificate pinning in those apps, which typically requires root access or modifying the app.",
  },
  {
    id: 'remove-ca',
    title: 'How to remove the CA certificate',
    bullets: [
      'Windows: Internet Options → Content → Certificates → Authorities → Select "Hexbuffer security Tools Root CA" → Remove',
      'macOS: Keychain Access → System → Certificates → Delete "Hexbuffer security Tools Root CA"',
      'Firefox: Options → Privacy → Certificates → View Certificates → Authorities → Delete',
    ],
  },
];

export const SECURITY_NOTICE_ICON = WarningCircleIcon;

export const AI_PROVIDER_OPTIONS = [
  { id: 'deepseek', label: 'DeepSeek' },
];

export const AI_MODEL_OPTIONS_BY_PROVIDER: Record<string, string[]> = {
  deepseek: [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
  ],
};

export const AI_API_KEY_PLACEHOLDERS: Record<string, string> = {
  deepseek: 'sk-...',
};

export const PROFILE_LINKS = [
  {
    label: 'Threads',
    href: 'https://www.threads.com/@arhamymr',
    Icon: ChatCircleIcon,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/arhamymr',
    Icon: GitBranchIcon,
  },
];
