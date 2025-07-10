/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult } from './tools.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { Type, Schema } from '@google/genai';
import { getErrorMessage } from '../utils/errors.js';
import { Config } from '../config/config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Supported output formats
 */
export type StructuredOutputFormat = 'json' | 'csv' | 'yaml' | 'xml' | 'markdown' | 'html';

/**
 * Parameters for the Structured Output tool
 */
export interface StructuredOutputParams {
  /**
   * The task or prompt to generate structured output for
   */
  prompt: string;
  
  /**
   * Output format to generate
   */
  format: StructuredOutputFormat;
  
  /**
   * JSON schema for the output structure (required for JSON format)
   */
  schema?: Schema;
  
  /**
   * Enum values for enum-type outputs
   */
  enumValues?: string[];
  
  /**
   * Example of the desired output structure
   */
  example?: string;
  
  /**
   * Whether to save the output to a file
   */
  saveToFile?: boolean;
  
  /**
   * Filename for saving (without extension)
   */
  filename?: string;
  
  /**
   * Additional formatting options
   */
  formatOptions?: {
    indent?: number;
    includeHeaders?: boolean;
    delimiter?: string;
    prettyPrint?: boolean;
  };
}

/**
 * Predefined schemas for common data structures
 */
export const CommonSchemas = {
  person: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      age: { type: Type.NUMBER },
      email: { type: Type.STRING },
      address: {
        type: Type.OBJECT,
        properties: {
          street: { type: Type.STRING },
          city: { type: Type.STRING },
          country: { type: Type.STRING },
        },
      },
    },
    required: ['name', 'email'],
  } as Schema,

  product: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      name: { type: Type.STRING },
      price: { type: Type.NUMBER },
      category: { type: Type.STRING },
      inStock: { type: Type.BOOLEAN },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ['id', 'name', 'price'],
  } as Schema,

  article: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      author: { type: Type.STRING },
      content: { type: Type.STRING },
      publishDate: { type: Type.STRING },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      metadata: {
        type: Type.OBJECT,
        properties: {
          wordCount: { type: Type.NUMBER },
          readingTime: { type: Type.NUMBER },
        },
      },
    },
    required: ['title', 'content'],
  } as Schema,

  task: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      status: {
        type: Type.STRING,
        enum: ['todo', 'in_progress', 'completed', 'cancelled'],
      },
      priority: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high'],
      },
      assignee: { type: Type.STRING },
      dueDate: { type: Type.STRING },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ['id', 'title', 'status'],
  } as Schema,
};

/**
 * Structured Output Tool for generating various output formats
 */
export class StructuredOutputTool extends BaseTool<StructuredOutputParams, ToolResult> {
  static readonly Name: string = 'structured_output';

