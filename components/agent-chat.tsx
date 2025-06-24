import React, { useState, useEffect, useRef } from 'react';
import { AgentService } from '@/lib/agent-service';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';
import { LoaderIcon, Search, Image, Mic, Volume2, Settings } from 'lucide-react';
import { ModelSelector, availableModels } from './model-selector';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Message {
  role: 'user' | 'assistant';
  type: 'text' | 'image' | 'web_search' | 'voice';
  content: string;
  metadata?: {
    source?: string;
    timing?: number;
    tokens_used?: number;
  };
}

interface AgentResponse {
  type: 'text' | 'image' | 'web_search' | 'voice';
  content: string;
  metadata?: {
    source?: string;
    timing?: number;
    tokens_used?: number;
  };
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo-preview');
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const agentServiceRef = useRef<AgentService | null>(null);

  useEffect(() => {
    agentServiceRef.current = new AgentService(process.env.NEXT_PUBLIC_OPENAI_API_KEY || '', selectedModel);
  }, []);

  useEffect(() => {
    if (agentServiceRef.current) {
      agentServiceRef.current.setModel(selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentServiceRef.current) return;

    const userMessage: Message = {
      role: 'user',
      type: 'text',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // First, try web search if it seems like a question
      if (input.toLowerCase().includes('what') || 
          input.toLowerCase().includes('how') || 
          input.toLowerCase().includes('why') ||
          input.toLowerCase().includes('when') ||
          input.toLowerCase().includes('where')) {
        const searchResponse = await agentServiceRef.current.webSearch(input);
        setMessages(prev => [...prev, {
          role: 'assistant',
          type: 'web_search',
          content: searchResponse.content,
          metadata: searchResponse.metadata,
        }]);
      }

      // Then generate a chat response
      const chatResponse = await agentServiceRef.current.chat(input, messages.map(m => m.content));
      setMessages(prev => [...prev, {
        role: 'assistant',
        type: 'text',
        content: chatResponse.content,
        metadata: chatResponse.metadata,
      }]);

      // If the message mentions images, generate one
      if (input.toLowerCase().includes('image') || 
          input.toLowerCase().includes('picture') || 
          input.toLowerCase().includes('generate') ||
          input.toLowerCase().includes('create')) {
        const imageResponse = await agentServiceRef.current.generateImage(input);
        if (imageResponse.content) {
          const imageMessage: Message = {
            role: 'assistant',
            type: 'image',
            content: imageResponse.content,
            metadata: imageResponse.metadata,
          };
          setMessages(prev => [...prev, imageMessage]);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
            try {
              setIsLoading(true);
              const response = await agentServiceRef.current?.processVoice(base64Audio);
              setMessages(prev => [...prev, {
                role: 'user',
                type: 'voice',
                content: response?.content || '',
              }]);
              
              // Generate voice response
              const voiceResponse = await agentServiceRef.current?.generateVoiceResponse(response?.content || '');
              if (voiceResponse?.content) {
                const voiceMessage: Message = {
                  role: 'assistant',
                  type: 'voice',
                  content: voiceResponse.content,
                  metadata: voiceResponse.metadata,
                };
                setMessages(prev => [...prev, voiceMessage]);

                // Play the voice response
                const audio = new Audio(`data:audio/mp3;base64,${voiceResponse.content}`);
                await audio.play();
              }
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Failed to process voice input',
                variant: 'destructive',
              });
            } finally {
              setIsLoading(false);
            }
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to access microphone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    toast({
      title: 'Model Changed',
      description: `Now using ${availableModels.find(m => m.id === modelId)?.name}`,
    });
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">AI Agent Chat</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Chat Settings</SheetTitle>
              <SheetDescription>
                Configure the AI models and settings for your chat.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                className="mb-4"
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              {message.type === 'image' ? (
                <img
                  src={`data:image/png;base64,${message.content}`}
                  alt="Generated"
                  className="rounded-lg max-w-full h-auto"
                />
              ) : message.type === 'web_search' ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" />
                    <span className="text-sm font-medium">Web Search Results</span>
                  </div>
                  <div className="text-sm">{message.content}</div>
                </div>
              ) : message.type === 'voice' ? (
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>{message.content}</span>
                </div>
              ) : (
                <div>{message.content}</div>
              )}
              {message.metadata && (
                <div className="mt-2 text-xs opacity-70">
                  {message.metadata.source && (
                    <span>Source: {message.metadata.source}</span>
                  )}
                  {message.metadata.timing && (
                    <span className="ml-2">
                      {new Date(message.metadata.timing).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <LoaderIcon className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={`${isRecording ? 'bg-red-100 text-red-500' : ''}`}
          >
            <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            rows={1}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
} 