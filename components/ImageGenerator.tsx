import React, { useState } from 'react'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setImage(null);
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    setLoading(false);
    if (data.error) {
      setError(data.error);
    } else {
      setImage(`data:image/png;base64,${data.image}`);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          className="border px-2 py-1 rounded w-full"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          title="Generate image from prompt"
        >
          {/* Simple image icon (SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5zm0 0l5.25-5.25a2.25 2.25 0 013.18 0l5.32 5.32M15 11.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
        </button>
      </div>
      <button onClick={handleGenerate} disabled={loading || !prompt} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded w-full">
        {loading ? 'Generating...' : 'Generate Image'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {image && (
        <div className="mt-4">
          <img src={image} alt="Generated" className="max-w-full rounded border" />
        </div>
      )}
    </div>
  );
} 