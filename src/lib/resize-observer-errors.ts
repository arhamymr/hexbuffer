const RESIZE_OBSERVER_LOOP_MESSAGES = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
];

function isResizeObserverLoopMessage(message: unknown): boolean {
  return (
    typeof message === 'string' &&
    RESIZE_OBSERVER_LOOP_MESSAGES.some((knownMessage) => message.includes(knownMessage))
  );
}

export function suppressResizeObserverLoopErrors(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener(
    'error',
    (event) => {
      if (!isResizeObserverLoopMessage(event.message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : '';

      if (!isResizeObserverLoopMessage(message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );
}
