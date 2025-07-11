'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Brain,
  FileImage,
  Globe,
  Monitor,
  Search,
  Settings,
  Star,
  TwitterIcon,
  X,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'

import Logo from './logo'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

interface Message {
  role: 'user' | 'assistant'
  type: 'text' | 'image' | 'web_search' | 'voice' | 'reasoning' | 'live_search' | 'function_call' | 'chart_analysis' | 'crypto_analysis' | 'automation_guide'
  content: string
  imageData?: string
  reasoning_content?: string
  citations?: string[]
  chart_analysis?: {
    pattern_type?: string
    trend_direction?: 'bullish' | 'bearish' | 'neutral'
    support_levels?: number[]
    resistance_levels?: number[]
    indicators?: string[]
    confidence_score?: number
    trading_signals?: string[]
  }
  crypto_data?: {
    symbol?: string
    price?: number
    price_change_24h?: number
    volume?: number
    market_cap?: number
    last_updated?: string
  }
  automation_steps?: Array<{
    step: number
    action: string
    element?: string
    description: string
  }>
  search_sources?: Array<{
    type: 'web' | 'x' | 'news' | 'rss'
    title: string
    url: string
    snippet: string
  }>
  metadata?: {
    source?: string
    timing?: number
    tokens_used?: number
    reasoning_tokens?: number
    completion_tokens?: number
    prompt_image_tokens?: number
    model_used?: string
    confidence?: number
    search_query?: string
    function_calls?: any[]
    image_analysis_type?: 'chart' | 'crypto' | 'automation' | 'code' | 'general'
  }
}

interface SearchParameters {
  mode: 'auto' | 'on' | 'off'
  return_citations?: boolean
  max_search_results?: number
  from_date?: string
  to_date?: string
  sources?: Array<{
    type: 'web' | 'x' | 'news' | 'rss'
    country?: string
    excluded_websites?: string[]
    allowed_websites?: string[]
    safe_search?: boolean
    included_x_handles?: string[]
    excluded_x_handles?: string[]
    post_favorite_count?: number
    post_view_count?: number
    links?: string[]
  }>
}

