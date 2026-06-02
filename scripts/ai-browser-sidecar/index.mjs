#!/usr/bin/env node

import { runCli } from '../ai-engine/index.mjs';

runCli().catch((error) => {
  process.stdout.write(`${JSON.stringify({
    type: 'session_failed',
    message: error.message,
    createdAt: new Date().toISOString(),
  })}\n`);
  process.exitCode = 1;
});
