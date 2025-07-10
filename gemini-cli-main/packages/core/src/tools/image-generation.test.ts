/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiImageGenerationTool, ImagenGenerationTool } from './image-generation.js';
import { Config } from '../config/config.js';
import * as fs from 'node:fs';

// Mock fs
vi.mock('node:fs');

// Mock config
const mockConfig = {
  getGeminiClient: vi.fn(),
  getTargetDir: vi.fn(() => '/test/dir'),
  getApprovalMode: vi.fn(() => 'default'),
  setApprovalMode: vi.fn(),
} as unknown as Config;

// Mock Gemini client
const mockGeminiClient = {
  generateContent: vi.fn(),
  generateImages: vi.fn(),
};

describe('GeminiImageGenerationTool', () => {
  let tool: GeminiImageGenerationTool;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockConfig.getGeminiClient as any).mockReturnValue(mockGeminiClient);
    tool = new GeminiImageGenerationTool(mockConfig);
  });

  describe('validateParams', () => {
    it('should validate valid parameters', () => {
      const params = { prompt: 'A beautiful sunset' };
      expect(tool.validateParams(params)).toBeNull();
    });

    it('should require inputImageMimeType when inputImage is provided', () => {
      const params = {
        prompt: 'Edit this image',
        inputImage: 'base64data',
      };
      expect(tool.validateParams(params)).toContain('inputImageMimeType is required');
    });

    it('should not allow inputImageMimeType without inputImage', () => {
      const params = {
        prompt: 'Generate image',
        inputImageMimeType: 'image/png',
      };
      expect(tool.validateParams(params)).toContain('inputImageMimeType should only be provided');
    });
  });

  describe('execute', () => {
    it('should generate image successfully', async () => {
      const params = {
        prompt: 'A beautiful sunset',
        filename: 'test-image',
      };

      const mockResponse = {
        candidates: [{
          content: {
            parts: [
              { text: 'Generated a beautiful sunset image' },
              { 
                inlineData: {
                  data: 'fake-base64-image-data',
                  mimeType: 'image/png'
                }
              }
            ]
          }
        }]
      };

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);
      (fs.writeFileSync as any).mockImplementation(() => {});

      const result = await tool.execute(params, new AbortController().signal);

      expect(result.llmContent).toContain('Generated images: test-image.png');
      expect(result.returnDisplay).toContain('Generated 1 image');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/test/dir/test-image.png',
        expect.any(Buffer)
      );
    });

    it('should handle image editing with input image', async () => {
      const params = {
        prompt: 'Add a rainbow to this image',
        inputImage: 'base64inputimage',
        inputImageMimeType: 'image/jpeg',
        filename: 'edited-image',
      };

      const mockResponse = {
        candidates: [{
          content: {
            parts: [
              { text: 'Added rainbow to the image' },
              { 
                inlineData: {
                  data: 'fake-base64-edited-image-data',
                  mimeType: 'image/png'
                }
              }
            ]
          }
        }]
      };

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);
      (fs.writeFileSync as any).mockImplementation(() => {});

      const result = await tool.execute(params, new AbortController().signal);

      expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            parts: expect.arrayContaining([
              { text: 'Add a rainbow to this image' },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'base64inputimage',
                }
              }
            ])
          })
        ]),
        expect.any(Object),
        expect.any(AbortSignal)
      );

      expect(result.llmContent).toContain('Generated images: edited-image.png');
    });

    it('should handle no images generated', async () => {
      const params = { prompt: 'Generate something' };

      const mockResponse = {
        candidates: [{
          content: {
            parts: [
              { text: 'I can help you with that, but I need more details.' }
            ]
          }
        }]
      };

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);

      const result = await tool.execute(params, new AbortController().signal);

      expect(result.llmContent).toContain('No images were generated');
      expect(result.returnDisplay).toContain('No images generated');
    });

    it('should handle errors gracefully', async () => {
      const params = { prompt: 'Generate image' };

      mockGeminiClient.generateContent.mockRejectedValue(new Error('API Error'));

      const result = await tool.execute(params, new AbortController().signal);

      expect(result.llmContent).toContain('Error generating image: API Error');
      expect(result.returnDisplay).toContain('Error generating image: API Error');
    });
  });
});

describe('ImagenGenerationTool', () => {
  let tool: ImagenGenerationTool;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockConfig.getGeminiClient as any).mockReturnValue(mockGeminiClient);
    tool = new ImagenGenerationTool(mockConfig);
  });

  describe('validateParams', () => {
    it('should validate valid parameters', () => {
      const params = { prompt: 'A photorealistic sunset' };
      expect(tool.validateParams(params)).toBeNull();
    });

    it('should validate numberOfImages range', () => {
      const params = {
        prompt: 'Generate images',
        numberOfImages: 5,
      };
      expect(tool.validateParams(params)).toContain('numberOfImages must be between 1 and 4');
    });
  });

  describe('execute', () => {
    it('should generate images successfully', async () => {
      const params = {
        prompt: 'A photorealistic sunset over mountains',
        numberOfImages: 2,
        aspectRatio: '16:9' as const,
        filename: 'imagen-test',
      };

      const mockResponse = {
        generatedImages: [
          { image: { imageBytes: 'fake-base64-image-1' } },
          { image: { imageBytes: 'fake-base64-image-2' } },
        ]
      };

      mockGeminiClient.generateImages.mockResolvedValue(mockResponse);
      (fs.writeFileSync as any).mockImplementation(() => {});

      const result = await tool.execute(params, new AbortController().signal);

      expect(mockGeminiClient.generateImages).toHaveBeenCalledWith(
        {
          model: 'imagen-4.0-generate-preview-06-06',
          prompt: 'A photorealistic sunset over mountains',
          config: {
            numberOfImages: 2,
            aspectRatio: '16:9',
            personGeneration: 'allow_adult',
          },
        },
        expect.any(AbortSignal)
      );

      expect(result.llmContent).toContain('Generated images: imagen-test-1.png, imagen-test-2.png');
      expect(result.returnDisplay).toContain('Generated 2 images using Imagen');
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should use default values', async () => {
      const params = { prompt: 'A robot holding a skateboard' };

      const mockResponse = {
        generatedImages: [
          { image: { imageBytes: 'fake-base64-image-1' } },
          { image: { imageBytes: 'fake-base64-image-2' } },
          { image: { imageBytes: 'fake-base64-image-3' } },
          { image: { imageBytes: 'fake-base64-image-4' } },
        ]
      };

      mockGeminiClient.generateImages.mockResolvedValue(mockResponse);
      (fs.writeFileSync as any).mockImplementation(() => {});

      const result = await tool.execute(params, new AbortController().signal);

      expect(mockGeminiClient.generateImages).toHaveBeenCalledWith(
        {
          model: 'imagen-4.0-generate-preview-06-06',
          prompt: 'A robot holding a skateboard',
          config: {
            numberOfImages: 4,
            aspectRatio: '1:1',
            personGeneration: 'allow_adult',
          },
        },
        expect.any(AbortSignal)
      );

      expect(result.returnDisplay).toContain('Generated 4 images using Imagen');
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    });

    it('should handle errors gracefully', async () => {
      const params = { prompt: 'Generate image' };

      mockGeminiClient.generateImages.mockRejectedValue(new Error('Imagen API Error'));

      const result = await tool.execute(params, new AbortController().signal);

      expect(result.llmContent).toContain('Error generating images with Imagen: Imagen API Error');
      expect(result.returnDisplay).toContain('Error generating images with Imagen: Imagen API Error');
    });
  });
});