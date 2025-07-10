/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult, ToolCallConfirmationDetails, ToolConfirmationOutcome } from './tools.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { Type, Modality } from '@google/genai';
import { getErrorMessage } from '../utils/errors.js';
import { Config, ApprovalMode } from '../config/config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Parameters for the Gemini Image Generation tool
 */
export interface GeminiImageGenerationParams {
  /**
   * The text prompt describing the image to generate
   */
  prompt: string;
  
  /**
   * Optional input image for editing (base64 encoded)
   */
  inputImage?: string;
  
  /**
   * MIME type of input image (required if inputImage is provided)
   */
  inputImageMimeType?: string;
  
  /**
   * Output filename (without extension, will be saved as PNG)
   */
  filename?: string;
}

/**
 * Parameters for the Imagen Generation tool
 */
export interface ImagenGenerationParams {
  /**
   * The text prompt describing the image to generate
   */
  prompt: string;
  
  /**
   * Number of images to generate (1-4, default 4)
   */
  numberOfImages?: number;
  
  /**
   * Aspect ratio for the generated images
   */
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  
  /**
   * Person generation policy
   */
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all';
  
  /**
   * Base filename for output (without extension, will be saved as PNG)
   */
  filename?: string;
}

/**
 * Tool implementation for Gemini-based image generation
 */
export class GeminiImageGenerationTool extends BaseTool<GeminiImageGenerationParams, ToolResult> {
  static readonly Name: string = 'gemini_image_generation';

