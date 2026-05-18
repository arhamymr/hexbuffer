import type { PageTabItem } from '@/pages/shared/tab-bar';

export const AI_TOOLS_TABS: PageTabItem[] = [
  { id: 'prompt-injection', name: 'Prompt Injection' },
  { id: 'jailbreak', name: 'Jailbreak', disabled: true },
  { id: 'prompt-leak', name: 'Prompt Leak', disabled: true },
];
