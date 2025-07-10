#!/usr/bin/env node

import chalk from 'chalk'
import { config } from 'dotenv'

import { TerminAgent } from './terminagent.js'

// Load environment variables
config();

async function main() {
  console.log(chalk.cyan.bold('🤖 TerminAgent Starting Up...'));
  console.log(chalk.gray('A vibe coding agent powered by Gemini Live API\n'));

  if (!process.env.GOOGLE_API_KEY) {
    console.error(chalk.red('❌ Error: GOOGLE_API_KEY environment variable is required'));
    console.log(chalk.yellow('💡 Set your API key: export GOOGLE_API_KEY="your-key-here"'));
    process.exit(1);
  }

  try {
    const agent = new TerminAgent({
      apiKey: process.env.GOOGLE_API_KEY,
      model: 'gemini-2.0-flash-exp',
      enableVoice: process.env.ENABLE_VOICE === 'true',
      enableSearch: process.env.ENABLE_SEARCH !== 'false',
      workingDirectory: process.cwd()
    });

    await agent.initialize();
    await agent.start();
  } catch (error) {
    console.error(chalk.red('❌ Failed to start TerminAgent:'), error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 TerminAgent shutting down gracefully...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n👋 TerminAgent shutting down gracefully...'));
  process.exit(0);
});

main().catch((error) => {
  console.error(chalk.red('❌ Unhandled error:'), error);
  process.exit(1);
});
