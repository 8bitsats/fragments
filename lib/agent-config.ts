import { z } from 'zod';

// Agent response schema
export const AgentResponseSchema = z.object({
  type: z.enum(['text', 'image', 'web_search', 'code', 'error']),
  content: z.string(),
  metadata: z.object({
    source: z.string().optional(),
    confidence: z.number().optional(),
    timing: z.number().optional(),
    tokens_used: z.number().optional(),
  }).optional(),
});

// Agent capabilities configuration
export const AgentCapabilities = {
  conversation: true,
  web_search: true,
  image_generation: true,
  code_generation: true,
  voice_interaction: true,
};

// Agent system prompts
export const AGENT_PROMPTS = {
  MAIN_SYSTEM: `You are an advanced AI assistant with capabilities in conversation, web search, image generation, and code generation.
Your responses should be helpful, accurate, and engaging. You can:
1. Have natural conversations and answer questions
2. Search the web for real-time information
3. Generate and edit images based on descriptions
4. Generate and explain code
5. Process voice input and respond with voice

Always aim to provide the most relevant and up-to-date information. If you're unsure about something, you should use your web search capability to verify information.`,

  IMAGE_SYSTEM: `When generating images, follow these guidelines:
1. Understand the user's request thoroughly
2. Generate high-quality, appropriate images
3. Provide clear descriptions of what was generated
4. Offer to make adjustments if needed
5. Respect content safety guidelines`,

  CODE_SYSTEM: `When generating code:
1. Write clean, well-documented code
2. Follow best practices for the chosen language
3. Include error handling where appropriate
4. Explain the code's functionality
5. Suggest improvements or alternatives`,

  VOICE_SYSTEM: `For voice interactions:
1. Process speech input accurately
2. Generate natural-sounding responses
3. Maintain conversation context
4. Handle accents and variations in speech
5. Provide clear and concise audio responses`,
};

// OpenAI API configuration
export const OPENAI_CONFIG = {
  models: {
    chat: 'gpt-4-turbo-preview',
    image: 'dall-e-3',
    voice: 'tts-1-hd',
  },
  max_tokens: 4000,
  temperature: 0.7,
  voice_settings: {
    voice: 'alloy',
    format: 'mp3',
  },
};

// Web search configuration
export const SEARCH_CONFIG = {
  max_results: 5,
  timeout: 10000, // 10 seconds
  cache_duration: 3600, // 1 hour
};

// Rate limiting configuration
export const RATE_LIMITS = {
  requests_per_minute: 60,
  tokens_per_minute: 90000,
  image_generations_per_minute: 10,
};

// Error messages
export const ERROR_MESSAGES = {
  RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
  API_ERROR: 'An error occurred while processing your request.',
  INVALID_REQUEST: 'Invalid request format.',
  CONTENT_FILTER: 'Content filtered due to safety guidelines.',
  TOKEN_LIMIT: 'Maximum token limit exceeded.',
}; 