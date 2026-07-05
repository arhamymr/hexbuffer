import {
  ArrowsDownUpIcon, WifiHighIcon, SpinnerIcon, AppWindowIcon, PauseCircleIcon,
  SwordIcon, ArrowsClockwiseIcon, FileTextIcon, BinaryIcon, FingerprintIcon,
  GitDiffIcon, NetworkIcon, KeyIcon, LightningIcon, DatabaseIcon, BugIcon, FlaskIcon,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';

// ponytail: Simplified feature descriptions matched to exact navItem labels for accurate search matching
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'HTTP': 'Capture and inspect real-time HTTP/HTTPS network traffic.',
  'WebSocket': 'Capture and inspect real-time WebSocket network traffic.',
  'Workflow': 'Build and execute automated visual workflows for target reconnaissance.',
  'FlowArrowIcon': 'Build and execute automated visual workflows for target reconnaissance.',
  'Browser': 'Control an automated browser session to crawl websites and capture elements.',
  'Intercept': 'Pause incoming or outgoing requests to modify headers, parameters, and bodies.',
  'Invoker': 'Generate client-side requests, perform attacks, and trigger endpoints.',
  'Repeater': 'Modify HTTP requests, reissue them, and analyze responses side-by-side.',
  'Documents': 'Create markdown documents, API definitions, and manage target scopes.',
  'Encoder': 'Access encoders, decoders, hashes, and other payload helper utilities.',
  'Hash': 'Generate and verify cryptographic hash functions.',
  'Comparer': 'Compare files, requests, or text side-by-side.',
  'Port Scanner': 'Scan host ports for open services and network vulnerabilities.',
  'JWT': 'Decode, edit, and sign JSON Web Tokens.',
  'XSS': 'Generate cross-site scripting payloads and templates.',
  'SQL Inject': 'Test databases for SQL injection vulnerabilities.',
  'Debugger': 'Analyze proxy engine logs, active tunnels, and troubleshoot performance.',
  'Regression': 'Execute automated regression tests on target endpoints.',
  'Settings': 'Configure proxy certificate, theme, and application preferences.',
  'AI Assistant': 'Interact with AI to analyze web traffic and write exploits.',
  'Scratchpad': 'Write quick notes, scripts, or documentation.',
};

// ponytail: Phosphor icons — semantically matched per feature (supports both label and key mapping)
export const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'HTTP': ArrowsDownUpIcon,
  'WebSocket': WifiHighIcon,
  'Workflow': SpinnerIcon,
  'FlowArrowIcon': SpinnerIcon,
  'Browser': AppWindowIcon,
  'Intercept': PauseCircleIcon,
  'Invoker': SwordIcon,
  'Repeater': ArrowsClockwiseIcon,
  'Documents': FileTextIcon,
  'Encoder': BinaryIcon,
  'Hash': FingerprintIcon,
  'Comparer': GitDiffIcon,
  'Port Scanner': NetworkIcon,
  'JWT': KeyIcon,
  'XSS': LightningIcon,
  'SQL Inject': DatabaseIcon,
  'Debugger': BugIcon,
  'Regression': FlaskIcon,
};

