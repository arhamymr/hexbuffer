import { randomUUID } from 'node:crypto';

export function emit(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function log(sessionId, level, type, message, url) {
  emit({
    type: 'log_created',
    id: randomUUID(),
    sessionId,
    level,
    logType: type,
    message,
    url,
    createdAt: new Date().toISOString(),
  });
}
