import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { LoaderIcon } from 'lucide-react'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setImage(null);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else if (data.image) {
        setImage(`data:image/png;base64,${data.image}`);
      } else {
        setError('Failed to generate image');
      }
    } catch (err) {
      setError('An error occurred while generating the image');
      console.error('Image generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          className="flex-1"
          disabled={loading}
        />
        <Button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          variant="outline"
          size="icon"
          className="shrink-0"
        >
          {loading ? (
            <LoaderIcon className="h-5 w-5 animate-spin" />
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-5 h-5"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M3 16.5V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5zm0 0l5.25-5.25a2.25 2.25 0 013.18 0l5.32 5.32M15 11.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" 
              />
            </svg>
          )}
        </Button>
      </div>
      
      {error && (
        <div className="text-sm text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg">
          {error}
        </div>
      )}
      
      {image && (
        <div className="relative group">
          <img 
            src={image} 
            alt="Generated" 
            className="w-full rounded-lg border dark:border-white/10 transition-transform transform hover:scale-[1.02]" 
          />
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.href = image;
              link.download = `generated-${Date.now()}.png`;
              link.click();
            }}
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Download
          </Button>
        </div>
      )}
    </div>
  );
} 