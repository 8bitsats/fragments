'use client'

import React, { useState } from 'react'

import {
  Brain,
  Copy,
  Download,
  Heart,
  Image as ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Settings,
  Sparkles,
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
import { Slider } from '@/components/ui/slider'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

interface ModelProvider {
  id: string
  name: string
  icon: React.ReactNode
  models: string[]
  capabilities: string[]
  color: string
}

interface GeneratedArtwork {
  id: string
  url: string
  prompt: string
  provider: string
  model: string
  timestamp: number
  liked: boolean
  params: any
}

const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: <Zap className="w-4 h-4" />,
    models: ['dall-e-3', 'dall-e-2'],
    capabilities: ['High Quality', 'Text Rendering', 'Photorealistic'],
    color: 'bg-green-500'
  },
  {
    id: 'google',
    name: 'Google Imagen',
    icon: <Brain className="w-4 h-4" />,
    models: ['imagen-3.0', 'imagen-2.0'],
    capabilities: ['Fast Generation', 'Style Transfer', 'Artistic'],
    color: 'bg-blue-500'
  },
  {
    id: 'flux',
    name: 'FLUX',
    icon: <Sparkles className="w-4 h-4" />,
    models: ['flux-1.1-pro', 'flux-1-schnell', 'flux-1-dev'],
    capabilities: ['Ultra Fast', 'High Resolution', 'Consistent Style'],
    color: 'bg-purple-500'
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    icon: <Palette className="w-4 h-4" />,
    models: ['v6.1', 'v6.0', 'niji-6'],
    capabilities: ['Artistic Style', 'Creative', 'Detailed'],
    color: 'bg-pink-500'
  }
]

const STYLE_PRESETS = [
  'Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Anime/Manga',
  'Cyberpunk', 'Fantasy', 'Minimalist', 'Abstract', 'Vintage', 'Surreal',
  'Pop Art', 'Impressionist', 'Art Nouveau', 'Steampunk', 'Noir'
]

const ASPECT_RATIOS = [
  { name: 'Square', ratio: '1:1', width: 1024, height: 1024 },
  { name: 'Portrait', ratio: '3:4', width: 768, height: 1024 },
  { name: 'Landscape', ratio: '4:3', width: 1024, height: 768 },
  { name: 'Wide', ratio: '16:9', width: 1344, height: 768 },
  { name: 'Tall', ratio: '9:16', width: 768, height: 1344 },
  { name: 'Cinematic', ratio: '21:9', width: 1536, height: 640 }
]

