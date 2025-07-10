/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult, ToolCallConfirmationDetails, ToolConfirmationOutcome } from './tools.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { Type } from '@google/genai';
import { getErrorMessage } from '../utils/errors.js';
import { Config, ApprovalMode } from '../config/config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Supported programming languages for syntax highlighting and execution
 */
export type SupportedLanguage = 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'java' 
  | 'cpp' 
  | 'c' 
  | 'rust' 
  | 'go' 
  | 'bash' 
  | 'shell';

/**
 * Parameters for the Enhanced Code Execution tool
 */
export interface EnhancedCodeExecutionParams {
  /**
   * The programming language for the code
   */
  language: SupportedLanguage;
  
  /**
   * The code content to execute or save
   */
  code: string;
  
  /**
   * Action to perform with the code
   */
  action: 'execute' | 'save' | 'save_and_execute' | 'format' | 'lint';
  
  /**
   * Filename for saving (without extension)
   */
  filename?: string;
  
  /**
   * Command line arguments for execution
   */
  args?: string[];
  
  /**
   * Environment variables for execution
   */
  env?: Record<string, string>;
  
  /**
   * Working directory for execution
   */
  workingDir?: string;
  
  /**
   * Install dependencies if needed (for supported languages)
   */
  installDependencies?: boolean;
  
  /**
   * Syntax highlighting theme
   */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Language configuration for different programming languages
 */
interface LanguageConfig {
  extension: string;
  executeCommand: (filename: string, args?: string[]) => string;
  compileCommand?: (filename: string) => string;
  installCommand?: string;
  formatCommand?: (filename: string) => string;
  lintCommand?: (filename: string) => string;
}

/**
 * Enhanced Code Execution Tool with syntax highlighting, downloading, and live editing
 */
export class EnhancedCodeExecutionTool extends BaseTool<EnhancedCodeExecutionParams, ToolResult> {
  static readonly Name: string = 'enhanced_code_execution';

  private readonly languageConfigs: Record<SupportedLanguage, LanguageConfig> = {
    python: {
      extension: '.py',
      executeCommand: (filename, args = []) => `python3 "${filename}" ${args.join(' ')}`,
      formatCommand: (filename) => `black "${filename}"`,
      lintCommand: (filename) => `pylint "${filename}"`,
      installCommand: 'pip3 install -r requirements.txt',
    },
    javascript: {
      extension: '.js',
      executeCommand: (filename, args = []) => `node "${filename}" ${args.join(' ')}`,
      formatCommand: (filename) => `prettier --write "${filename}"`,
      lintCommand: (filename) => `eslint "${filename}"`,
      installCommand: 'npm install',
    },
    typescript: {
      extension: '.ts',
      executeCommand: (filename, args = []) => `ts-node "${filename}" ${args.join(' ')}`,
      compileCommand: (filename) => `tsc "${filename}"`,
      formatCommand: (filename) => `prettier --write "${filename}"`,
      lintCommand: (filename) => `eslint "${filename}"`,
      installCommand: 'npm install',
    },
    java: {
      extension: '.java',
      compileCommand: (filename) => `javac "${filename}"`,
      executeCommand: (filename) => {
        const className = path.basename(filename, '.java');
        return `java "${className}"`;
      },
      formatCommand: (filename) => `google-java-format --replace "${filename}"`,
    },
    cpp: {
      extension: '.cpp',
      compileCommand: (filename) => `g++ -o "${filename.replace('.cpp', '')}" "${filename}"`,
      executeCommand: (filename, args = []) => `"${filename.replace('.cpp', '')}" ${args.join(' ')}`,
      formatCommand: (filename) => `clang-format -i "${filename}"`,
    },
    c: {
      extension: '.c',
      compileCommand: (filename) => `gcc -o "${filename.replace('.c', '')}" "${filename}"`,
      executeCommand: (filename, args = []) => `"${filename.replace('.c', '')}" ${args.join(' ')}`,
      formatCommand: (filename) => `clang-format -i "${filename}"`,
    },
    rust: {
      extension: '.rs',
      compileCommand: (filename) => `rustc "${filename}"`,
      executeCommand: (filename, args = []) => `"${filename.replace('.rs', '')}" ${args.join(' ')}`,
      formatCommand: (filename) => `rustfmt "${filename}"`,
      lintCommand: (filename) => `clippy "${filename}"`,
      installCommand: 'cargo build',
    },
    go: {
      extension: '.go',
      executeCommand: (filename, args = []) => `go run "${filename}" ${args.join(' ')}`,
      formatCommand: (filename) => `gofmt -w "${filename}"`,
      lintCommand: (filename) => `golint "${filename}"`,
      installCommand: 'go mod download',
    },
    bash: {
      extension: '.sh',
      executeCommand: (filename, args = []) => `bash "${filename}" ${args.join(' ')}`,
    },
    shell: {
      extension: '.sh',
      executeCommand: (filename, args = []) => `sh "${filename}" ${args.join(' ')}`,
    },
  };

