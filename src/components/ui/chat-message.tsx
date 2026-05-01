'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: 'user' | 'assistant' | 'system';
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ className, role = 'user', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex w-full gap-3 p-4',
        role === 'user' && 'justify-end',
        role === 'assistant' && 'justify-start',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          role === 'user' && 'bg-primary text-primary-foreground',
          role === 'assistant' && 'bg-muted'
        )}
      >
        {children}
      </div>
    </div>
  )
);
ChatMessage.displayName = 'ChatMessage';
