import {
  NextRequest,
  NextResponse,
} from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, model = 'gpt-image-1', size = '1024x1024', quality = 'high', background = 'auto' } = await req.json();

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      background,
      n: 1,
      response_format: 'b64_json'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json({ error }, { status: 500 });
  }

  const data = await response.json();
  // data.data[0].b64_json is the base64-encoded image
  return NextResponse.json({ image: data.data[0].b64_json });
} 