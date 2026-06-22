import binaryImg from '@/assets/feature/binary.png';
import documentsImg from '@/assets/feature/documents.png';
import toolsImg from '@/assets/feature/tools.png';
import terminalImg from '@/assets/feature/terminal.png';
import browserImg from '@/assets/feature/browser.png';
import repeaterImg from '@/assets/feature/repeater.png';
import workflowImg from '@/assets/feature/workflow.png';

export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Live Traffic': 'Capture and inspect real-time HTTP/HTTPS and WebSocket network traffic.',
  'Workflow': 'Build and execute automated visual workflows for target reconnaissance.',
  'Browser': 'Control an automated browser session to crawl websites and capture elements.',
  'Intercept': 'Pause incoming or outgoing requests to modify headers, parameters, and bodies.',
  'Code': 'Run and test custom code scripts in a sandbox environment.',
  'Invoker': 'Generate client-side requests, perform attacks, and trigger endpoints.',
  'Repeater': 'Modify HTTP requests, reissue them, and analyze responses side-by-side.',
  'Threats': 'View active threat intelligence, rule matches, and signature alerts.',
  'Documents': 'Create markdown documents, API definitions, and manage target scopes.',
  'Tools': 'Access encoders, decoders, hashes, and other payload helper utilities.',
  'Code Audit': 'Scan source code folders for potential vulnerabilities and bugs.',
  'Debugger': 'Analyze proxy engine logs, active tunnels, and troubleshoot performance.',
  'Regression': 'Execute automated regression tests on target endpoints.',
  'APIs Collection': 'Manage local collections of API routes, definitions, and specs.'
};

export const FEATURE_IMAGES: Record<string, string> = {
  'Code': binaryImg,
  'Documents': documentsImg,
  'Tools': toolsImg,
  'Debugger': terminalImg,
  'Browser': browserImg,
  'Repeater': repeaterImg,
  'Workflow': workflowImg
};