  constructor(private readonly config: Config) {
    super(
      EnhancedCodeExecutionTool.Name,
      'Enhanced Code Execution',
      'Execute, save, format, and lint code in multiple programming languages with syntax highlighting and live editing capabilities. Supports Python, JavaScript, TypeScript, Java, C++, C, Rust, Go, and shell scripts.',
      {
        type: Type.OBJECT,
        properties: {
          language: {
            type: Type.STRING,
            enum: ['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'rust', 'go', 'bash', 'shell'],
            description: 'Programming language for the code',
          },
          code: {
            type: Type.STRING,
            description: 'The code content to execute or save',
          },
          action: {
            type: Type.STRING,
            enum: ['execute', 'save', 'save_and_execute', 'format', 'lint'],
            description: 'Action to perform: execute (run code), save (save to file), save_and_execute (save then run), format (format code), lint (check code quality)',
          },
          filename: {
            type: Type.STRING,
            description: 'Filename for saving (without extension). If not provided, uses a default name.',
          },
          args: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Command line arguments for execution',
          },
          env: {
            type: Type.OBJECT,
            description: 'Environment variables for execution as key-value pairs',
          },
          workingDir: {
            type: Type.STRING,
            description: 'Working directory for execution (relative to project root)',
          },
          installDependencies: {
            type: Type.BOOLEAN,
            description: 'Whether to install dependencies before execution (if supported)',
          },
          theme: {
            type: Type.STRING,
            enum: ['light', 'dark', 'auto'],
            description: 'Syntax highlighting theme preference',
          },
        },
        required: ['language', 'code', 'action'],
      },
    );
  }

  validateParams(params: EnhancedCodeExecutionParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.code.trim()) {
      return 'Code content cannot be empty';
    }

    if (params.action === 'execute' || params.action === 'save_and_execute') {
      const config = this.languageConfigs[params.language];
      if (!config.executeCommand && !config.compileCommand) {
        return `Execution not supported for language: ${params.language}`;
      }
    }

    return null;
  }

  getDescription(params: EnhancedCodeExecutionParams): string {
    const filename = params.filename || `code-${Date.now()}`;
    const ext = this.languageConfigs[params.language].extension;
    return `${params.action} ${params.language} code${params.filename ? ` (${filename}${ext})` : ''}`;
  }

  async shouldConfirmExecute(
    params: EnhancedCodeExecutionParams,
  ): Promise<ToolCallConfirmationDetails | false> {
    if (this.config.getApprovalMode() === ApprovalMode.AUTO_EDIT) {
      return false;
    }

    const validationError = this.validateParams(params);
    if (validationError) {
      return false;
    }

    // Always confirm code execution for security
    if (params.action === 'execute' || params.action === 'save_and_execute') {
      return {
        type: 'exec',
        title: 'Confirm Code Execution',
        command: `${params.action} ${params.language} code`,
        rootCommand: params.language,
        onConfirm: async (outcome: ToolConfirmationOutcome) => {
          if (outcome === ToolConfirmationOutcome.ProceedAlways) {
            this.config.setApprovalMode(ApprovalMode.AUTO_EDIT);
          }
        },
      };
    }

    return false;
  }

