import OpenAI from 'openai';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

interface AgentResponse {
  type: string;
  content: string;
  metadata?: {
    source?: string;
    timing?: number;
    tokens_used?: number;
  };
}

import { 
  AgentResponseSchema,
  AGENT_PROMPTS,
  OPENAI_CONFIG,
  SEARCH_CONFIG,
  RATE_LIMITS,
  ERROR_MESSAGES 
} from './agent-config';

export class AgentService {
  private openai: OpenAI;
  private requestCount: number = 0;
  private lastReset: number = Date.now();
  private selectedModel: string;

  constructor(apiKey: string, model: string = OPENAI_CONFIG.models.chat) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true
    });
    this.selectedModel = model;
  }

  setModel(model: string) {
    this.selectedModel = model;
  }

  private async checkRateLimit() {
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    if (this.requestCount >= RATE_LIMITS.requests_per_minute) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT);
    }
    this.requestCount++;
  }

  async chat(input: string, context: string[] = []): Promise<AgentResponse> {
    await this.checkRateLimit();

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: AGENT_PROMPTS.MAIN_SYSTEM },
        ...context.map(msg => ({ role: 'user' as const, content: msg })),
        { role: 'user', content: input }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.selectedModel,
        messages,
        max_tokens: OPENAI_CONFIG.max_tokens,
        temperature: OPENAI_CONFIG.temperature,
      });

      return {
        type: 'text',
        content: completion.choices[0]?.message?.content || '',
        metadata: {
          tokens_used: completion.usage?.total_tokens,
          timing: Date.now(),
        }
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  async generateImage(prompt: string): Promise<AgentResponse> {
    await this.checkRateLimit();

    try {
      const response = await this.openai.images.generate({
        model: OPENAI_CONFIG.models.image,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      const imageData = response.data?.[0]?.b64_json;
      if (!imageData) {
        throw new Error('Failed to generate image');
      }

      return {
        type: 'image',
        content: imageData,
        metadata: {
          timing: Date.now(),
        }
      };
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  async webSearch(query: string): Promise<AgentResponse> {
    await this.checkRateLimit();

    try {
      const messages: ChatMessage[] = [
        { 
          role: 'system' as const, 
          content: 'You are a web search assistant. Search the web and summarize the results.' 
        },
        { role: 'user' as const, content: query }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.selectedModel,
        messages,
        tools: [{
          type: 'function',
          function: {
            name: 'search',
            description: 'Search the web for information',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query'
                }
              },
              required: ['query']
            }
          }
        }],
      });

      const searchResults = completion.choices[0]?.message?.tool_calls?.[0]?.function?.arguments || '[]';

      return {
        type: 'web_search',
        content: searchResults,
        metadata: {
          timing: Date.now(),
          source: 'web_search',
        }
      };
    } catch (error) {
      console.error('Web search error:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  async processVoice(audioInput: string): Promise<AgentResponse> {
    await this.checkRateLimit();

    try {
      // Convert base64 to File object
      const buffer = Buffer.from(audioInput, 'base64');
      const audioFile = new File([buffer], 'audio.wav', { type: 'audio/wav' });

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });

      return {
        type: 'text',
        content: response.text,
        metadata: {
          timing: Date.now(),
        }
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  async generateVoiceResponse(text: string): Promise<AgentResponse> {
    await this.checkRateLimit();

    try {
      const response = await this.openai.audio.speech.create({
        model: OPENAI_CONFIG.models.voice,
        input: text,
        voice: OPENAI_CONFIG.voice_settings.voice,
        response_format: 'mp3',
      });

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      return {
        type: 'voice',
        content: base64Audio,
        metadata: {
          timing: Date.now(),
        }
      };
    } catch (error) {
      console.error('Voice generation error:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }
} 