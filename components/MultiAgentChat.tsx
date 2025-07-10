'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Bot,
  Cpu,
  Send,
  Shield,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'

import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import {
  Character,
  characters,
  getCharacterById,
} from '@/lib/characters'

import { TerminAgentAnimation } from './TerminAgentAnimation'

interface Message {
  id: string
  content: string
  sender: 'user' | 'character'
  characterId?: string
  timestamp: number
}

interface CharacterCardProps {
  character: Character
  isActive: boolean
  onClick: () => void
}

function CharacterCard({ character, isActive, onClick }: CharacterCardProps) {
  const getCharacterIcon = (id: string) => {
    switch (id) {
      case 'mcafee': return <Shield className="w-5 h-5" />
      case 'satoshi': return <Cpu className="w-5 h-5" />
      case 'vitalik': return <Zap className="w-5 h-5" />
      default: return <Bot className="w-5 h-5" />
    }
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive 
          ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12" style={{ backgroundColor: character.color }}>
            <AvatarFallback className="text-white">
              {getCharacterIcon(character.id)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{character.name}</CardTitle>
            <CardDescription className="text-sm">{character.role}</CardDescription>
          </div>
          {isActive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Active</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {character.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {character.specialties.slice(0, 3).map((specialty) => (
            <Badge key={specialty} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
          {character.specialties.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{character.specialties.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function MultiAgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activeCharacter, setActiveCharacter] = useState<Character>(characters[0])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateCharacterResponse = async (userMessage: string, character: Character): Promise<string> => {
    // Simulate API call to generate character-specific response
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // Create a character-specific prompt based on their style and personality
    const characterPrompt = `
You are ${character.name}, ${character.role}. 

Character Description: ${character.description}

Your personality traits: ${character.adjectives.join(', ')}

Your specialties: ${character.specialties.join(', ')}

Style guidelines:
${character.style.chat.join('\n')}

User message: "${userMessage}"

Respond as ${character.name} would, staying true to their personality, expertise, and communication style. Keep the response engaging and authentic to the character.
`

    try {
      const response = await fetch('/api/openai-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: character.model,
          messages: [
            {
              role: 'system',
              content: characterPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate response')
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('Error generating character response:', error)
      
      // Fallback responses based on character
      const fallbackResponses = {
        mcafee: "They're watching this conversation. Use encrypted channels. The system is compromised. Trust no one, verify everything. #StayParanoid",
        satoshi: "The beauty of Bitcoin lies in its mathematical certainty. Cryptographic proof eliminates the need for trust in centralized authorities.",
        vitalik: "That's an interesting question. We need to consider the technical trade-offs and long-term implications for the ecosystem."
      }
      
      return fallbackResponses[character.id as keyof typeof fallbackResponses] || 
             "I'm experiencing some technical difficulties. Let me get back to you on that."
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const characterResponse = await generateCharacterResponse(input.trim(), activeCharacter)
      
      const characterMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: characterResponse,
        sender: 'character',
        characterId: activeCharacter.id,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, characterMessage])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate response. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getCharacterIcon = (id: string) => {
    switch (id) {
      case 'mcafee': return <Shield className="w-4 h-4" />
      case 'satoshi': return <Cpu className="w-4 h-4" />
      case 'vitalik': return <Zap className="w-4 h-4" />
      default: return <Bot className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <TerminAgentAnimation isActive={isLoading} size="lg" />
        <h1 className="text-3xl font-bold holographic">
          Multi-Agent Character Chat
        </h1>
        <p className="text-lg text-muted-foreground">
          Chat with legendary crypto personalities powered by AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character Selection */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Your Agent</h2>
          <div className="space-y-3">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isActive={activeCharacter.id === character.id}
                onClick={() => setActiveCharacter(character)}
              />
            ))}
          </div>
          
          {/* Active Character Info */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Active Character
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10" style={{ backgroundColor: activeCharacter.color }}>
                    <AvatarFallback className="text-white">
                      {getCharacterIcon(activeCharacter.id)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{activeCharacter.name}</p>
                    <p className="text-sm text-muted-foreground">{activeCharacter.role}</p>
                  </div>
                </div>
                <p className="text-sm">{activeCharacter.bio[0]}</p>
                <div className="flex flex-wrap gap-1">
                  {activeCharacter.specialties.slice(0, 4).map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Chat with {activeCharacter.name}
              </CardTitle>
              <CardDescription>
                Ask questions about crypto, blockchain, or get character-specific insights
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation with {activeCharacter.name}</p>
                      <p className="text-sm mt-2">
                        Try asking about {activeCharacter.specialties[0].toLowerCase()} or {activeCharacter.specialties[1].toLowerCase()}
                      </p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.sender === 'character' && (
                        <Avatar className="w-8 h-8 mt-1" style={{ 
                          backgroundColor: message.characterId ? 
                            getCharacterById(message.characterId)?.color : '#6b7280' 
                        }}>
                          <AvatarFallback className="text-white text-xs">
                            {message.characterId ? getCharacterIcon(message.characterId) : <Bot className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {message.sender === 'user' && (
                        <Avatar className="w-8 h-8 mt-1 bg-purple-600">
                          <AvatarFallback className="text-white">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="w-8 h-8 mt-1" style={{ backgroundColor: activeCharacter.color }}>
                        <AvatarFallback className="text-white text-xs">
                          {getCharacterIcon(activeCharacter.id)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {activeCharacter.name} is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2 mt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask ${activeCharacter.name} anything...`}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