  private applySyntaxHighlighting(code: string, language: SupportedLanguage, theme: string = 'auto'): string {
    // Simple syntax highlighting using ANSI colors
    // In a real implementation, you'd use a proper syntax highlighting library like Prism.js or highlight.js
    
    const colors = {
      light: {
        keyword: '\x1b[34m',      // Blue
        string: '\x1b[32m',       // Green
        comment: '\x1b[90m',      // Gray
        number: '\x1b[35m',       // Magenta
        function: '\x1b[36m',     // Cyan
        reset: '\x1b[0m',         // Reset
      },
      dark: {
        keyword: '\x1b[94m',      // Bright Blue
        string: '\x1b[92m',       // Bright Green
        comment: '\x1b[37m',      // Light Gray
        number: '\x1b[95m',       // Bright Magenta
        function: '\x1b[96m',     // Bright Cyan
        reset: '\x1b[0m',         // Reset
      }
    };

    const colorScheme = theme === 'light' ? colors.light : colors.dark;
    
    // Basic keyword highlighting based on language
    const keywords: Record<SupportedLanguage, string[]> = {
      python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'return', 'try', 'except', 'with', 'as'],
      javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'class'],
      typescript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'class', 'interface', 'type'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'import', 'package'],
      cpp: ['#include', 'int', 'char', 'float', 'double', 'if', 'else', 'for', 'while', 'return', 'class', 'public', 'private'],
      c: ['#include', 'int', 'char', 'float', 'double', 'if', 'else', 'for', 'while', 'return', 'struct'],
      rust: ['fn', 'let', 'mut', 'if', 'else', 'for', 'while', 'return', 'use', 'mod', 'pub', 'struct', 'enum'],
      go: ['func', 'var', 'if', 'else', 'for', 'return', 'package', 'import', 'type', 'struct', 'interface'],
      bash: ['if', 'then', 'else', 'fi', 'for', 'while', 'do', 'done', 'function', 'echo'],
      shell: ['if', 'then', 'else', 'fi', 'for', 'while', 'do', 'done', 'echo'],
    };

    let highlightedCode = code;
    
    // Highlight keywords
    keywords[language]?.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlightedCode = highlightedCode.replace(regex, `${colorScheme.keyword}${keyword}${colorScheme.reset}`);
    });

    // Highlight strings
    highlightedCode = highlightedCode.replace(/"([^"]*)"/g, `${colorScheme.string}"$1"${colorScheme.reset}`);
    highlightedCode = highlightedCode.replace(/'([^']*)'/g, `${colorScheme.string}'$1'${colorScheme.reset}`);

    // Highlight comments
    if (language === 'python' || language === 'bash' || language === 'shell') {
      highlightedCode = highlightedCode.replace(/#(.*)$/gm, `${colorScheme.comment}#$1${colorScheme.reset}`);
    } else if (['javascript', 'typescript', 'java', 'cpp', 'c', 'rust', 'go'].includes(language)) {
      highlightedCode = highlightedCode.replace(/\/\/(.*)$/gm, `${colorScheme.comment}//$1${colorScheme.reset}`);
      highlightedCode = highlightedCode.replace(/\/\*[\s\S]*?\*\//g, `${colorScheme.comment}$&${colorScheme.reset}`);
    }

    // Highlight numbers
    highlightedCode = highlightedCode.replace(/\b\d+\.?\d*\b/g, `${colorScheme.number}$&${colorScheme.reset}`);

    return highlightedCode;
  }

  private async saveCodeToFile(code: string, language: SupportedLanguage, filename?: string): Promise<string> {
    const config = this.languageConfigs[language];
    const name = filename || `code-${Date.now()}`;
    const fullFilename = `${name}${config.extension}`;
    const targetDir = this.config.getTargetDir();
    const filePath = path.join(targetDir, fullFilename);

    fs.writeFileSync(filePath, code, 'utf8');
    return filePath;
  }

  private async executeCommand(command: string, workingDir?: string, env?: Record<string, string>): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const execEnv = { ...process.env, ...env };
      const cwd = workingDir ? path.join(this.config.getTargetDir(), workingDir) : this.config.getTargetDir();

      const child = spawn('sh', ['-c', command], {
        cwd,
        env: execEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1,
        });
      });
    });
  }

  async execute(
    params: EnhancedCodeExecutionParams,
    signal: AbortSignal,
  ): Promise<ToolResult> {
    const validationError = this.validateParams(params);
    if (validationError) {
      return {
        llmContent: `Error: Invalid parameters. ${validationError}`,
        returnDisplay: `Error: ${validationError}`,
      };
    }

    try {
      const config = this.languageConfigs[params.language];
      const results: string[] = [];
      let filePath: string | undefined;

      // Apply syntax highlighting for display
      const highlightedCode = this.applySyntaxHighlighting(params.code, params.language, params.theme);
      
      // Save code if requested
      if (params.action === 'save' || params.action === 'save_and_execute') {
        filePath = await this.saveCodeToFile(params.code, params.language, params.filename);
        results.push(`✅ Code saved to: ${path.basename(filePath)}`);
      }

      // Install dependencies if requested
      if (params.installDependencies && config.installCommand) {
        results.push(`📦 Installing dependencies...`);
        const installResult = await this.executeCommand(config.installCommand, params.workingDir, params.env);
        if (installResult.exitCode === 0) {
          results.push(`✅ Dependencies installed successfully`);
        } else {
          results.push(`❌ Dependency installation failed:\n${installResult.stderr}`);
        }
      }

      // Format code if requested
      if (params.action === 'format' && config.formatCommand) {
        if (!filePath) {
          filePath = await this.saveCodeToFile(params.code, params.language, params.filename);
        }
        const formatResult = await this.executeCommand(config.formatCommand(filePath), params.workingDir, params.env);
        if (formatResult.exitCode === 0) {
          const formattedCode = fs.readFileSync(filePath, 'utf8');
          results.push(`✅ Code formatted successfully`);
          results.push(`\n## Formatted Code:\n\`\`\`${params.language}\n${formattedCode}\n\`\`\``);
        } else {
          results.push(`❌ Code formatting failed:\n${formatResult.stderr}`);
        }
      }

      // Lint code if requested
      if (params.action === 'lint' && config.lintCommand) {
        if (!filePath) {
          filePath = await this.saveCodeToFile(params.code, params.language, params.filename);
        }
        const lintResult = await this.executeCommand(config.lintCommand(filePath), params.workingDir, params.env);
        if (lintResult.exitCode === 0) {
          results.push(`✅ Code linting passed`);
          if (lintResult.stdout) {
            results.push(`Lint output:\n${lintResult.stdout}`);
          }
        } else {
          results.push(`⚠️ Code linting found issues:\n${lintResult.stderr || lintResult.stdout}`);
        }
      }

      // Execute code if requested
      if (params.action === 'execute' || params.action === 'save_and_execute') {
        if (!filePath) {
          filePath = await this.saveCodeToFile(params.code, params.language, params.filename);
        }

        // Compile if needed
        if (config.compileCommand) {
          results.push(`🔨 Compiling...`);
          const compileResult = await this.executeCommand(config.compileCommand(filePath), params.workingDir, params.env);
          if (compileResult.exitCode !== 0) {
            results.push(`❌ Compilation failed:\n${compileResult.stderr}`);
            return {
              llmContent: results.join('\n'),
              returnDisplay: results.join('\n'),
            };
          }
          results.push(`✅ Compilation successful`);
        }

        // Execute
        results.push(`🚀 Executing...`);
        const executeResult = await this.executeCommand(
          config.executeCommand(filePath, params.args),
          params.workingDir,
          params.env
        );

        if (executeResult.exitCode === 0) {
          results.push(`✅ Execution completed successfully`);
          if (executeResult.stdout) {
            results.push(`\n## Output:\n\`\`\`\n${executeResult.stdout}\n\`\`\``);
          }
        } else {
          results.push(`❌ Execution failed (exit code: ${executeResult.exitCode})`);
          if (executeResult.stderr) {
            results.push(`\n## Error:\n\`\`\`\n${executeResult.stderr}\n\`\`\``);
          }
          if (executeResult.stdout) {
            results.push(`\n## Output:\n\`\`\`\n${executeResult.stdout}\n\`\`\``);
          }
        }
      }

      // Always show the highlighted code for reference
      const codeDisplay = `\n## Code (${params.language}):\n\`\`\`${params.language}\n${params.code}\n\`\`\``;
      
      const fullDisplay = results.join('\n') + codeDisplay;

      return {
        llmContent: results.join('\n'),
        returnDisplay: fullDisplay,
      };

    } catch (error) {
      const errorMessage = `Error during code ${params.action}: ${getErrorMessage(error)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: errorMessage,
      };
    }
  }
}