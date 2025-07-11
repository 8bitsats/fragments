'use client'

import React, { useState } from 'react'

import {
  Copy,
  Download,
  ImageIcon,
  LoaderIcon,
  Sparkles,
  Wand2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

interface GenerationParams {
  width: number
  height: number
  num_inference_steps: number
  guidance_scale: number
  negative_prompt?: string
  seed?: number
  scheduler?: string
}

interface GeneratedImage {
  url: string
  prompt: string
  params: GenerationParams
  timestamp: number
}

const PRESET_SIZES = [
  { name: 'Square', width: 1024, height: 1024 },
  { name: 'Portrait', width: 768, height: 1024 },
  { name: 'Landscape', width: 1024, height: 768 },
  { name: 'Wide', width: 1344, height: 768 },
  { name: 'Tall', width: 768, height: 1344 }
]

const STYLE_PRESETS = [
  'Photorealistic',
  'Digital Art',
  'Oil Painting',
  'Watercolor',
  'Anime/Manga',
  'Cyberpunk',
  'Fantasy',
  'Minimalist',
  'Abstract',
  'Vintage'
]

export function FluxImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedSize, setSelectedSize] = useState(PRESET_SIZES[0])
  const [steps, setSteps] = useState([4])
  const [guidance, setGuidance] = useState([3.5])
  const [seed, setSeed] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('')
  const { toast } = useToast()

  const generateImageWithUnifiedAPI = async (
    prompt: string,
    params: GenerationParams,
    provider: 'flux' | 'openai' = 'flux'
  ): Promise<string> => {
    try {
      const response = await fetch('/api/openai-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          model: provider === 'openai' ? 'dall-e-3' : 'flux-schnell',
          messages: [{ role: 'user', content: prompt }],
          image_generation_params: {
            prompt,
            width: params.width,
            height: params.height,
            steps: params.num_inference_steps,
            guidance: params.guidance_scale,
            negative_prompt: params.negative_prompt,
            seed: params.seed
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (result.images && result.images.length > 0) {
        return result.images[0].url
      }

      throw new Error('No image returned from API')
    } catch (error) {
      console.error('Image generation error:', error)
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a prompt to generate an image.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)

    try {
      const enhancedPrompt = selectedStyle && selectedStyle !== "none"
        ? `${prompt}, ${selectedStyle.toLowerCase()} style`
        : prompt

      const params: GenerationParams = {
        width: selectedSize.width,
        height: selectedSize.height,
        num_inference_steps: steps[0],
        guidance_scale: guidance[0],
        negative_prompt: negativePrompt || undefined,
        seed: seed ? parseInt(seed) : undefined
      }

      const imageUrl = await generateImageWithUnifiedAPI(enhancedPrompt, params)

      const newImage: GeneratedImage = {
        url: imageUrl,
        prompt: enhancedPrompt,
        params,
        timestamp: Date.now()
      }

      setGeneratedImages(prev => [newImage, ...prev])

      toast({
        title: 'Image Generated! 🎨',
        description: 'Your FLUX creation is ready!',
      })

    } catch (error) {
      console.error('Generation error:', error)
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate image',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flux-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Downloaded!',
        description: 'Image saved to your downloads folder.',
      })
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download image.',
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

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000).toString())
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
          FLUX Image Generator
        </h1>
        <p className="text-muted-foreground">
          Create stunning images with FLUX.1 Schnell - High-speed AI image generation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Generation Settings
              </CardTitle>
              <CardDescription>
                Configure your image generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the image you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="style">Style Preset</Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a style (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Style</SelectItem>
                    {STYLE_PRESETS.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="size">Image Size</Label>
                <Select 
                  value={selectedSize.name} 
                  onValueChange={(value) => {
                    const size = PRESET_SIZES.find(s => s.name === value)
                    if (size) setSelectedSize(size)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SIZES.map((size) => (
                      <SelectItem key={size.name} value={size.name}>
                        {size.name} ({size.width}×{size.height})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Inference Steps: {steps[0]}</Label>
                <Slider
                  value={steps}
                  onValueChange={setSteps}
                  min={1}
                  max={20}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher values = better quality, slower generation
                </p>
              </div>

              <div>
                <Label>Guidance Scale: {guidance[0]}</Label>
                <Slider
                  value={guidance}
                  onValueChange={setGuidance}
                  min={1}
                  max={10}
                  step={0.5}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How closely to follow the prompt
                </p>
              </div>

              <div>
                <Label htmlFor="negative-prompt">Negative Prompt</Label>
                <Textarea
                  id="negative-prompt"
                  placeholder="What to avoid in the image..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="seed">Seed (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="seed"
                    placeholder="Random seed"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    type="number"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={randomizeSeed}
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Images */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
              <CardDescription>
                Your FLUX creations will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedImages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No images generated yet</p>
                  <p className="text-sm">Create your first image with FLUX!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedImages.map((image, index) => (
                    <div key={index} className="space-y-3">
                      <div className="relative group">
                        <div className="relative overflow-hidden rounded-lg border shadow-lg">
                          <img
                            src={image.url}
                            alt={image.prompt}
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
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                          🎨 FLUX
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadImage(image.url, image.prompt)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyPrompt(image.prompt)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium line-clamp-2">
                          {image.prompt}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span>{image.params.width}×{image.params.height}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Steps:</span>
                            <span>{image.params.num_inference_steps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Guidance:</span>
                            <span>{image.params.guidance_scale}</span>
                          </div>
                          {image.params.seed && (
                            <div className="flex justify-between">
                              <span>Seed:</span>
                              <span>{image.params.seed}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Generated:</span>
                            <span>{new Date(image.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
