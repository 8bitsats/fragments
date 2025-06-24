import {
  NextRequest,
  NextResponse,
} from 'next/server'

export async function GET(req: NextRequest) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 })
  }

  try {
    // Create a session with voice-to-code configuration
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'echo',
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'medium',
          create_response: true,
          interrupt_response: true
        },
        instructions: 'You are a voice-to-code assistant. Convert natural language descriptions into code. Focus on understanding programming concepts, syntax, and best practices. When users describe what they want to build, generate appropriate code snippets and explain the implementation.',
        tools: [{
          type: 'function',
          name: 'generate_code',
          description: 'Generate code based on natural language description',
          parameters: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                description: 'Programming language to generate code in',
                enum: ['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust']
              },
              description: {
                type: 'string',
                description: 'Natural language description of the code to generate'
              }
            },
            required: ['language', 'description']
          }
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating OpenAI session:', error)
    return NextResponse.json({ error: 'Failed to create OpenAI session' }, { status: 500 })
  }
} 