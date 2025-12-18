#!/usr/bin/env node

/**
 * Wrapper script that calls the new Bun-based CLI
 * This maintains backward compatibility with the old interface
 */

const { spawnSync } = require('child_process');
const path = require('path');

// Forward all arguments to the Bun CLI
const cliPath = path.join(__dirname, 'src', 'cli', 'index.ts');
const result = spawnSync('bun', [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname
});

process.exit(result.status || 0);
