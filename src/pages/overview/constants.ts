import documentsImg from '@/assets/feature/documents.png';
import terminalImg from '@/assets/feature/terminal.png';
import browserImg from '@/assets/feature/browser.png';
import repeaterImg from '@/assets/feature/repeater.png';
import workflowImg from '@/assets/feature/workflow.png';
import {
  ArrowsDownUpIcon, WifiHighIcon, SpinnerIcon, AppWindowIcon, PauseCircleIcon,
  SwordIcon, ArrowsClockwiseIcon, FileTextIcon, BinaryIcon, FingerprintIcon,
  GitDiffIcon, NetworkIcon, KeyIcon, LightningIcon, DatabaseIcon, BugIcon, FlaskIcon,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Live Traffic': 'Capture and inspect real-time HTTP/HTTPS and WebSocket network traffic.',
  'FlowArrowIcon': 'Build and execute automated visual workflows for target reconnaissance.',
  'Browser': 'Control an automated browser session to crawl websites and capture elements.',
  'Intercept': 'PauseIcon incoming or outgoing requests to modify headers, parameters, and bodies.',
  'Invoker': 'Generate client-side requests, perform attacks, and trigger endpoints.',
  'Repeater': 'Modify HTTP requests, reissue them, and analyze responses side-by-side.',
  'Documents': 'Create markdown documents, API definitions, and manage target scopes.',
  'Tools': 'Access encoders, decoders, hashes, and other payload helper utilities.',
  'Debugger': 'Analyze proxy engine logs, active tunnels, and troubleshoot performance.',
  'Regression': 'Execute automated regression tests on target endpoints.'
};

export const FEATURE_IMAGES: Record<string, string> = {
  'Documents': documentsImg,
  'Debugger': terminalImg,
  'Browser': browserImg,
  'Repeater': repeaterImg,
  'FlowArrowIcon': workflowImg
};

// ponytail: Phosphor icons — semantically matched per feature
export const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'HTTP': ArrowsDownUpIcon,
  'WebSocket': WifiHighIcon,
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
