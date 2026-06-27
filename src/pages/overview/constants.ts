import documentsImg from '@/assets/feature/documents.png';
import terminalImg from '@/assets/feature/terminal.png';
import browserImg from '@/assets/feature/browser.png';
import repeaterImg from '@/assets/feature/repeater.png';
import workflowImg from '@/assets/feature/workflow.png';
import type { ComponentType } from 'react';

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Live Traffic': 'Capture and inspect real-time HTTP/HTTPS and WebSocket network traffic.',
  'Workflow': 'Build and execute automated visual workflows for target reconnaissance.',
  'Browser': 'Control an automated browser session to crawl websites and capture elements.',
  'Intercept': 'Pause incoming or outgoing requests to modify headers, parameters, and bodies.',
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
  'Workflow': workflowImg
};

export const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {};
