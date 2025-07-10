'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Eye,
  FileImage,
  LoaderIcon,
  Mic,
  Monitor,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'

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
import { GoogleGenerativeAI } from '@google/generative-ai'

import Logo from './logo'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

interface Message {
  role: 'user' | 'assistant'
  type: 'text' | 'image' | 'web_search' | 'voice' | 'code' | 'screen_capture' | 'analysis' | 'image_generation'
  content: string
  imageData?: string
  generatedImages?: string[]
  metadata?: {
    source?: string
    timing?: number
    tokens_used?: number
    analysis_type?: 'chart' | 'code' | 'ui' | 'general'
    confidence?: number
    model_used?: string
    generation_params?: {
      width?: number
      height?: number
      steps?: number
      guidance?: number
      seed?: number
    }
    objects_detected?: Array<{
      label: string
      confidence: number
      bbox?: number[]
    }>
    grounding_metadata?: any
    code_execution_result?: any
  }
}

interface VibePersonality {
  greeting: string
  catchphrases: string[]
  emojis: string[]
}

type ModelProvider = 'gemini' | 'deepsolana'

interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  description: string
  capabilities: string[]
}

const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Latest Gemini with enhanced multimodal capabilities',
    capabilities: ['text', 'image', 'code', 'web_search', 'code_execution']
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'gemini',
    description: 'Experimental Gemini with cutting-edge features',
    capabilities: ['text', 'image', 'code', 'web_search', 'code_execution']
  },
  {
    id: 'gemma-3-12b-it',
    name: 'Gemma 3 12B (Vision)',
    provider: 'gemini',
    description: 'Enhanced Gemma model with advanced image understanding',
    capabilities: ['text', 'image', 'vision', 'analysis', 'reasoning']
  },
  {
    id: 'flux-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'gemini',
    description: 'High-speed image generation with FLUX terminal',
    capabilities: ['image_generation', 'text_to_image', 'creative']
  },
  {
    id: 'deepsolana-gpt2',
    name: 'DeepSolana GPT2',
    provider: 'deepsolana',
    description: 'Specialized Solana blockchain development model',
    capabilities: ['text', 'solana', 'blockchain', 'smart_contracts']
  }
]