export function AIArtStudio() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(MODEL_PROVIDERS[0])
  const [selectedModel, setSelectedModel] = useState(MODEL_PROVIDERS[0].models[0])
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0])
  const [quality, setQuality] = useState([80])
  const [creativity, setCreativity] = useState([70])
  const [isGenerating, setIsGenerating] = useState(false)
  const [artworks, setArtworks] = useState<GeneratedArtwork[]>([])
  const [activeTab, setActiveTab] = useState('generate')
  const { toast } = useToast()

  const generateArtwork = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a prompt to generate artwork.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)

    try {
      // Simulate API call with different providers
      const enhancedPrompt = selectedStyle 
        ? `${prompt}, ${selectedStyle.toLowerCase()} style`
        : prompt

      // Mock generation - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 3000))

      const newArtwork: GeneratedArtwork = {
        id: Date.now().toString(),
        url: `https://picsum.photos/${selectedRatio.width}/${selectedRatio.height}?random=${Date.now()}`,
        prompt: enhancedPrompt,
        provider: selectedProvider.id,
        model: selectedModel,
        timestamp: Date.now(),
        liked: false,
        params: {
          quality: quality[0],
          creativity: creativity[0],
          aspectRatio: selectedRatio.ratio,
          negativePrompt
        }
      }

      setArtworks(prev => [newArtwork, ...prev])

      toast({
        title: 'Artwork Generated! 🎨',
        description: `Created with ${selectedProvider.name} ${selectedModel}`,
      })

    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate artwork. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleLike = (id: string) => {
    setArtworks(prev => prev.map(artwork => 
      artwork.id === id ? { ...artwork, liked: !artwork.liked } : artwork
    ))
  }

  const downloadArtwork = async (artwork: GeneratedArtwork) => {
    try {
      const response = await fetch(artwork.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-art-${artwork.provider}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Downloaded!',
        description: 'Artwork saved to your downloads folder.',
      })
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download artwork.',
        variant: 'destructive',
      })
    }
  }

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    toast({
      title: 'Copied!',
      description: 'Prompt copied to clipboard.',
    })
  }

  const regenerateWithDifferentProvider = async (artwork: GeneratedArtwork) => {
    const otherProviders = MODEL_PROVIDERS.filter(p => p.id !== artwork.provider)
    const randomProvider = otherProviders[Math.floor(Math.random() * otherProviders.length)]
    
    setSelectedProvider(randomProvider)
    setSelectedModel(randomProvider.models[0])
    setPrompt(artwork.prompt)
    
    toast({
      title: 'Switched Provider',
      description: `Now using ${randomProvider.name} for generation`,
    })
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-animate text-transparent bg-clip-text">
          AI Art Studio
        </h1>
        <p className="text-muted-foreground text-lg">
          Multi-model AI image generation with seamless provider switching
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {MODEL_PROVIDERS.map((provider) => (
            <Badge 
              key={provider.id} 
              variant={selectedProvider.id === provider.id ? "default" : "outline"}
              className={`${selectedProvider.id === provider.id ? provider.color : ''} text-white`}
            >
              {provider.icon}
              <span className="ml-1">{provider.name}</span>
            </Badge>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="gallery">Gallery ({artworks.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generation Controls */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="terminagent-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Creation Studio
                  </CardTitle>
                  <CardDescription>
                    Configure your AI artwork generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select 
                      value={selectedProvider.id} 
                      onValueChange={(value) => {
                        const provider = MODEL_PROVIDERS.find(p => p.id === value)!
                        setSelectedProvider(provider)
                        setSelectedModel(provider.models[0])
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_PROVIDERS.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <div className="flex items-center gap-2">
                              {provider.icon}
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedProvider.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
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
                        {selectedProvider.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Describe your artistic vision..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="style">Style Preset</Label>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a style (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Style</SelectItem>
                        {STYLE_PRESETS.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ratio">Aspect Ratio</Label>
                    <Select 
                      value={selectedRatio.name} 
                      onValueChange={(value) => {
                        const ratio = ASPECT_RATIOS.find(r => r.name === value)!
                        setSelectedRatio(ratio)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((ratio) => (
                          <SelectItem key={ratio.name} value={ratio.name}>
                            {ratio.name} ({ratio.ratio})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quality: {quality[0]}%</Label>
                    <Slider
                      value={quality}
                      onValueChange={setQuality}
                      min={10}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Creativity: {creativity[0]}%</Label>
                    <Slider
                      value={creativity}
                      onValueChange={setCreativity}
                      min={10}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="negative-prompt">Negative Prompt</Label>
                    <Textarea
                      id="negative-prompt"
                      placeholder="What to avoid..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <Button
                    onClick={generateArtwork}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full gradient-animate text-white border-0"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Art...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Generate Artwork
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Latest Creation</CardTitle>
                  <CardDescription>
                    Your newest AI-generated artwork
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {artworks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No artworks created yet</p>
                      <p className="text-sm">Start creating with AI!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative group">
                        <div className="relative overflow-hidden rounded-lg border shadow-lg">
                          <img
                            src={artworks[0].url}
                            alt={artworks[0].prompt}
                            className="w-full h-auto transition-all duration-1000 ease-out"
                            style={{
                              filter: 'blur(20px)',
                              animation: 'revealImage 2s ease-out forwards'
                            }}
                            onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              setTimeout(() => {
                                img.style.filter = 'blur(0px)';
                              }, 100);
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse" 
                               style={{ animation: 'fadeOut 2s ease-out forwards' }} />
                        </div>
                        
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Badge className={`${selectedProvider.color} text-white`}>
                            {selectedProvider.icon}
                            <span className="ml-1">{artworks[0].provider}</span>
                          </Badge>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm rounded p-2 text-white text-sm">
                          <p className="line-clamp-2">{artworks[0].prompt}</p>
                        </div>

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleLike(artworks[0].id)}
                          >
                            <Heart className={`w-4 h-4 ${artworks[0].liked ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadArtwork(artworks[0])}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyPrompt(artworks[0].prompt)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => regenerateWithDifferentProvider(artworks[0])}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Artwork Gallery</CardTitle>
              <CardDescription>
                Browse all your AI-generated creations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {artworks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No artworks in gallery yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {artworks.map((artwork) => (
                    <div key={artwork.id} className="space-y-3">
                      <div className="relative group">
                        <img
                          src={artwork.url}
                          alt={artwork.prompt}
                          className="w-full h-auto rounded-lg border shadow-lg"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className={`${MODEL_PROVIDERS.find(p => p.id === artwork.provider)?.color} text-white`}>
                            {artwork.provider}
                          </Badge>
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleLike(artwork.id)}
                          >
                            <Heart className={`w-4 h-4 ${artwork.liked ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadArtwork(artwork)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyPrompt(artwork.prompt)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium line-clamp-2">
                          {artwork.prompt}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Model:</span>
                            <span>{artwork.model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Created:</span>
                            <span>{new Date(artwork.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Studio Settings
              </CardTitle>
              <CardDescription>
                Configure your AI Art Studio preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Provider Settings</h3>
                  {MODEL_PROVIDERS.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {provider.models.length} models available
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {provider.capabilities.length} features
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Generation Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Artworks:</span>
                      <Badge>{artworks.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Liked Artworks:</span>
                      <Badge>{artworks.filter(a => a.liked).length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Providers Used:</span>
                      <Badge>{new Set(artworks.map(a => a.provider)).size}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
