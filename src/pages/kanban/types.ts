export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type GroupBy = 'status' | 'assignee' | 'priority';

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  assigneeColor?: string;
  dueDate?: string;
  priority: Priority;
  tags?: string[];
  subtasks: SubTask[];
  columnId: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  wipLimit?: number;
  color: string;
}
