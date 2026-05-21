import type { Target } from '@/types';
import type { AnalysisSeverity, DashboardAnalysisFramework } from './lib/analyze-asset-input';

export const DASHBOARD_DUMMY_TARGETS: Target[] = [
  {
    id: 'dummy-acme-prod',
    name: 'Acme Production',
    description: 'Primary production surface with customer-facing API and a few suspicious environment leaks.',
    scope: [
      'acme.test',
      '*.acme.test',
      'api.acme.test',
      'admin.acme.test',
      'cdn.acme.test',
      'storage.googleapis.com/acme-prod-backups',
    ],
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  },
  {
    id: 'dummy-payments',
    name: 'Payments Platform',
    description: 'Payment-related hosts with internal and staging references that should be reviewed carefully.',
    scope: [
      'pay.acme.test',
      'checkout.acme.test',
      'staging-pay.acme.test',
      'internal-pay.acme.test',
      '10.10.12.14',
    ],
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  },
  {
    id: 'dummy-support',
    name: 'Support Portal',
    description: 'Support and helpdesk footprint with email and storage indicators for reporting workflows.',
    scope: [
      'support.acme.test',
      'help.acme.test',
      'assets.acme.test',
      'support@acme.test',
      's3://acme-support-exports',
    ],
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  },
];

export const DASHBOARD_SEVERITY_CLASSNAME: Record<AnalysisSeverity, string> = {
  critical: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-300 dark:border-red-900',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-300 dark:border-orange-900',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-900',
  low: 'bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-300 dark:border-sky-900',
  info: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900',
};

export const DASHBOARD_FRAMEWORKS: Array<{
  id: DashboardAnalysisFramework;
  label: string;
}> = [
  { id: 'general', label: 'General' },
  { id: 'owasp-api-top-10', label: 'OWASP API Top 10' },
  { id: 'owasp-web-top-10', label: 'OWASP Web Top 10' },
  { id: 'recon', label: 'Recon' },
  { id: 'misconfiguration', label: 'Misconfiguration' },
];

export const DASHBOARD_AI_MODELS = [
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-5-mini',
  'gpt-5.2',
];

export const DASHBOARD_DEFAULT_AI_MODEL = 'gpt-4.1-mini';
