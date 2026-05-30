import { AlertTriangleIcon, InfoIcon } from 'lucide-react';

export const INSTALLATION_GUIDES = [
  {
    id: 'chrome-windows',
    title: 'Chrome / Edge (Windows)',
    steps: [
      'Save the CA certificate above to a location you can find',
      'Open Chrome and go to Settings → Privacy and security',
      'Click "Manage certificates"',
      'Go to the "Authorities" tab',
      'Click "Import" and select the saved 0xbuffer-ca.pem file',
      'When prompted, check "Trust this certificate for identification of websites"',
      'Click "OK" and restart your browser',
    ],
  },
  {
    id: 'chrome-mac',
    title: 'Chrome / Edge (macOS)',
    steps: [
      'Save the CA certificate above to a location you can find',
      'Open Chrome and go to Settings → Privacy and security → Security',
      'Scroll down and click "Manage certificates"',
      'Click "Import" in the dialog that appears',
      'Select the saved 0xbuffer-ca.pem file',
      'Check "Trust for SSL/TLS websites" when prompted',
      'Click "OK" and restart your browser',
    ],
  },
  {
    id: 'firefox',
    title: 'Firefox (All Platforms)',
    steps: [
      'Save the CA certificate above to a location you can find',
      'Open Firefox and go to Options → Privacy & Security',
      'Scroll to "Certificates" section and click "View Certificates"',
      'Click "Authorities" tab',
      'Click "Import" and select the saved 0xbuffer-ca.pem file',
      'Check "Trust this CA to identify websites"',
      'Click "OK" and restart Firefox',
    ],
  },
  {
    id: 'safari',
    title: 'Safari (macOS)',
    steps: [
      'Save the CA certificate above to a location you can find',
      'Open Safari → Preferences → Privacy',
      'Click "Manage Websites" then "Certificates"',
      'Import the saved 0xbuffer-ca.pem file',
      'Set certificate trust to "Always Trust"',
      'Authenticate with Touch ID if prompted',
      'Restart Safari',
    ],
  },
  {
    id: 'ios',
    title: 'iOS (iPhone / iPad)',
    steps: [
      'Save the CA certificate on your device (Files app recommended)',
      'Go to Settings → General → VPN & Device Management',
      'Tap the downloaded profile to install it',
      'Go to Settings → General → About → Certificate Trust Settings',
      'Enable full trust for "0xbuffer Root CA"',
    ],
    note: {
      Icon: InfoIcon,
      message: 'On iOS 13+, you may need to allow the profile in Settings → General → Profiles',
    },
  },
  {
    id: 'android',
    title: 'Android',
    steps: [
      'Save the CA certificate to your device',
      'Go to Settings → Security → Advanced → Encryption & credentials',
      'Tap "Install a certificate" → "CA certificate"',
      'Select the saved 0xbuffer-ca.pem file',
      'Name the certificate and confirm installation',
      'Some devices may require a PIN or password',
    ],
    note: {
      Icon: InfoIcon,
      message: 'Android 7.0+ blocks user-installed CAs for apps by default. Some apps may need additional configuration.',
    },
  },
];

export const HOW_IT_WORKS = [
  {
    title: '1. Certificate Generation',
    body: 'When you first run the proxy, 0xbuffer generates a unique Root CA certificate stored locally on your device.',
  },
  {
    title: '2. CA Installation',
    body: 'Installing this CA in your browser/device tells it to trust certificates signed by 0xbuffer.',
  },
  {
    title: '3. Dynamic Certificate Signing',
    body: 'When you visit an HTTPS site (e.g., example.com), the proxy dynamically creates a certificate for that site, signed by the trusted 0xbuffer CA.',
  },
  {
    title: '4. Secure Passthrough',
    body: 'The proxy decrypts, inspects, and re-encrypts traffic. Your browser sees a valid certificate and shows the padlock.',
  },
  {
    title: '5. Privacy Note',
    body: 'Only traffic passing through 0xbuffer proxy is intercepted. Your browsing outside the proxy remains private.',
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
      'On iOS, enabled full trust in Certificate Trust Settings',
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
      'Windows: Internet Options → Content → Certificates → Authorities → Select "0xbuffer Root CA" → Remove',
      'macOS: Keychain Access → System → Certificates → Delete "0xbuffer Root CA"',
      'Firefox: Options → Privacy → Certificates → View Certificates → Authorities → Delete',
      'iOS: Settings → General → Profiles → Delete 0xbuffer profile',
      'Android: Settings → Security → Advanced → Encryption → Trusted certificates → Remove',
    ],
  },
];

export const SECURITY_NOTICE_ICON = AlertTriangleIcon;

export const AI_PROVIDER_OPTIONS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek' },
];

export const AI_MODEL_OPTIONS_BY_PROVIDER: Record<string, string[]> = {
  openai: [
    'gpt-4.1-mini',
    'gpt-4.1',
    'gpt-5-mini',
    'gpt-5.2',
  ],
  deepseek: [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
  ],
};

export const AI_API_KEY_PLACEHOLDERS: Record<string, string> = {
  openai: 'sk-...',
  deepseek: 'sk-...',
};