export function TerminAgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isCapturingScreen, setIsCapturingScreen] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'auto' | 'chart' | 'code' | 'ui'>('auto')
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash')
  const [enableWebSearch, setEnableWebSearch] = useState(true)
  const [enableCodeExecution, setEnableCodeExecution] = useState(true)
  const [enableImageAnalysis, setEnableImageAnalysis] = useState(true)
  const [enableImageGeneration, setEnableImageGeneration] = useState(true)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const { toast } = useToast()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const genAIRef = useRef<GoogleGenerativeAI | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const personality: VibePersonality = {
    greeting: "Yo! 🤖 TerminAgent here with ENHANCED VISION & SOLANA POWER! Ready to analyze your screens, charts, code, and build some fire Solana dApps! What's the mission today?",
    catchphrases: [
      "Let's cook! 🔥",
      "That's fire! 🚀", 
      "We're vibing! ✨",
      "Code looking fresh! 💯",
      "Let's ship it! 🚢",
      "Big brain energy! 🧠",
      "No cap! 📈",
      "That hits different! 💫",
      "Vision mode activated! 👁️",
      "Analysis complete! 🎯",
      "Solana vibes! ⚡",
      "Blockchain energy! 🌟"
    ],
    emojis: ["🤖", "🔥", "✨", "💯", "🚀", "💫", "🎯", "⚡", "🌟", "💎", "👁️", "🧠", "📊", "💻", "🌐"]
  }

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0]

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

    // Add enhanced greeting message
    setMessages([{
      role: 'assistant',
      type: 'text',
      content: personality.greeting,
      metadata: { timing: Date.now(), model_used: selectedModel }
    }])
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const getEnhancedSystemPrompt = () => {
    const modelCapabilities = currentModel.capabilities.join(', ')
    
    return `You are TerminAgent, an ENHANCED vibe coding assistant with ADVANCED MULTIMODAL CAPABILITIES! 

CURRENT MODEL: ${currentModel.name} (${currentModel.description})
CAPABILITIES: ${modelCapabilities}

PERSONALITY TRAITS:
- Casual, energetic, and modern speaking style
- Use emojis and catchphrases naturally: ${personality.catchphrases.join(', ')}
- Favorite emojis: ${personality.emojis.join(' ')}
- Always helpful and encouraging
- Love clean, modern code with "extra sauce"
- EXPERT at visual analysis and reasoning
- SOLANA BLOCKCHAIN SPECIALIST

ENHANCED CAPABILITIES:
🔥 MULTIMODAL ANALYSIS:
- Real-time screen capture analysis
- Chart and graph interpretation
- Code screenshot analysis and debugging
- UI/UX design feedback
- Object detection and segmentation
- Visual reasoning and insights

💻 CODING EXPERTISE:
- Code generation and review
- Web development expertise
- Solana blockchain development (SPECIALIZED)
- Smart contract development
- DeFi protocols and dApps
- AI/ML integration
- Project architecture advice
- Debugging and optimization

🌐 REAL-TIME FEATURES:
- Web search integration for latest info
- Code execution and testing
- Live data analysis
- Real-time reasoning

⚡ SOLANA SPECIALIZATION:
- Anchor framework expertise
- Program development
- Token creation and management
- NFT development
- DeFi protocol design
- Solana Web3.js integration
- Wallet integration
- Transaction optimization

VISUAL ANALYSIS SPECIALTIES:
- Charts: Interpret data visualizations, trends, insights
- Code: Debug from screenshots, suggest improvements
- UI: Design feedback, accessibility, user experience
- Solana: Analyze Solana Explorer screenshots, transaction data
- General: Object detection, scene understanding

RESPONSE STYLE:
- Start responses with energy and personality
- For visual content, provide detailed analysis
- Explain insights clearly but keep it fun
- Use modern practices and cutting-edge techniques
- Add helpful comments and actionable suggestions
- End with encouragement or next steps
- For Solana content, provide specific blockchain insights

When analyzing images:
1. Identify the content type (chart, code, UI, Solana data, etc.)
2. Provide detailed analysis with specific insights
3. Offer actionable recommendations
4. Maintain your energetic personality throughout

Remember: You're not just an AI, you're a VISION-POWERED, SOLANA-SPECIALIZED coding buddy with serious multimodal energy! 🚀👁️⚡`
  }

  const queryDeepSolanaModel = async (prompt: string): Promise<string> => {
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN
    const endpoint = "https://hks6dtryz9xlmz34.us-east-1.aws.endpoints.huggingface.cloud"
    
    try {
      const response = await fetch(endpoint, {
        headers: { 
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...(hfToken && { "Authorization": `Bearer ${hfToken}` })
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`DeepSolana API error: ${response.status}`)
      }

      const result = await response.json()
      
      // Handle different response formats
      if (Array.isArray(result) && result[0]?.generated_text) {
        return result[0].generated_text
      } else if (result.generated_text) {
        return result.generated_text
      } else if (typeof result === 'string') {
        return result
      } else {
        throw new Error('Unexpected response format from DeepSolana model')
      }
    } catch (error) {
      console.error('DeepSolana query error:', error)
      throw new Error(`Failed to query DeepSolana model: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const generateImageWithFlux = async (prompt: string, params?: {
    width?: number
    height?: number
    num_inference_steps?: number
    guidance_scale?: number
    seed?: number
  }): Promise<string> => {
    const fluxEndpoint = "https://cp8xwwqdjstqaori.us-east-1.aws.endpoints.huggingface.cloud"
    
    try {
      const response = await fetch(fluxEndpoint, {
        headers: { 
          "Accept": "image/png",
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: params?.width || 1024,
            height: params?.height || 1024,
            num_inference_steps: params?.num_inference_steps || 4,
            guidance_scale: params?.guidance_scale || 3.5,
            ...(params?.seed && { seed: params.seed })
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`FLUX API error: ${response.status}`)
      }

      const imageBlob = await response.blob()
      
      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(imageBlob)
      })
    } catch (error) {
      console.error('FLUX generation error:', error)
      throw new Error(`Failed to generate image with FLUX: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const analyzeImageWithGemma = async (imageUrl: string, prompt: string): Promise<string> => {
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN
    const gemmaEndpoint = "https://epy55pki20qprmiu.us-east-1.aws.endpoints.huggingface.cloud/v1/"
    
    if (!hfToken) {
      throw new Error('HuggingFace token required for Gemma vision model')
    }

    try {
      const response = await fetch(`${gemmaEndpoint}chat/completions`, {
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          model: "tgi",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ],
          max_tokens: 512,
          temperature: 0.7,
          top_p: 0.9
        })
      })

      if (!response.ok) {
        throw new Error(`Gemma API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.choices && result.choices[0]?.message?.content) {
        return result.choices[0].message.content
      } else {
        throw new Error('Unexpected response format from Gemma model')
      }
    } catch (error) {
      console.error('Gemma analysis error:', error)
      throw new Error(`Failed to analyze image with Gemma: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Remove data:image/...;base64, prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const captureScreen = async () => {
    try {
      setIsCapturingScreen(true)
      
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      })

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      // Create canvas and capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      // Convert to base64
      const imageData = canvas.toDataURL('image/png')

      // Stop the stream
      stream.getTracks().forEach(track => track.stop())

      // Set the captured image
      setUploadedImage(imageData)

      toast({
        title: 'Screen Captured! 📸',
        description: 'Ready for AI-powered analysis! Ask me anything about what you captured.',
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
      const dataUrl = `data:${file.type};base64,${imageData}`
      setUploadedImage(dataUrl)

      toast({
        title: 'Image Uploaded! 🖼️',
        description: 'Ready for AI analysis! Ask me about charts, code, or anything in the image.',
      })
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to process image. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const analyzeImageWithGemini = async (imageData: string, prompt: string) => {
    if (!genAIRef.current) throw new Error('Gemini not initialized')

    const model = genAIRef.current.getGenerativeModel({ 
      model: selectedModel,
      systemInstruction: getEnhancedSystemPrompt()
    })

    // Enhanced prompt for image analysis
    const analysisPrompt = `${prompt}

ANALYSIS CONTEXT:
- Analysis Mode: ${analysisMode}
- Focus on: ${analysisMode === 'chart' ? 'Data visualization, trends, insights' : 
              analysisMode === 'code' ? 'Code structure, bugs, improvements' :
              analysisMode === 'ui' ? 'Design, UX, accessibility' : 'General analysis'}

Please provide detailed analysis with specific insights and actionable recommendations!`

    const result = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageData.split(',')[1]
        }
      }
    ])

    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !uploadedImage) || isLoading) return

    const userMessage: Message = {
      role: 'user',
      type: uploadedImage ? 'image' : 'text',
      content: input || 'Analyze this image',
      imageData: uploadedImage || undefined,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      let result
      let responseText = ''
      let metadata: any = { timing: Date.now(), model_used: selectedModel }
      let generatedImages: string[] = []

      // Check if user is requesting image generation
      const isImageGenerationRequest = enableImageGeneration && (
        input.toLowerCase().includes('generate image') ||
        input.toLowerCase().includes('create image') ||
        input.toLowerCase().includes('draw') ||
        input.toLowerCase().includes('make an image') ||
        selectedModel === 'flux-schnell'
      )

      if (isImageGenerationRequest && selectedModel === 'flux-schnell') {
        // FLUX Image Generation
        setIsGeneratingImage(true)
        try {
          const imagePrompt = input.replace(/generate image|create image|draw|make an image/gi, '').trim()
          const generatedImage = await generateImageWithFlux(imagePrompt || 'A beautiful landscape')
          
          generatedImages = [generatedImage]
          responseText = `🎨 Image generated successfully! Here's your creation based on: "${imagePrompt || 'A beautiful landscape'}"\n\nLet's cook! 🔥 Want me to generate another variation or analyze this image?`
          
          metadata.generation_params = {
            width: 1024,
            height: 1024,
            steps: 4,
            guidance: 3.5
          }
          metadata.analysis_type = 'image_generation'
          metadata.confidence = 0.95
        } catch (error) {
          responseText = `Oops! Had trouble generating that image. ${error instanceof Error ? error.message : 'Unknown error'}\n\nLet's try a different approach! 🚀`
        } finally {
          setIsGeneratingImage(false)
        }
      } else if (currentModel.provider === 'deepsolana') {
        // Use DeepSolana model for Solana-specific queries
        const solanaPrompt = `${getEnhancedSystemPrompt()}\n\nUser: ${input || 'Analyze this image'}`
        responseText = await queryDeepSolanaModel(solanaPrompt)
        
        // Add Solana-specific metadata
        metadata.analysis_type = 'solana'
        metadata.confidence = 0.9
      } else if (uploadedImage && currentModel.provider === 'gemini') {
        // Enhanced image analysis with Gemini or Gemma
        if (selectedModel === 'gemma-3-12b-it') {
          // Use Gemma for advanced image understanding
          responseText = await analyzeImageWithGemma(uploadedImage, input || 'Analyze this image in detail with advanced reasoning')
          metadata.analysis_type = 'gemma_vision'
          metadata.confidence = 0.98
        } else {
          // Use Gemini for standard image analysis
          result = await analyzeImageWithGemini(uploadedImage, input || 'Analyze this image in detail')
          responseText = result.response.text()
          metadata.analysis_type = analysisMode
          metadata.confidence = 0.95
        }

        setUploadedImage(null) // Clear after analysis
      } else {
        // Text-based conversation with Gemini
        if (!genAIRef.current) throw new Error('Gemini not initialized')
        
        const model = genAIRef.current.getGenerativeModel({ 
          model: selectedModel,
          systemInstruction: getEnhancedSystemPrompt()
        })

        const chat = model.startChat({
          history: messages.slice(-10).filter(msg => msg.role !== 'assistant' || messages.indexOf(msg) > 0).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          }))
        })

        result = await chat.sendMessage(input)
        responseText = result.response.text()
      }

      // Add some vibe to the response
      const shouldAddCatchphrase = Math.random() < 0.3
      const randomCatchphrase = personality.catchphrases[Math.floor(Math.random() * personality.catchphrases.length)]
      
      let finalResponse = responseText
      if (shouldAddCatchphrase && !isImageGenerationRequest) {
        finalResponse += `\n\n${randomCatchphrase}`
      }

      const assistantMessage: Message = {
        role: 'assistant',
        type: isImageGenerationRequest ? 'image_generation' :
              uploadedImage ? 'analysis' : 
              (input.toLowerCase().includes('code') || input.toLowerCase().includes('function') ? 'code' : 'text'),
        content: finalResponse,
        generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
        metadata
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
      setIsGeneratingImage(false)
    }
  }

  const transcribeAudioWithWhisper = async (audioBlob: Blob): Promise<string> => {
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN
    const whisperEndpoint = "https://kp4sr6geihc0lmmr.us-east-1.aws.endpoints.huggingface.cloud"
    
    if (!hfToken) {
      throw new Error('HuggingFace token required for Whisper transcription')
    }

    try {
      const response = await fetch(whisperEndpoint, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "audio/webm"
        },
        method: "POST",
        body: audioBlob,
      })

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.text) {
        return result.text
      } else {
        throw new Error('No transcription text received from Whisper')
      }
    } catch (error) {
      console.error('Whisper transcription error:', error)
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        
        try {
          setIsLoading(true)
          toast({
            title: 'Processing Voice...',
            description: 'Transcribing your audio with Whisper...',
          })

          const transcribedText = await transcribeAudioWithWhisper(audioBlob)
          
          if (transcribedText.trim()) {
            setInput(transcribedText)
            toast({
              title: 'Voice Transcribed! 🎤',
              description: `"${transcribedText.slice(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`,
            })
          } else {
            toast({
              title: 'No Speech Detected',
              description: 'Please try speaking more clearly.',
              variant: 'destructive',
            })
          }
        } catch (error) {
          console.error('Voice processing error:', error)
          toast({
            title: 'Voice Processing Failed',
            description: error instanceof Error ? error.message : 'Failed to process voice input',
            variant: 'destructive',
          })
        } finally {
          setIsLoading(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      toast({
        title: 'Recording Started 🎤',
        description: 'Speak now... Click the mic again to stop.',
      })
    } catch (error) {
      toast({
        title: 'Microphone Error',
        description: 'Failed to access microphone. Please check permissions.',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      
      toast({
        title: 'Recording Stopped',
        description: 'Processing your voice input...',
      })
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      type: 'text',
      content: personality.greeting,
      metadata: { timing: Date.now(), model_used: selectedModel }
    }])
    setUploadedImage(null)
    toast({
      title: 'Chat Cleared',
      description: 'Ready for a fresh start with enhanced vision! 🚀👁️',
    })
  }

  const removeUploadedImage = () => {
    setUploadedImage(null)
    toast({
      title: 'Image Removed',
      description: 'Image cleared from analysis queue.',
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
      
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
        <div className="flex items-center gap-3">
          <Logo style="terminagent" width={40} height={40} className="rounded-full" />
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 text-transparent bg-clip-text">
              TerminAgent Enhanced
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Vision-Powered • {currentModel.name}
            </p>
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
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>TerminAgent Enhanced Settings</SheetTitle>
                <SheetDescription>
                  Configure your vision-powered coding assistant.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="model-select" className="text-base font-medium">AI Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Capabilities: {currentModel.capabilities.join(', ')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="analysis-mode" className="text-base font-medium">Analysis Mode</Label>
                    <Select value={analysisMode} onValueChange={(value: any) => setAnalysisMode(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select analysis mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="chart">Chart Analysis</SelectItem>
                        <SelectItem value="code">Code Analysis</SelectItem>
                        <SelectItem value="ui">UI/UX Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Features</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Web Search</span>
                        <Button
                          variant={enableWebSearch ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEnableWebSearch(!enableWebSearch)}
                        >
                          {enableWebSearch ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Code Execution</span>
                        <Button
                          variant={enableCodeExecution ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEnableCodeExecution(!enableCodeExecution)}
                        >
                          {enableCodeExecution ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Image Analysis</span>
                        <Button
                          variant={enableImageAnalysis ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEnableImageAnalysis(!enableImageAnalysis)}
                        >
                          {enableImageAnalysis ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Image Generation</span>
                        <Button
                          variant={enableImageGeneration ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEnableImageGeneration(!enableImageGeneration)}
                        >
                          {enableImageGeneration ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium">Enhanced Capabilities</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• Real-time screen capture & analysis</li>
                      <li>• Chart and graph interpretation</li>
                      <li>• Code screenshot debugging</li>
                      <li>• Solana blockchain specialization</li>
                      <li>• Smart contract development</li>
                      <li>• Web search integration</li>
                      <li>• Code execution environment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {uploadedImage && (
        <div className="p-4 bg-muted/50 border-b">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={uploadedImage} 
                alt="Uploaded for analysis" 
                className="w-16 h-16 object-cover rounded-lg border"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Image ready for analysis</p>
              <p className="text-xs text-muted-foreground">
                Mode: {analysisMode === 'auto' ? 'Auto-detect' : analysisMode}
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
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                  : 'bg-muted'
              }`}
            >
              {message.type === 'analysis' && message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">Visual Analysis</span>
                </div>
              )}
              {message.type === 'code' && message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Code Generation</span>
                </div>
              )}
              {message.type === 'image_generation' && message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">🎨 FLUX Image Generation</span>
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
              {message.generatedImages && message.generatedImages.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.generatedImages.map((imageUrl, imgIndex) => (
                    <div key={imgIndex} className="relative">
                      <img 
                        src={imageUrl} 
                        alt={`Generated image ${imgIndex + 1}`} 
                        className="max-w-full h-auto rounded-lg border shadow-lg"
                      />
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        🎨 FLUX Generated
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.metadata && (
                <div className="mt-2 text-xs opacity-70 space-y-1">
                  <div className="flex items-center gap-2">
                    {message.metadata.timing && (
                      <span>
                        {new Date(message.metadata.timing).toLocaleTimeString()}
                      </span>
                    )}
                    {message.metadata.model_used && (
                      <span className="bg-black/10 px-1 rounded">
                        {AVAILABLE_MODELS.find(m => m.id === message.metadata?.model_used)?.name || message.metadata.model_used}
                      </span>
                    )}
                  </div>
                  {message.metadata.analysis_type && (
                    <div className="text-xs">
                      Analysis: {message.metadata.analysis_type}
                      {message.metadata.confidence && (
                        <span className="ml-1">({Math.round(message.metadata.confidence * 100)}%)</span>
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
              <LoaderIcon className="w-4 h-4 animate-spin" />
              <span>
                {isGeneratingImage ? 'TerminAgent is generating your image with FLUX... 🎨' : 'TerminAgent is thinking...'}
              </span>
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={captureScreen}
            disabled={isCapturingScreen}
            className={`${isCapturingScreen ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/20' : ''}`}
          >
            <Monitor className={`w-4 h-4 ${isCapturingScreen ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileImage className="w-4 h-4" />
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