  constructor(private readonly config: Config) {
    super(
      StructuredOutputTool.Name,
      'Structured Output Generator',
      'Generate structured output in various formats (JSON, CSV, YAML, XML, Markdown, HTML) with optional schema validation. Perfect for data extraction, standardization, and integration tasks.',
      {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: 'The task or prompt to generate structured output for',
          },
          format: {
            type: Type.STRING,
            enum: ['json', 'csv', 'yaml', 'xml', 'markdown', 'html'],
            description: 'Output format to generate',
          },
          schema: {
            type: Type.OBJECT,
            description: 'JSON schema for the output structure (required for JSON format)',
          },
          enumValues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Enum values for enum-type outputs',
          },
          example: {
            type: Type.STRING,
            description: 'Example of the desired output structure',
          },
          saveToFile: {
            type: Type.BOOLEAN,
            description: 'Whether to save the output to a file',
          },
          filename: {
            type: Type.STRING,
            description: 'Filename for saving (without extension)',
          },
          formatOptions: {
            type: Type.OBJECT,
            description: 'Additional formatting options',
            properties: {
              indent: { type: Type.NUMBER },
              includeHeaders: { type: Type.BOOLEAN },
              delimiter: { type: Type.STRING },
              prettyPrint: { type: Type.BOOLEAN },
            },
          },
        },
        required: ['prompt', 'format'],
      },
    );
  }

  validateParams(params: StructuredOutputParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.prompt.trim()) {
      return 'Prompt cannot be empty';
    }

    if (params.format === 'json' && !params.schema && !params.enumValues) {
      return 'JSON format requires either a schema or enumValues';
    }

    return null;
  }

  getDescription(params: StructuredOutputParams): string {
    const fileDesc = params.saveToFile ? ` (save to ${params.filename || 'output'}.${params.format})` : '';
    return `Generate ${params.format.toUpperCase()} output for: "${params.prompt.substring(0, 100)}${params.prompt.length > 100 ? '...' : ''}"${fileDesc}`;
  }

  private async generateStructuredOutput(
    params: StructuredOutputParams,
    signal: AbortSignal,
  ): Promise<{ content: string; formattedContent: string }> {
    const geminiClient = this.config.getGeminiClient();
    
    // Prepare the enhanced prompt
    const enhancedPrompt = this.createStructuredPrompt(params);
    
    // Configure generation based on format
    const config: any = {};
    
    if (params.format === 'json') {
      config.responseMimeType = 'application/json';
      
      if (params.schema) {
        config.responseSchema = params.schema;
      } else if (params.enumValues) {
        config.responseSchema = {
          type: Type.STRING,
          enum: params.enumValues,
        };
      }
    }

    // Generate content
    const response = await geminiClient.generateContent(
      [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
      { config },
      signal,
    );

    const rawContent = response.text || '';
    
    // Format the content based on the requested format
    const formattedContent = await this.formatOutput(rawContent, params);
    
    return {
      content: rawContent,
      formattedContent,
    };
  }

  private createStructuredPrompt(params: StructuredOutputParams): string {
    let prompt = `Generate structured output in ${params.format.toUpperCase()} format for the following task:

${params.prompt}

`;

    // Add format-specific instructions
    switch (params.format) {
      case 'json':
        prompt += `Requirements:
- Output valid JSON
- Follow the provided schema structure
- Ensure all required fields are included
- Use appropriate data types
`;
        if (params.schema) {
          prompt += `\nSchema: ${JSON.stringify(params.schema, null, 2)}`;
        }
        if (params.enumValues) {
          prompt += `\nAllowed values: ${params.enumValues.join(', ')}`;
        }
        break;

      case 'csv':
        prompt += `Requirements:
- Output valid CSV format
- Include headers in the first row
- Use comma as delimiter (unless specified otherwise)
- Escape special characters properly
`;
        break;

      case 'yaml':
        prompt += `Requirements:
- Output valid YAML format
- Use proper indentation
- Include appropriate data types
- Follow YAML syntax rules
`;
        break;

      case 'xml':
        prompt += `Requirements:
- Output valid XML format
- Use proper tag structure
- Include appropriate attributes
- Ensure well-formed XML
`;
        break;

      case 'markdown':
        prompt += `Requirements:
- Output valid Markdown format
- Use appropriate headers, lists, and formatting
- Include tables if tabular data is involved
- Follow Markdown syntax
`;
        break;

      case 'html':
        prompt += `Requirements:
- Output valid HTML format
- Use semantic HTML elements
- Include proper structure and hierarchy
- Ensure well-formed HTML
`;
        break;
    }

    if (params.example) {
      prompt += `\n\nExample format:\n${params.example}`;
    }

    if (params.formatOptions) {
      prompt += `\n\nFormatting options: ${JSON.stringify(params.formatOptions)}`;
    }

    return prompt;
  }

  private async formatOutput(content: string, params: StructuredOutputParams): Promise<string> {
    const options = params.formatOptions || {};
    
    switch (params.format) {
      case 'json':
        try {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, options.indent || 2);
        } catch {
          return content; // Return as-is if not valid JSON
        }

      case 'csv':
        // Basic CSV formatting
        if (options.delimiter && options.delimiter !== ',') {
          return content.replace(/,/g, options.delimiter);
        }
        return content;

      case 'yaml':
      case 'xml':
      case 'markdown':
      case 'html':
        // For these formats, we trust the model's output
        return content;

      default:
        return content;
    }
  }

  private getFileExtension(format: StructuredOutputFormat): string {
    const extensions = {
      json: 'json',
      csv: 'csv',
      yaml: 'yaml',
      xml: 'xml',
      markdown: 'md',
      html: 'html',
    };
    return extensions[format];
  }

  async execute(
    params: StructuredOutputParams,
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
      const { content, formattedContent } = await this.generateStructuredOutput(params, signal);
      
      let savedFile: string | undefined;
      
      // Save to file if requested
      if (params.saveToFile) {
        const filename = params.filename || `output-${Date.now()}`;
        const extension = this.getFileExtension(params.format);
        const fullFilename = `${filename}.${extension}`;
        const targetDir = this.config.getTargetDir();
        const filePath = path.join(targetDir, fullFilename);
        
        fs.writeFileSync(filePath, formattedContent, 'utf8');
        savedFile = fullFilename;
      }

      // Build display message
      let displayMessage = `## ${params.format.toUpperCase()} Output Generated\n\n`;
      
      if (savedFile) {
        displayMessage += `✅ **Saved to file:** ${savedFile}\n\n`;
      }

      displayMessage += `\`\`\`${params.format}\n${formattedContent}\n\`\`\``;

      // Add statistics
      const lines = formattedContent.split('\n').length;
      const chars = formattedContent.length;
      displayMessage += `\n\n**Statistics:**\n- Lines: ${lines}\n- Characters: ${chars}`;

      if (params.format === 'json') {
        try {
          const parsed = JSON.parse(formattedContent);
          const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0;
          displayMessage += `\n- JSON Objects/Keys: ${keys}`;
        } catch {
          // Ignore parsing errors for display
        }
      }

      return {
        llmContent: formattedContent,
        returnDisplay: displayMessage,
      };

    } catch (error) {
      const errorMessage = `Error generating structured output: ${getErrorMessage(error)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: errorMessage,
      };
    }
  }
}

/**
 * Utility functions for working with structured output
 */
export class StructuredOutputUtils {
  /**
   * Validate JSON against a schema
   */
  static validateJson(json: string, schema: Schema): { valid: boolean; errors?: string[] } {
    try {
      const parsed = JSON.parse(json);
      // Basic validation logic here
      // In a real implementation, you'd use a proper JSON schema validator like ajv
      return { valid: true };
    } catch (error) {
      return { valid: false, errors: [getErrorMessage(error)] };
    }
  }

  /**
   * Convert between formats
   */
  static async convertFormat(
    content: string,
    fromFormat: StructuredOutputFormat,
    toFormat: StructuredOutputFormat,
  ): Promise<string> {
    // Basic conversion logic
    // In a real implementation, you'd have proper format converters
    if (fromFormat === toFormat) {
      return content;
    }

    if (fromFormat === 'json' && toFormat === 'csv') {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const headers = Object.keys(parsed[0]);
          const csvRows = [headers.join(',')];
          for (const item of parsed) {
            const row = headers.map(header => `"${item[header] || ''}"`).join(',');
            csvRows.push(row);
          }
          return csvRows.join('\n');
        }
      } catch {
        // Fall through to return original content
      }
    }

    return content;
  }

  /**
   * Extract schema from example data
   */
  static extractSchema(example: any): Schema {
    if (typeof example === 'string') {
      return { type: Type.STRING };
    }
    if (typeof example === 'number') {
      return { type: Type.NUMBER };
    }
    if (typeof example === 'boolean') {
      return { type: Type.BOOLEAN };
    }
    if (Array.isArray(example)) {
      return {
        type: Type.ARRAY,
        items: example.length > 0 ? this.extractSchema(example[0]) : { type: Type.STRING },
      };
    }
    if (typeof example === 'object' && example !== null) {
      const properties: Record<string, Schema> = {};
      for (const [key, value] of Object.entries(example)) {
        properties[key] = this.extractSchema(value);
      }
      return {
        type: Type.OBJECT,
        properties,
        required: Object.keys(properties),
      };
    }
    
    return { type: Type.STRING };
  }
}