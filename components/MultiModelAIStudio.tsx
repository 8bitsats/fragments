'use client'

import React, { useState } from 'react'

import {
  Bot,
  Brain,
  Camera,
  Code,
  Download,
  Globe,
  Image as ImageIcon,
  Loader2,
  Palette,
  Search,
  Sparkles,
  Terminal,
  Wand2,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

interface ModelProvider {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  capabilities: string[]
  color: string
}

interface GeneratedContent {
  id: string
  type: 'text' | 'image' | 'code'
  content: string
  prompt: string
  provider: string
  model: string
  timestamp: number
  metadata?: any
}

const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: <Brain className="w-5 h-5" />,
    description: 'GPT-4, DALL-E, and reasoning models',
    capabilities: ['Text Generation', 'Image Generation', 'Code', 'Reasoning', 'Web Search'],
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Gemini Pro and Ultra models',
    capabilities: ['Text Generation', 'Multimodal', 'Code', 'Analysis'],
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'flux',
    name: 'FLUX',
    icon: <Zap className="w-5 h-5" />,
    description: 'High-speed image generation',
    capabilities: ['Image Generation', 'Style Transfer', 'Fast Generation'],
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'deepsolana',
    name: 'DeepSolana',
    icon: <Terminal className="w-5 h-5" />,
    description: 'Solana-specialized AI model',
    capabilities: ['Blockchain Code', 'Smart Contracts', 'Solana Development'],
    color: 'from-orange-500 to-red-600'
  }
]

const TOOLS = [
  { id: 'web_search', name: 'Web Search', icon: <Globe className="w-4 h-4" /> },
  { id: 'code_interpreter', name: 'Code Execution', icon: <Code className="w-4 h-4" /> },
  { id: 'image_generation', name: 'Image Generation', icon: <Camera className="w-4 h-4" /> },
  { id: 'file_search', name: 'File Search', icon: <Search className="w-4 h-4" /> }
]

export function MultiModelAIStudio() {
  const [selectedProvider, setSelectedProvider] = useState<string>('openai')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('chat')
  const { toast } = useToast()

  const currentProvider = MODEL_PROVIDERS.find(p => p.id === selectedProvider)

  const generateContent = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a prompt to generate content.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)

    try {
      const tools = selectedTools.map(toolId => ({ type: toolId }))
      
      const response = await fetch('/api/openai-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          tools: tools.length > 0 ? tools : undefined,
          temperature: 0.7,
          max_tokens: 2048,
          ...(selectedTools.includes('image_generation') && {
            image_generation_params: {
              prompt,
              size: '1024x1024',
              quality: 'standard'
            }
          })
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      const newContent: GeneratedContent = {
        id: Date.now().toString(),
        type: result.type === 'image_generation' ? 'image' : 'text',
        content: result.type === 'image_generation' ? result.images[0]?.url : result.content,
        prompt,
        provider: selectedProvider,
        model: selectedModel,
        timestamp: Date.now(),
        metadata: result
      }

      setGeneratedContent(prev => [newContent, ...prev])

      toast({
        title: 'Content Generated! ✨',
        description: `Your ${currentProvider?.name} creation is ready!`,
      })

    } catch (error) {
      console.error('Generation error:', error)
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate content',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadContent = (content: GeneratedContent) => {
    if (content.type === 'image') {
      const link = document.createElement('a')
      link.href = content.content
      link.download = `ai-art-${content.provider}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const blob = new Blob([content.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ai-content-${content.provider}-${Date.now()}.txt`
      document.body.appendChild(link)
      link.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(link)
    }

    toast({
      title: 'Downloaded!',
      description: 'Content saved to your downloads folder.',
    })
  }

  const toggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="matrix-rain"></div>
        <h1 className="text-4xl font-bold holographic">
          Multi-Model AI Studio
        </h1>
        <p className="text-lg text-muted-foreground">
          Seamlessly switch between OpenAI, Google, FLUX, and DeepSolana agents
        </p>
        
        {/* Provider Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {MODEL_PROVIDERS.map((provider) => (
            <Card 
              key={provider.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedProvider === provider.id 
                  ? `ring-2 ring-offset-2 terminagent-glow bg-gradient-to-br ${provider.color} text-white` 
                  : 'hover:shadow-lg'
              }`}
              onClick={() => setSelectedProvider(provider.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  {provider.icon}
                </div>
                <h3 className="font-semibold">{provider.name}</h3>
                <p className="text-xs opacity-80 mt-1">{provider.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chat & Text
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Image Generation
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Code & Development
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Generation Settings
                </CardTitle>
                <CardDescription>
                  Configure your AI generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Selected Provider</Label>
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${currentProvider?.color} text-white`}>
                    <div className="flex items-center gap-2">
                      {currentProvider?.icon}
                      <span className="font-semibold">{currentProvider?.name}</span>
                    </div>
                    <p className="text-sm opacity-90 mt-1">{currentProvider?.description}</p>
                  </div>
                </div>

                <div>
                  <Label>Capabilities</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentProvider?.capabilities.map((capability) => (
                      <Badge key={capability} variant="secondary" className="text-xs">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProvider === 'openai' && (
                        <>
                          <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                          <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                          <SelectItem value="o3">O3 (Reasoning)</SelectItem>
                          <SelectItem value="o4-mini">O4 Mini</SelectItem>
                        </>
                      )}
                      {selectedProvider === 'google' && (
                        <>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                          <SelectItem value="gemini-ultra">Gemini Ultra</SelectItem>
                        </>
                      )}
                      {selectedProvider === 'flux' && (
                        <SelectItem value="flux-schnell">FLUX.1 Schnell</SelectItem>
                      )}
                      {selectedProvider === 'deepsolana' && (
                        <SelectItem value="deepsolana-v1">DeepSolana v1</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tools & Capabilities</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {TOOLS.map((tool) => (
                      <Button
                        key={tool.id}
                        variant={selectedTools.includes(tool.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTool(tool.id)}
                        className="justify-start"
                      >
                        {tool.icon}
                        <span className="ml-2 text-xs">{tool.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={generateContent}
                  disabled={isGenerating || !prompt.trim()}
                  className={`w-full bg-gradient-to-r ${currentProvider?.color} hover:opacity-90`}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with {currentProvider?.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Generated Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Generated Content</CardTitle>
                <CardDescription>
                  Your AI creations will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedContent.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="floating-particle">
                      <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    </div>
                    <p>No content generated yet</p>
                    <p className="text-sm">Create your first AI masterpiece!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedContent.map((content) => (
                      <div key={content.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`bg-gradient-to-r ${MODEL_PROVIDERS.find(p => p.id === content.provider)?.color}`}>
                              {content.provider.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {content.model}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(content.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadContent(content)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="text-sm font-medium text-muted-foreground">
                          Prompt: {content.prompt}
                        </div>

                        {content.type === 'image' ? (
                          <div className="relative group">
                            <div className="relative overflow-hidden rounded-lg">
                              <img
                                src={content.content}
                                alt={content.prompt}
                                className="w-full h-auto image-reveal"
                              />
                              <div className="image-blur-overlay" />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted rounded-lg p-4">
                            <pre className="text-sm whitespace-pre-wrap font-mono">
                              {content.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
