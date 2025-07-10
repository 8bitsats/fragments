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

/**
 * Parameters for the Thinking Function Caller
 */
export interface ThinkingFunctionCallerParams {
  /**
   * The task or question that needs to be solved
   */
  task: string;
  
  /**
   * Available tools/functions to consider
   */
  availableTools?: string[];
  
  /**
   * Thinking budget for reasoning (0 to disable, -1 for dynamic)
   */
  thinkingBudget?: number;
  
  /**
   * Whether to include thought summaries in output
   */
  includeThoughts?: boolean;
  
  /**
   * Context or constraints for the task
   */
  context?: string;
  
  /**
   * Expected output format
   */
  outputFormat?: 'text' | 'json' | 'structured';
  
  /**
   * Maximum number of function calls to allow
   */
  maxFunctionCalls?: number;
}

/**
 * Enhanced Function Calling Tool with Thinking Capabilities
 * This tool helps the model reason about which tools to use and in what order
 */
export class ThinkingFunctionCallerTool extends BaseTool<ThinkingFunctionCallerParams, ToolResult> {
  static readonly Name: string = 'thinking_function_caller';

  constructor(private readonly config: Config) {
    super(
      ThinkingFunctionCallerTool.Name,
      'Thinking Function Caller',
      'Enhances function calling with thinking capabilities. The model reasons through complex tasks step-by-step, determining which tools to use and in what sequence to achieve the desired outcome.',
      {
        type: Type.OBJECT,
        properties: {
          task: {
            type: Type.STRING,
            description: 'The task or question that needs to be solved using available tools',
          },
          availableTools: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of available tool names to consider for this task',
          },
          thinkingBudget: {
            type: Type.NUMBER,
            description: 'Thinking budget for reasoning (0 to disable thinking, -1 for dynamic thinking, or positive number for fixed budget)',
            minimum: -1,
            maximum: 32768,
          },
          includeThoughts: {
            type: Type.BOOLEAN,
            description: 'Whether to include thought summaries in the output to show reasoning process',
          },
          context: {
            type: Type.STRING,
            description: 'Additional context or constraints for the task',
          },
          outputFormat: {
            type: Type.STRING,
            enum: ['text', 'json', 'structured'],
            description: 'Expected output format for the result',
          },
          maxFunctionCalls: {
            type: Type.NUMBER,
            description: 'Maximum number of function calls to allow (default: 10)',
            minimum: 1,
            maximum: 50,
          },
        },
        required: ['task'],
      },
    );
  }

  validateParams(params: ThinkingFunctionCallerParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.task.trim()) {
      return 'Task cannot be empty';
    }

    if (params.thinkingBudget !== undefined && params.thinkingBudget < -1) {
      return 'Thinking budget must be -1 (dynamic), 0 (disabled), or a positive number';
    }

    if (params.maxFunctionCalls !== undefined && params.maxFunctionCalls < 1) {
      return 'maxFunctionCalls must be at least 1';
    }

    return null;
  }

  getDescription(params: ThinkingFunctionCallerParams): string {
    const toolsDesc = params.availableTools ? ` using tools: ${params.availableTools.join(', ')}` : '';
    const thinkingDesc = params.thinkingBudget ? ` (thinking budget: ${params.thinkingBudget})` : '';
    return `Solving task: "${params.task.substring(0, 100)}${params.task.length > 100 ? '...' : ''}"${toolsDesc}${thinkingDesc}`;
  }

  async shouldConfirmExecute(
    params: ThinkingFunctionCallerParams,
  ): Promise<ToolCallConfirmationDetails | false> {
    if (this.config.getApprovalMode() === ApprovalMode.AUTO_EDIT) {
      return false;
    }

    const validationError = this.validateParams(params);
    if (validationError) {
      return false;
    }

    return {
      type: 'info',
      title: 'Confirm Enhanced Function Calling',
      prompt: `Execute task with thinking: "${params.task}"${params.availableTools ? `\nAvailable tools: ${params.availableTools.join(', ')}` : ''}`,
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          this.config.setApprovalMode(ApprovalMode.AUTO_EDIT);
        }
      },
    };
  }

  private async executeWithThinking(
    params: ThinkingFunctionCallerParams,
    signal: AbortSignal,
  ): Promise<ToolResult> {
    try {
      const geminiClient = this.config.getGeminiClient();
      
      // Get available tools from the registry
      const toolRegistry = await this.config.getToolRegistry();
      const allTools = toolRegistry.getAllTools();
      const availableToolNames = params.availableTools || allTools.map(tool => tool.name);
      
      // Filter tools based on available tools list
      const relevantTools = allTools.filter(tool => availableToolNames.includes(tool.name));
      const functionDeclarations = relevantTools.map(tool => tool.schema);

      // Create the enhanced prompt for thinking
      const enhancedPrompt = this.createEnhancedPrompt(params, availableToolNames);

      // Configure thinking
      const thinkingConfig: any = {};
      if (params.thinkingBudget !== undefined) {
        thinkingConfig.thinkingBudget = params.thinkingBudget;
      }
      if (params.includeThoughts) {
        thinkingConfig.includeThoughts = true;
      }

      // Execute with function calling and thinking
      const response = await geminiClient.generateContent(
        [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
        {
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
          thinkingConfig: Object.keys(thinkingConfig).length > 0 ? thinkingConfig : undefined,
        },
        signal,
      );

      // Process the response
      return this.processThinkingResponse(response, params);

    } catch (error) {
      const errorMessage = `Error in thinking function caller: ${getErrorMessage(error)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: errorMessage,
      };
    }
  }

  private createEnhancedPrompt(params: ThinkingFunctionCallerParams, availableTools: string[]): string {
    let prompt = `You are an advanced AI assistant with thinking capabilities and access to various tools. Your task is to solve the following problem step by step.

**Task:** ${params.task}

**Available Tools:** ${availableTools.join(', ')}

**Instructions:**
1. Think through the problem carefully and break it down into steps
2. Determine which tools (if any) would be helpful for each step
3. Consider the order in which tools should be used
4. Use your thinking process to reason about the best approach
5. Execute the necessary function calls in the optimal sequence
6. Provide a clear, comprehensive response

`;

    if (params.context) {
      prompt += `**Context/Constraints:** ${params.context}\n\n`;
    }

    if (params.outputFormat) {
      prompt += `**Output Format:** Please provide the response in ${params.outputFormat} format.\n\n`;
    }

    if (params.maxFunctionCalls) {
      prompt += `**Function Call Limit:** Use at most ${params.maxFunctionCalls} function calls.\n\n`;
    }

    prompt += `Begin by thinking through the problem, then proceed with your solution:`;

    return prompt;
  }

  private processThinkingResponse(response: any, params: ThinkingFunctionCallerParams): ToolResult {
    let textResponse = '';
    let thoughtSummary = '';
    const functionCalls: any[] = [];

    // Extract content from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.text) {
        if (part.thought) {
          thoughtSummary += part.text + '\n';
        } else {
          textResponse += part.text + '\n';
        }
      } else if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }

    // Build the display message
    let displayMessage = '';
    
    if (thoughtSummary && params.includeThoughts) {
      displayMessage += `## Thinking Process:\n${thoughtSummary}\n\n`;
    }

    if (functionCalls.length > 0) {
      displayMessage += `## Function Calls Made:\n`;
      functionCalls.forEach((call, index) => {
        displayMessage += `${index + 1}. **${call.name}**(${JSON.stringify(call.args, null, 2)})\n`;
      });
      displayMessage += '\n';
    }

    if (textResponse) {
      displayMessage += `## Response:\n${textResponse}`;
    }

    // Get usage metadata if available
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      displayMessage += `\n\n## Usage Statistics:\n`;
      displayMessage += `- Input tokens: ${usageMetadata.promptTokenCount || 0}\n`;
      displayMessage += `- Output tokens: ${usageMetadata.candidatesTokenCount || 0}\n`;
      if (usageMetadata.thoughtsTokenCount) {
        displayMessage += `- Thinking tokens: ${usageMetadata.thoughtsTokenCount}\n`;
      }
      displayMessage += `- Total tokens: ${usageMetadata.totalTokenCount || 0}`;
    }

    const llmContent = thoughtSummary + textResponse + (functionCalls.length > 0 ? `\nFunction calls: ${functionCalls.map(c => c.name).join(', ')}` : '');

    return {
      llmContent,
      returnDisplay: displayMessage.trim(),
    };
  }

  async execute(
    params: ThinkingFunctionCallerParams,
    signal: AbortSignal,
  ): Promise<ToolResult> {
    const validationError = this.validateParams(params);
    if (validationError) {
      return {
        llmContent: `Error: Invalid parameters. ${validationError}`,
        returnDisplay: `Error: ${validationError}`,
      };
    }

    return this.executeWithThinking(params, signal);
  }
}

