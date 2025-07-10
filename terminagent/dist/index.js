#!/usr/bin/env node
import chalk from 'chalk';
import dotenv from 'dotenv';
import { TerminAgent } from './terminagent.js';
// Load environment variables
dotenv.config();
async function main() {
    console.log(chalk.cyan('🚀 Starting TerminAgent...'));
    const config = {
        apiKey: process.env.GOOGLE_API_KEY || '',
        openaiApiKey: process.env.OPENAI_API_KEY,
        model: 'gemini-2.0-flash-exp',
        enableVoice: true,
        enableSearch: true,
        enableComputerUse: true,
        enableSolanaTrading: true,
        workingDirectory: process.cwd(),
        port: parseInt(process.env.PORT || '3001')
    };
    if (!config.apiKey) {
        console.error(chalk.red('❌ GOOGLE_API_KEY environment variable is required'));
        process.exit(1);
    }
    try {
        const agent = new TerminAgent(config);
        await agent.initialize();
        await agent.start();
    }
    catch (error) {
        console.error(chalk.red('❌ Failed to start TerminAgent:'), error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down TerminAgent...'));
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Shutting down TerminAgent...'));
    process.exit(0);
});
main().catch((error) => {
    console.error(chalk.red('❌ Unhandled error:'), error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map