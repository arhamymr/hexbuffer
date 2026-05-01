'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface ChatMessageAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ChatMessageArea = React.forwardRef<HTMLDivElement, ChatMessageAreaProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-2 overflow-y-auto p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ChatMessageArea.displayName = 'ChatMessageArea';