  constructor(private readonly config: Config) {
    super(
      GeminiImageGenerationTool.Name,
      'Gemini Image Generation',
      'Generate or edit images using Gemini 2.0 Flash Preview Image Generation model. Supports both text-to-image and image-to-image (editing) capabilities. Generated images include SynthID watermarks.',
      {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: 'Text prompt describing the image to generate or edit. Be descriptive and specific.',
          },
          inputImage: {
            type: Type.STRING,
            description: 'Optional. Base64 encoded input image for editing tasks. Used for image-to-image generation.',
          },
          inputImageMimeType: {
            type: Type.STRING,
            enum: ['image/png', 'image/jpeg', 'image/webp'],
            description: 'Required if inputImage is provided. MIME type of the input image.',
          },
          filename: {
            type: Type.STRING,
            description: 'Optional. Output filename without extension (will be saved as PNG). Defaults to "gemini-generated-image".',
          },
        },
        required: ['prompt'],
      },
    );
  }

  validateParams(params: GeminiImageGenerationParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (params.inputImage && !params.inputImageMimeType) {
      return 'inputImageMimeType is required when inputImage is provided';
    }

    if (!params.inputImage && params.inputImageMimeType) {
      return 'inputImageMimeType should only be provided when inputImage is included';
    }

    return null;
  }

  getDescription(params: GeminiImageGenerationParams): string {
    const mode = params.inputImage ? 'editing' : 'generating';
    const filename = params.filename || 'gemini-generated-image';
    return `${mode} image with prompt: "${params.prompt.substring(0, 100)}${params.prompt.length > 100 ? '...' : ''}" (Output: ${filename}.png)`;
  }

  async shouldConfirmExecute(
    params: GeminiImageGenerationParams,
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
      title: 'Confirm Image Generation',
      prompt: `Generate image with prompt: "${params.prompt}"${params.inputImage ? ' (with input image for editing)' : ''}`,
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          this.config.setApprovalMode(ApprovalMode.AUTO_EDIT);
        }
      },
    };
  }

  async execute(
    params: GeminiImageGenerationParams,
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
      const geminiClient = this.config.getGeminiClient();
      const filename = params.filename || 'gemini-generated-image';
      
      // Prepare content parts
      const contentParts: any[] = [{ text: params.prompt }];
      
      // Add input image if provided
      if (params.inputImage && params.inputImageMimeType) {
        contentParts.push({
          inlineData: {
            mimeType: params.inputImageMimeType,
            data: params.inputImage,
          },
        });
      }

      // Generate content with image generation enabled
      const response = await geminiClient.generateContent(
        [{ role: 'user', parts: contentParts }],
        {
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        },
        signal,
      );

      let textResponse = '';
      let imageCount = 0;
      const savedFiles: string[] = [];

      // Process response parts
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.text) {
          textResponse += part.text;
        } else if (part.inlineData) {
          imageCount++;
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, 'base64');
          
          // Create output filename
          const outputFilename = imageCount > 1 ? `${filename}-${imageCount}.png` : `${filename}.png`;
          const outputPath = path.join(this.config.getTargetDir(), outputFilename);
          
          // Save image
          fs.writeFileSync(outputPath, buffer);
          savedFiles.push(outputFilename);
        }
      }

      if (savedFiles.length === 0) {
        return {
          llmContent: 'No images were generated. The model may have responded with text only.',
          returnDisplay: 'No images generated. Try being more explicit about requesting image generation.',
        };
      }

      const displayMessage = `Generated ${savedFiles.length} image${savedFiles.length > 1 ? 's' : ''}:\n${savedFiles.map(f => `- ${f}`).join('\n')}\n\n${textResponse}`;

      return {
        llmContent: `Generated images: ${savedFiles.join(', ')}. ${textResponse}`,
        returnDisplay: displayMessage,
      };

    } catch (error) {
      const errorMessage = `Error generating image: ${getErrorMessage(error)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: errorMessage,
      };
    }
  }
}

/**
 * Tool implementation for Imagen-based image generation
 */
export class ImagenGenerationTool extends BaseTool<ImagenGenerationParams, ToolResult> {
  static readonly Name: string = 'imagen_generation';

  constructor(private readonly config: Config) {
    super(
      ImagenGenerationTool.Name,
      'Imagen Generation',
      'Generate high-quality images using Google Imagen models. Specialized for photorealistic images, artistic styles, and precise visual details. Generated images include SynthID watermarks.',
      {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: 'English text prompt describing the image to generate. Be descriptive and specific. Maximum 480 tokens.',
          },
          numberOfImages: {
            type: Type.NUMBER,
            description: 'Number of images to generate (1-4). Default is 4. Imagen 4 Ultra only generates 1 image.',
            minimum: 1,
            maximum: 4,
          },
          aspectRatio: {
            type: Type.STRING,
            enum: ['1:1', '3:4', '4:3', '9:16', '16:9'],
            description: 'Aspect ratio for generated images. Default is 1:1 (square).',
          },
          personGeneration: {
            type: Type.STRING,
            enum: ['dont_allow', 'allow_adult', 'allow_all'],
            description: 'Policy for generating images of people. Default is allow_adult.',
          },
          filename: {
            type: Type.STRING,
            description: 'Base filename without extension (will be saved as PNG). Defaults to "imagen-generated".',
          },
        },
        required: ['prompt'],
      },
    );
  }

  validateParams(params: ImagenGenerationParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (params.numberOfImages && (params.numberOfImages < 1 || params.numberOfImages > 4)) {
      return 'numberOfImages must be between 1 and 4';
    }

    return null;
  }

  getDescription(params: ImagenGenerationParams): string {
    const count = params.numberOfImages || 4;
    const filename = params.filename || 'imagen-generated';
    return `Generating ${count} image${count > 1 ? 's' : ''} with prompt: "${params.prompt.substring(0, 100)}${params.prompt.length > 100 ? '...' : ''}" (Output: ${filename}-*.png)`;
  }

  async shouldConfirmExecute(
    params: ImagenGenerationParams,
  ): Promise<ToolCallConfirmationDetails | false> {
    if (this.config.getApprovalMode() === ApprovalMode.AUTO_EDIT) {
      return false;
    }

    const validationError = this.validateParams(params);
    if (validationError) {
      return false;
    }

    const count = params.numberOfImages || 4;
    return {
      type: 'info',
      title: 'Confirm Imagen Generation',
      prompt: `Generate ${count} image${count > 1 ? 's' : ''} with prompt: "${params.prompt}"`,
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          this.config.setApprovalMode(ApprovalMode.AUTO_EDIT);
        }
      },
    };
  }

  async execute(
    params: ImagenGenerationParams,
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
      const geminiClient = this.config.getGeminiClient();
      const filename = params.filename || 'imagen-generated';
      
      // Generate images using Imagen
      const response = await geminiClient.generateImages(
        {
          model: 'imagen-4.0-generate-preview-06-06',
          prompt: params.prompt,
          config: {
            numberOfImages: params.numberOfImages || 4,
            aspectRatio: params.aspectRatio || '1:1',
            personGeneration: params.personGeneration || 'allow_adult',
          },
        },
        signal,
      );

      const savedFiles: string[] = [];
      let idx = 1;
      
      for (const generatedImage of response.generatedImages) {
        const imgBytes = generatedImage.image.imageBytes;
        const buffer = Buffer.from(imgBytes, 'base64');
        
        // Create output filename
        const outputFilename = `${filename}-${idx}.png`;
        const outputPath = path.join(this.config.getTargetDir(), outputFilename);
        
        // Save image
        fs.writeFileSync(outputPath, buffer);
        savedFiles.push(outputFilename);
        idx++;
      }

      const displayMessage = `Generated ${savedFiles.length} image${savedFiles.length > 1 ? 's' : ''} using Imagen:\n${savedFiles.map(f => `- ${f}`).join('\n')}`;

      return {
        llmContent: `Generated images: ${savedFiles.join(', ')}`,
        returnDisplay: displayMessage,
      };

    } catch (error) {
      const errorMessage = `Error generating images with Imagen: ${getErrorMessage(error)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: errorMessage,
      };
    }
  }
}