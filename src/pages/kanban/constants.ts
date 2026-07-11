import type { Priority, KanbanCard, KanbanColumn, GroupBy } from './types';

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'text-red-500', dot: 'bg-red-500' },
  high:     { label: 'High',     color: 'text-orange-400', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', dot: 'bg-yellow-400' },
  low:      { label: 'Low',      color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

export const STATUS_COLUMNS: KanbanColumn[] = [
  { id: 'todo',        title: 'To Do',        wipLimit: undefined, color: 'oklch(0.6 0.04 240)' },
  { id: 'in-progress', title: 'In Progress',  wipLimit: 3,         color: 'oklch(0.72 0.15 200)' },
  { id: 'review',      title: 'In Review',    wipLimit: 2,         color: 'oklch(0.72 0.15 280)' },
  { id: 'done',        title: 'Done',         wipLimit: undefined, color: 'oklch(0.65 0.18 145)' },
];

export const PRIORITY_COLUMNS: KanbanColumn[] = [
  { id: 'critical', title: 'Critical', color: 'oklch(0.6 0.2 20)' },
  { id: 'high',     title: 'High',     color: 'oklch(0.65 0.18 55)' },
  { id: 'medium',   title: 'Medium',   color: 'oklch(0.72 0.15 90)' },
  { id: 'low',      title: 'Low',      color: 'oklch(0.6 0.04 240)' },
];

export const SEED_CARDS: KanbanCard[] = [
  {
    id: 'c1', title: 'Implement DNS rebinding detection', columnId: 'in-progress', priority: 'critical',
    assignee: 'AR', assigneeColor: '#00c950', dueDate: '2026-07-15',
    description: 'Detect and flag DNS rebinding attempts during OOB interaction capture.',
    tags: ['backend', 'security'],
    subtasks: [
      { id: 'c1s1', title: 'Research DNS rebinding patterns', done: true },
      { id: 'c1s2', title: 'Implement detection logic in Rust', done: true },
      { id: 'c1s3', title: 'Add unit tests', done: false },
      { id: 'c1s4', title: 'Integration test with real DNS', done: false },
      { id: 'c1s5', title: 'Document in README', done: false },
    ],
  },
  {
    id: 'c2', title: 'Drag-and-drop request reorder in Repeater', columnId: 'todo', priority: 'high',
    assignee: 'MK', assigneeColor: '#818cf8',
    tags: ['frontend', 'ux'],
    subtasks: [
      { id: 'c2s1', title: 'Design UX flow', done: false },
      { id: 'c2s2', title: 'Wire up dnd-kit', done: false },
      { id: 'c2s3', title: 'Persist order in store', done: false },
    ],
  },
  {
    id: 'c3', title: 'WebSocket message diffing', columnId: 'review', priority: 'high',
    assignee: 'AR', assigneeColor: '#00c950', dueDate: '2026-07-12',
    tags: ['frontend'],
    subtasks: [
      { id: 'c3s1', title: 'Add diff mode toggle', done: true },
      { id: 'c3s2', title: 'Integrate diff library', done: true },
      { id: 'c3s3', title: 'Handle binary frames', done: false },
    ],
  },
  {
    id: 'c4', title: 'Proxy TLS fingerprint collection', columnId: 'todo', priority: 'medium',
    assignee: 'JS', assigneeColor: '#f472b6',
    tags: ['backend', 'proxy'],
    subtasks: [
      { id: 'c4s1', title: 'Research JA3 fingerprinting', done: false },
      { id: 'c4s2', title: 'Capture in Rustls interceptor', done: false },
    ],
  },
  {
    id: 'c5', title: 'Export HTTP history as HAR', columnId: 'done', priority: 'medium',
    assignee: 'MK', assigneeColor: '#818cf8',
    tags: ['frontend', 'export'],
    subtasks: [
      { id: 'c5s1', title: 'Build HAR serializer', done: true },
      { id: 'c5s2', title: 'Add export button', done: true },
      { id: 'c5s3', title: 'Test with Firefox DevTools', done: true },
    ],
  },
  {
    id: 'c6', title: 'Custom payload templates for XSS module', columnId: 'in-progress', priority: 'medium',
    assignee: 'JS', assigneeColor: '#f472b6', dueDate: '2026-07-18',
    tags: ['frontend', 'xss'],
    subtasks: [
      { id: 'c6s1', title: 'Design template schema', done: true },
      { id: 'c6s2', title: 'Build template editor UI', done: false },
      { id: 'c6s3', title: 'Storage layer in SQLite', done: false },
    ],
  },
  {
    id: 'c7', title: 'AI prompt caching for repeated analysis', columnId: 'todo', priority: 'low',
    tags: ['backend', 'ai'],
    subtasks: [],
  },
  {
    id: 'c8', title: 'Keyboard shortcut layer (Raycast-style)', columnId: 'todo', priority: 'high',
    assignee: 'AR', assigneeColor: '#00c950',
    tags: ['frontend', 'ux'],
    subtasks: [
      { id: 'c8s1', title: 'Map shortcut registry', done: false },
      { id: 'c8s2', title: 'Build shortcut palette modal', done: false },
      { id: 'c8s3', title: 'Persist custom bindings', done: false },
      { id: 'c8s4', title: 'Document all defaults', done: false },
    ],
  },
  {
    id: 'c9', title: 'Dark/light theme toggle persistence', columnId: 'done', priority: 'low',
    tags: ['frontend'],
    subtasks: [
      { id: 'c9s1', title: 'Add toggle to settings', done: true },
      { id: 'c9s2', title: 'Persist in Tauri store', done: true },
    ],
  },
];

export const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',   label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
];
