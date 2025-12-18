#!/usr/bin/env bun

import { parseArgs, validateArgs } from './args';
import { Processor } from '../core/processor';
import { Logger } from './output';

/**
 * Main CLI entry point
 * @returns Exit code (0 for success, 1 for failure)
 */
async function main(): Promise<number> {
  const logger = new Logger();

  try {
    // Parse command-line arguments
    const options = parseArgs(process.argv.slice(2));

    // Validate arguments
    validateArgs(options);

    // Create and run processor
    const processor = new Processor(options, logger);
    const stats = await processor.run();

    // Return exit code based on failures
    return stats.failed > 0 ? 1 : 0;

  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    return 1;
  }
}

// Execute and exit with appropriate code
process.exit(await main());
