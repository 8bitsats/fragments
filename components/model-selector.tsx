import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  capabilities: string[];
}

export const availableModels: Model[] = [
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Most capable GPT-4 model for chat and text generation',
    maxTokens: 4096,
    capabilities: ['chat', 'code', 'analysis'],
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and efficient model for most tasks',
    maxTokens: 4096,
    capabilities: ['chat', 'code', 'analysis'],
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: 'Advanced image generation model',
    maxTokens: 0,
    capabilities: ['image'],
  },
  {
    id: 'tts-1-hd',
    name: 'TTS HD',
    provider: 'OpenAI',
    description: 'High-quality text-to-speech model',
    maxTokens: 0,
    capabilities: ['voice'],
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ selectedModel, onModelChange, className = '' }: ModelSelectorProps) {
  const currentModel = availableModels.find(model => model.id === selectedModel);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label>Model</Label>
        {currentModel && (
          <span className="text-xs text-muted-foreground">
            {currentModel.provider}
          </span>
        )}
      </div>
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger>
          <SelectValue>
            {currentModel?.name || 'Select a model'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableModels.map(model => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentModel && (
        <div className="flex flex-wrap gap-1">
          {currentModel.capabilities.map(capability => (
            <span
              key={capability}
              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
            >
              {capability}
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 