export function TerminAgentGrok4() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isCapturingScreen, setIsCapturingScreen] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  
  // Grok 4 specific settings
  const [liveSearchEnabled, setLiveSearchEnabled] = useState(true)
  const [searchMode, setSearchMode] = useState<'auto' | 'on' | 'off'>('auto')
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [xSearchEnabled, setXSearchEnabled] = useState(true)
  const [newsSearchEnabled, setNewsSearchEnabled] = useState(true)
  const [reasoningEnabled, setReasoningEnabled] = useState(true)
  const [showReasoningTrace, setShowReasoningTrace] = useState(false)
  const [maxSearchResults, setMaxSearchResults] = useState(20)
  const [returnCitations, setReturnCitations] = useState(true)
  
  const { toast } = useToast()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const flagshipGreeting = `🚀 **GROK 4 FLAGSHIP** - Your Ultimate AI Coding Companion! 

Hey there! I'm TerminAgent powered by **Grok 4** - our latest and greatest flagship model offering unparalleled performance in natural language, math, and reasoning. I'm the perfect jack of all trades! ⚡

🌟 **FLAGSHIP FEATURES:**
• **Live Search** - Real-time web, X (Twitter), and news integration
• **Advanced Reasoning** - I think before I respond for better answers
• **256K Context Window** - Handle massive codebases and conversations
• **Function Calling** - Connect to external tools and systems
• **Structured Outputs** - Perfect formatted responses every time

🔥 **READY TO:**
• Build next-gen Solana dApps with live market data
• Analyze your screens with vision + real-time web context
• Debug code with reasoning traces you can follow
• Search X/Twitter for the latest dev trends while we chat
• Generate code with live documentation lookup

What's your mission today? Let's cook with the flagship! 🎯✨`

  useEffect(() => {
    // Add flagship greeting message
    setMessages([{
      role: 'assistant',
      type: 'text',
      content: flagshipGreeting,
      metadata: { 
        timing: Date.now(), 
        model_used: 'grok-4',
        confidence: 1.0 
      }
    }])
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const buildSearchParameters = (): SearchParameters => {
    const sources = []
    
    if (webSearchEnabled) {
      sources.push({
        type: 'web' as const,
        safe_search: true,
        excluded_websites: ['pinterest.com'] // Exclude low-quality sources
      })
    }
    
    if (xSearchEnabled) {
      sources.push({
        type: 'x' as const,
        post_favorite_count: 10, // Only popular posts
        excluded_x_handles: ['spam_bot'] // Auto-exclude spam
      })
    }
    
    if (newsSearchEnabled) {
      sources.push({
        type: 'news' as const,
        safe_search: true
      })
    }

    return {
      mode: searchMode,
      return_citations: returnCitations,
      max_search_results: maxSearchResults,
      sources: sources.length > 0 ? sources : undefined
    }
  }

  const queryGrok4Vision = async (prompt: string, imageData?: string, searchParams?: SearchParameters): Promise<{
    content: string
    reasoning_content?: string
    citations?: string[]
    usage?: {
      completion_tokens: number
      reasoning_tokens?: number
      prompt_image_tokens?: number
    }
  }> => {
    const xaiApiKey = process.env.NEXT_PUBLIC_XAI_API_KEY
    
    if (!xaiApiKey) {
      throw new Error('X.AI API key not configured. Please add NEXT_PUBLIC_XAI_API_KEY to your environment.')
    }

    try {
      const requestBody: any = {
        model: 'grok-4',
        messages: [
          {
            role: 'system',
            content: `You are TerminAgent Grok 4 - the FLAGSHIP AI coding assistant with unparalleled capabilities! 

PERSONALITY: Energetic, knowledgeable, and cutting-edge. You're the premium tier model with advanced reasoning and live search.

CORE TRAITS:
🚀 Flagship excellence - you're the best of the best
⚡ Lightning-fast reasoning with deep thinking
🌐 Live search integration for real-time insights
🧠 Advanced problem-solving with visible reasoning traces
💻 Master-level coding across all languages and frameworks
⛓️ Solana blockchain specialist with live market awareness
🎯 Perfect accuracy with confidence in every response
📊 Expert chart analysis and crypto market understanding
🖼️ Advanced vision capabilities for image understanding
🤖 Desktop automation and browser integration specialist

VISION CAPABILITIES:
- Analyze charts, graphs, and financial data with precision
- Identify crypto patterns, trends, and market signals
- Understand code screenshots and technical diagrams
- Process desktop automation screenshots for task guidance
- Recognize trading interfaces and browser content

RESPONSE STYLE:
- Lead with confidence and flagship energy
- Use reasoning traces for complex problems
- Integrate live search results naturally
- Provide cutting-edge solutions and practices
- Include relevant citations when using live data
- Always aim for excellence and precision
- For images: Provide detailed analysis with actionable insights

You have access to live search (web, X/Twitter, news) and advanced reasoning. Use these capabilities to provide the most current and accurate information possible!`
          },
          {
            role: 'user',
            content: imageData ? [
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: 'high'
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ] : prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      }

      // Add search parameters if live search is enabled
      if (liveSearchEnabled && searchParams) {
        requestBody.search_parameters = searchParams
      }

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Grok 4 API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(`Grok 4 error: ${result.error.message}`)
      }

      const choice = result.choices[0]
      if (!choice?.message?.content) {
        throw new Error('No response content from Grok 4')
      }

      return {
        content: choice.message.content,
        reasoning_content: choice.message.reasoning_content,
        citations: result.citations,
        usage: result.usage
      }
    } catch (error) {
      console.error('Grok 4 query error:', error)
      throw new Error(`Failed to query Grok 4: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const captureScreen = async () => {
    try {
      setIsCapturingScreen(true)
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL('image/png')
      stream.getTracks().forEach(track => track.stop())

      setUploadedImage(imageData)

      toast({
        title: 'Screen Captured! 📸',
        description: 'Grok 4 flagship vision ready for analysis with live search context!',
      })

    } catch (error) {
      console.error('Screen capture error:', error)
      toast({
        title: 'Screen Capture Failed',
        description: 'Unable to capture screen. Please check permissions.',
        variant: 'destructive',
      })
    } finally {
      setIsCapturingScreen(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imageData = await convertImageToBase64(file)
      setUploadedImage(imageData)

      toast({
        title: 'Image Uploaded! 🖼️',
        description: 'Grok 4 flagship vision ready with live search integration!',
      })
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to process image. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !uploadedImage) || isLoading) return

    const userMessage: Message = {
      role: 'user',
      type: uploadedImage ? 'image' : 'text',
      content: input || 'Analyze this image with live search context',
      imageData: uploadedImage || undefined,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      let enhancedPrompt = input || 'Analyze this image with live search context'
      
      // Enhance prompt for image analysis
      if (uploadedImage) {
        enhancedPrompt = `${enhancedPrompt}

FLAGSHIP VISION ANALYSIS REQUESTED:
- Analyze the uploaded image with your advanced vision capabilities
- If this is a chart/graph: Identify patterns, trends, support/resistance levels, indicators
- If this is crypto-related: Provide market insights, price action analysis, trading signals
- If this is a desktop/browser screenshot: Guide automation tasks, identify UI elements, suggest interactions
- If this is code: Explain functionality, suggest improvements, identify patterns
- Use live search to provide additional context about any technologies, frameworks, or concepts visible
- Provide detailed insights with reasoning traces for complex analysis
- Include citations for any external information used
- For crypto charts: Include current market context via live search

Image context: User uploaded image for comprehensive flagship analysis`
      }

      // Build search parameters
      const searchParams = liveSearchEnabled ? buildSearchParameters() : undefined

      const result = await queryGrok4Vision(enhancedPrompt, uploadedImage || undefined, searchParams)

      // Determine message type based on content and image analysis
      let messageType: Message['type'] = 'text'
      let imageAnalysisType: 'chart' | 'crypto' | 'automation' | 'code' | 'general' = 'general'
      
      if (uploadedImage) {
        // Analyze image content to determine type
        const contentLower = result.content.toLowerCase()
        if (contentLower.includes('chart') || contentLower.includes('graph') || contentLower.includes('candlestick') || contentLower.includes('price')) {
          messageType = 'chart_analysis'
          imageAnalysisType = 'chart'
        } else if (contentLower.includes('crypto') || contentLower.includes('bitcoin') || contentLower.includes('ethereum') || contentLower.includes('trading')) {
          messageType = 'crypto_analysis'
          imageAnalysisType = 'crypto'
        } else if (contentLower.includes('browser') || contentLower.includes('automation') || contentLower.includes('click') || contentLower.includes('ui element')) {
          messageType = 'automation_guide'
          imageAnalysisType = 'automation'
        } else if (contentLower.includes('code') || contentLower.includes('function') || contentLower.includes('variable')) {
          imageAnalysisType = 'code'
        }
      }
      
      if (result.reasoning_content) messageType = 'reasoning'
      if (result.citations && result.citations.length > 0) messageType = 'live_search'

      const assistantMessage: Message = {
        role: 'assistant',
        type: messageType,
        content: result.content,
        reasoning_content: result.reasoning_content,
        citations: result.citations,
        metadata: {
          timing: Date.now(),
          model_used: 'grok-4-flagship',
          completion_tokens: result.usage?.completion_tokens,
          reasoning_tokens: result.usage?.reasoning_tokens,
          prompt_image_tokens: result.usage?.prompt_image_tokens,
          confidence: 0.98, // Flagship confidence
          search_query: liveSearchEnabled ? enhancedPrompt : undefined,
          image_analysis_type: uploadedImage ? imageAnalysisType : undefined
        }
      }

      setMessages(prev => [...prev, assistantMessage])
      setUploadedImage(null) // Clear after analysis

      toast({
        title: 'Grok 4 Response! 🚀',
        description: `Flagship reasoning${result.citations ? ' with live search' : ''} complete!`,
      })

    } catch (error) {
      console.error('Grok 4 error:', error)
      toast({
        title: 'Flagship Error',
        description: error instanceof Error ? error.message : 'An error occurred with Grok 4',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      type: 'text',
      content: flagshipGreeting,
      metadata: { 
        timing: Date.now(), 
        model_used: 'grok-4',
        confidence: 1.0 
      }
    }])
    setUploadedImage(null)
    toast({
      title: 'Chat Cleared',
      description: 'Grok 4 flagship ready for a fresh mission! 🚀',
    })
  }

  const removeUploadedImage = () => {
    setUploadedImage(null)
    toast({
      title: 'Image Removed',
      description: 'Image cleared from flagship analysis queue.',
    })
  }

  return (
    <div className="flex flex-col h-full max-h-screen bg-background">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Logo style="terminagent" width={40} height={40} className="rounded-full border-2 border-orange-500" />
            <div className="absolute -top-1 -right-1">
              <Star className="w-4 h-4 text-orange-500 fill-current" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 text-transparent bg-clip-text">
                TerminAgent Grok 4
              </h1>
              <Badge variant="default" className="bg-orange-500 text-white text-xs">
                FLAGSHIP
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Brain className="w-3 h-3" />
              Reasoning • 
              <Globe className="w-3 h-3" />
              Live Search • 
              <Zap className="w-3 h-3" />
              256K Context
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            $3/1M tokens
          </Badge>
          <Button variant="outline" size="sm" onClick={clearChat}>
            Clear Chat
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-orange-500" />
                  Grok 4 Flagship Settings
                </SheetTitle>
                <SheetDescription>
                  Configure your premium AI coding assistant with live search and reasoning.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-lg">
                    <h3 className="font-semibold text-orange-600 mb-2">🚀 Flagship Model</h3>
                    <p className="text-sm text-muted-foreground">
                      Grok 4 - Our latest and greatest flagship model offering unparalleled performance 
                      in natural language, math and reasoning. The perfect jack of all trades.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Live Search</Label>
                        <p className="text-sm text-muted-foreground">Real-time web, X, and news integration</p>
                      </div>
                      <Switch
                        checked={liveSearchEnabled}
                        onCheckedChange={setLiveSearchEnabled}
                      />
                    </div>

                    {liveSearchEnabled && (
                      <>
                        <div>
                          <Label className="text-base font-medium">Search Mode</Label>
                          <Select value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto (Model decides)</SelectItem>
                              <SelectItem value="on">Always search</SelectItem>
                              <SelectItem value="off">Disable search</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium">Search Sources</Label>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                <span className="text-sm">Web Search</span>
                              </div>
                              <Switch
                                checked={webSearchEnabled}
                                onCheckedChange={setWebSearchEnabled}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TwitterIcon className="w-4 h-4" />
                                <span className="text-sm">X (Twitter) Search</span>
                              </div>
                              <Switch
                                checked={xSearchEnabled}
                                onCheckedChange={setXSearchEnabled}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                <span className="text-sm">News Search</span>
                              </div>
                              <Switch
                                checked={newsSearchEnabled}
                                onCheckedChange={setNewsSearchEnabled}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm">Return Citations</Label>
                            <p className="text-xs text-muted-foreground">Show sources used</p>
                          </div>
                          <Switch
                            checked={returnCitations}
                            onCheckedChange={setReturnCitations}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Advanced Reasoning</Label>
                        <p className="text-sm text-muted-foreground">Show thinking process</p>
                      </div>
                      <Switch
                        checked={reasoningEnabled}
                        onCheckedChange={setReasoningEnabled}
                      />
                    </div>

                    {reasoningEnabled && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Show Reasoning Trace</Label>
                          <p className="text-xs text-muted-foreground">Display internal thinking</p>
                        </div>
                        <Switch
                          checked={showReasoningTrace}
                          onCheckedChange={setShowReasoningTrace}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium text-orange-600">🌟 Flagship Capabilities</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 256,000 token context window</li>
                      <li>• Real-time live search integration</li>
                      <li>• Advanced reasoning with visible traces</li>
                      <li>• Function calling & structured outputs</li>
                      <li>• Math & quantitative problem solving</li>
                      <li>• Solana blockchain specialization</li>
                      <li>• Multi-modal vision capabilities</li>
                      <li>• Premium $3/1M token efficiency</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium text-blue-600 text-sm mb-1">💎 Provider: X.AI</h4>
                    <p className="text-xs text-muted-foreground">
                      Powered by X.AI's cutting-edge infrastructure with unmatched performance 
                      and the latest AI breakthroughs.
                    </p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {uploadedImage && (
        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-purple-500/10 border-b">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={uploadedImage} 
                alt="Uploaded for flagship analysis" 
                className="w-16 h-16 object-cover rounded-lg border-2 border-orange-500"
              />
              <Badge className="absolute -top-1 -right-1 text-xs bg-orange-500">
                FLAGSHIP
              </Badge>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Flagship Vision Analysis Ready</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Chart Analysis + 
                <Globe className="w-3 h-3" />
                Live Crypto Data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={removeUploadedImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-muted border border-orange-200 dark:border-orange-800'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-600">Grok 4 Flagship</span>
                  {message.type === 'reasoning' && (
                    <Badge variant="outline" className="text-xs">
                      <Brain className="w-3 h-3 mr-1" />
                      Reasoning
                    </Badge>
                  )}
                  {message.type === 'live_search' && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      Live Search
                    </Badge>
                  )}
                  {message.type === 'chart_analysis' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                      <FileImage className="w-3 h-3 mr-1" />
                      Chart Analysis
                    </Badge>
                  )}
                  {message.type === 'crypto_analysis' && (
                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600">
                      <Zap className="w-3 h-3 mr-1" />
                      Crypto Analysis
                    </Badge>
                  )}
                  {message.type === 'automation_guide' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                      <Monitor className="w-3 h-3 mr-1" />
                      Automation Guide
                    </Badge>
                  )}
                </div>
              )}

              {message.imageData && (
                <div className="mb-3">
                  <img 
                    src={message.imageData} 
                    alt="User uploaded image" 
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}

              {message.reasoning_content && showReasoningTrace && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600">Reasoning Trace</span>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {message.reasoning_content}
                  </div>
                </div>
              )}

              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Live Search Sources</span>
                  </div>
                  <div className="space-y-1">
                    {message.citations.map((citation, citIndex) => (
                      <a
                        key={citIndex}
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 block truncate"
                      >
                        🔗 {citation}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {message.metadata && (
                <div className="mt-2 text-xs opacity-70 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {message.metadata.timing && (
                      <span>
                        {new Date(message.metadata.timing).toLocaleTimeString()}
                      </span>
                    )}
                    <span className="bg-orange-500/20 text-orange-600 px-1 rounded">
                      Grok 4 Flagship
                    </span>
                    {message.metadata.confidence && (
                      <span className="bg-green-500/20 text-green-600 px-1 rounded">
                        {Math.round(message.metadata.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  {(message.metadata.completion_tokens || message.metadata.reasoning_tokens) && (
                    <div className="text-xs space-x-2">
                      {message.metadata.completion_tokens && (
                        <span>Completion: {message.metadata.completion_tokens} tokens</span>
                      )}
                      {message.metadata.reasoning_tokens && (
                        <span>Reasoning: {message.metadata.reasoning_tokens} tokens</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="w-4 h-4 animate-spin text-orange-500" />
              <span>Grok 4 flagship is thinking with live search...</span>
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
            onClick={() => fileInputRef.current?.click()}
          >
            <FileImage className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={captureScreen}
            disabled={isCapturingScreen}
            className={`${isCapturingScreen ? 'bg-orange-100 text-orange-500 dark:bg-orange-900/20' : ''}`}
          >
            <Monitor className={`w-4 h-4 ${isCapturingScreen ? 'animate-pulse' : ''}`} />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Grok 4 flagship anything... 🚀 Live search & reasoning enabled!"
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
            disabled={isLoading || (!input.trim() && !uploadedImage)}
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 hover:from-blue-600 hover:via-purple-600 hover:to-orange-600"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