/**
 * Utility function to create thinking function calls with better reasoning
 */
export function createThinkingFunctionCall(
  task: string,
  options: {
    availableTools?: string[];
    thinkingBudget?: number;
    includeThoughts?: boolean;
    context?: string;
    outputFormat?: 'text' | 'json' | 'structured';
    maxFunctionCalls?: number;
  } = {}
): ThinkingFunctionCallerParams {
  return {
    task,
    availableTools: options.availableTools,
    thinkingBudget: options.thinkingBudget ?? -1, // Dynamic thinking by default
    includeThoughts: options.includeThoughts ?? true,
    context: options.context,
    outputFormat: options.outputFormat ?? 'text',
    maxFunctionCalls: options.maxFunctionCalls ?? 10,
  };
}

/**
 * Enhanced prompt template for complex reasoning tasks
 */
export function createReasoningPrompt(
  task: string,
  context?: string,
  constraints?: string[]
): string {
  let prompt = `Please solve this task using step-by-step reasoning and available tools:

**Task:** ${task}

`;

  if (context) {
    prompt += `**Context:** ${context}\n\n`;
  }

  if (constraints && constraints.length > 0) {
    prompt += `**Constraints:**\n${constraints.map(c => `- ${c}`).join('\n')}\n\n`;
  }

  prompt += `**Approach:**
1. Break down the task into smaller, manageable steps
2. Identify which tools or functions would be most helpful
3. Plan the sequence of operations
4. Execute the plan systematically
5. Verify and validate the results

Please think through this carefully and provide a comprehensive solution.`;

  return prompt;
}