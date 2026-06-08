"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  Loader2Icon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type TaskStatus = "pending" | "in_progress" | "completed" | "error";

const statusIcons: Record<TaskStatus, ReactNode> = {
  pending: <CircleIcon className="size-3.5 text-muted-foreground" />,
  in_progress: <Loader2Icon className="size-3.5 animate-spin text-blue-500" />,
  completed: <CheckCircleIcon className="size-3.5 text-green-500" />,
  error: <XCircleIcon className="size-3.5 text-red-500" />,
};

export type TaskItemFileProps = ComponentProps<"div">;

export const TaskItemFile = ({
  children,
  className,
  ...props
}: TaskItemFileProps) => (
  <div
    className={cn(
      "inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-foreground text-xs",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type TaskItemProps = ComponentProps<"div"> & {
  status?: TaskStatus;
};

export const TaskItem = ({
  children,
  className,
  status = "pending",
  ...props
}: TaskItemProps) => (
  <div
    className={cn(
      "flex items-start gap-2 text-muted-foreground text-sm",
      status === "completed" && "text-foreground",
      className
    )}
    {...props}
  >
    <span className="mt-0.5 shrink-0">{statusIcons[status]}</span>
    <span className="flex-1">{children}</span>
  </div>
);

export type TaskProps = ComponentProps<typeof Collapsible> & {
  status?: TaskStatus;
  completed?: number;
  total?: number;
};

export const Task = ({
  defaultOpen = true,
  className,
  status: _status,
  completed: _completed,
  total: _total,
  ...props
}: TaskProps) => (
  <Collapsible className={cn("group", className)} defaultOpen={defaultOpen} {...props} />
);

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: string;
  status?: TaskStatus;
  completed?: number;
  total?: number;
};

export const TaskTrigger = ({
  children,
  className,
  title,
  status = "pending",
  completed = 0,
  total = 0,
  ...props
}: TaskTriggerProps) => (
  <CollapsibleTrigger asChild className={cn("group", className)} {...props}>
    {children ?? (
      <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
        {statusIcons[status]}
        <p className="flex-1 text-sm">{title}</p>
        {total > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground/60">
            {completed}/{total}
          </span>
        ) : null}
        <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </div>
    )}
  </CollapsibleTrigger>
);

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  >
    <div className="mt-4 space-y-2 border-muted border-l-2 pl-4">
      {children}
    </div>
  </CollapsibleContent>
);
