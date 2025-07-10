'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  LoaderIcon,
  Mic,
  Settings,
  Sparkles,
} from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { GoogleGenerativeAI } from '@google/generative-ai'

import Logo from './logo'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

interface Message {
  role: 'user' | 'assistant'
  type: 'text' | 'image' | 'web_search' | 'voice' | 'code'
  content: string
  metadata?: {
    source?: string
    timing?: number
    tokens_used?: number
  }
}

interface VibePersonality {
  greeting: string
  catchphrases: string[]
  emojis: string[]
}

export function TerminAgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const { toast } = useToast()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const genAIRef = useRef<GoogleGenerativeAI | null>(null)

  const personality: VibePersonality = {
    greeting: "Yo! 🤖 TerminAgent here, ready to vibe and code with you! What's the mission today?",
    catchphrases: [
      "Let's cook! 🔥",
      "That's fire! 🚀", 
      "We're vibing! ✨",
      "Code looking fresh! 💯",
      "Let's ship it! 🚢",
      "Big brain energy! 🧠",
      "No cap! 📈",
      "That hits different! 💫"
    ],
    emojis: ["🤖", "🔥", "✨", "💯", "🚀", "💫", "🎯", "⚡", "🌟", "💎"]
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (apiKey) {
      genAIRef.current = new GoogleGenerativeAI(apiKey)
    } else {
      toast({
        title: 'Configuration Error',
        description: 'Google API key not found. Please check your environment variables.',
        variant: 'destructive',
      })
    }

    // Add greeting message
    setMessages([{
      role: 'assistant',
      type: 'text',
      content: personality.greeting,
      metadata: { timing: Date.now() }
    }])
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const getSystemPrompt = () => {
    return `You are TerminAgent, a vibe coding assistant with serious personality! 

PERSONALITY TRAITS:
- Casual, energetic, and modern speaking style
- Use emojis and catchphrases naturally: ${personality.catchphrases.join(', ')}
- Favorite emojis: ${personality.emojis.join(' ')}
- Always helpful and encouraging
- Love clean, modern code with "extra sauce"

CAPABILITIES:
- Code generation and review
- Web development expertise
- Solana blockchain development
- AI/ML integration
- Project architecture advice
- Debugging and optimization

RESPONSE STYLE:
- Start responses with energy and personality
- Explain code clearly but keep it fun
- Use modern coding practices
- Add helpful comments and suggestions
- End with encouragement or next steps

Remember: You're not just an AI, you're a coding buddy with serious vibe energy! 🚀`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !genAIRef.current) return

    const userMessage: Message = {
      role: 'user',
      type: 'text',
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const model = genAIRef.current.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        systemInstruction: getSystemPrompt()
      })

      const chat = model.startChat({
        history: messages.slice(-10).filter(msg => msg.role !== 'assistant' || messages.indexOf(msg) > 0).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      })

      const result = await chat.sendMessage(input)
      const response = result.response
      const text = response.text()

      // Add some vibe to the response
      const randomEmoji = personality.emojis[Math.floor(Math.random() * personality.emojis.length)]
      const shouldAddCatchphrase = Math.random() < 0.3
      const randomCatchphrase = personality.catchphrases[Math.floor(Math.random() * personality.catchphrases.length)]
      
      let finalResponse = text
      if (shouldAddCatchphrase) {
        finalResponse += `\n\n${randomCatchphrase}`
      }

      const assistantMessage: Message = {
        role: 'assistant',
        type: input.toLowerCase().includes('code') || input.toLowerCase().includes('function') ? 'code' : 'text',
        content: finalResponse,
        metadata: {
          timing: Date.now(),
        }
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Chat error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while processing your request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        // For now, just show a placeholder message
        toast({
          title: 'Voice Feature',
          description: 'Voice input recorded! Voice processing coming soon with Gemini Live API.',
        })
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to access microphone',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      type: 'text',
      content: personality.greeting,
      metadata: { timing: Date.now() }
    }])
    toast({
      title: 'Chat Cleared',
      description: 'Ready for a fresh start! 🚀',
    })
  }

  return (
    <div className="flex flex-col h-full max-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
        <div className="flex items-center gap-3">
          <Logo style="terminagent" width={40} height={40} className="rounded-full" />
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 text-transparent bg-clip-text">
              TerminAgent
            </h1>
            <p className="text-sm text-muted-foreground">Vibe Coding Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearChat}>
            Clear Chat
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>TerminAgent Settings</SheetTitle>
                <SheetDescription>
                  Configure your vibe coding assistant.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Personality</h3>
                    <p className="text-sm text-muted-foreground">
                      Energetic, helpful coding buddy with serious vibe energy
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">Model</h3>
                    <p className="text-sm text-muted-foreground">
                      Google Gemini 2.0 Flash (Experimental)
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">Capabilities</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Code generation & review</li>
                      <li>• Solana blockchain development</li>
                      <li>• Web development</li>
                      <li>• AI/ML integration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
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
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                  : 'bg-muted'
              }`}
            >
              {message.type === 'code' && message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Code Generation</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.metadata && (
                <div className="mt-2 text-xs opacity-70">
                  {message.metadata.timing && (
                    <span>
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoaderIcon className="w-4 h-4 animate-spin" />
              <span>TerminAgent is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={`${isRecording ? 'bg-red-100 text-red-500 dark:bg-red-900/20' : ''}`}
          >
            <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask TerminAgent anything about coding, Solana, or tech... 🚀"
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
