#!/usr/bin/env node

import { runCli } from './lib/cli.mjs';
import { emit } from './lib/events.mjs';

export { runCli };

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    emit({ type: 'session_failed', message: error.message, createdAt: new Date().toISOString() });
    process.exitCode = 1;
  });
}
