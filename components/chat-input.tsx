'use client'

import {
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { X } from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize'

import { isFileInArray } from '@/lib/utils'

import { MicrophoneIcon } from './icons'
import { RepoBanner } from './repo-banner'

export function ChatInput({
  retry,
  isErrored,
  errorMessage,
  isLoading,
  isRateLimited,
  stop,
  input,
  handleInputChange,
  handleSubmit,
  isMultiModal,
  files,
  handleFileChange,
  children,
  onVoiceSubmit,
}: {
  retry: () => void
  isErrored: boolean
  errorMessage: string
  isLoading: boolean
  isRateLimited: boolean
  stop: () => void
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isMultiModal: boolean
  files: File[]
  handleFileChange: (change: SetStateAction<File[]>) => void
  children: React.ReactNode
  onVoiceSubmit?: () => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange((prev) => {
      const newFiles = Array.from(e.target.files || [])
      const uniqueFiles = newFiles.filter((file) => !isFileInArray(file, prev))
      return [...prev, ...uniqueFiles]
    })
  }

  function handleFileRemove(file: File) {
    handleFileChange((prev) => prev.filter((f) => f !== file))
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items)

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()

        const file = item.getAsFile()
        if (file) {
          handleFileChange((prev) => {
            if (!isFileInArray(file, prev)) {
              return [...prev, file]
            }
            return prev
          })
        }
      }
    }
  }

  const [dragActive, setDragActive] = useState(false)

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/'),
    )

    if (droppedFiles.length > 0) {
      handleFileChange((prev) => {
        const uniqueFiles = droppedFiles.filter(
          (file) => !isFileInArray(file, prev),
        )
        return [...prev, ...uniqueFiles]
      })
    }
  }

  const filePreview = useMemo(() => {
    if (files.length === 0) return null
    return Array.from(files).map((file) => {
      return (
        <div className="relative" key={file.name}>
          <span
            onClick={() => handleFileRemove(file)}
            className="absolute top-[-8] right-[-8] bg-muted rounded-full p-1"
          >
            <X className="h-3 w-3 cursor-pointer" />
          </span>
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="rounded-xl w-10 h-10 object-cover"
          />
        </div>
      )
    })
  }, [files])

  function onEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (e.currentTarget.checkValidity()) {
        handleSubmit(e)
      } else {
        e.currentTarget.reportValidity()
      }
    }
  }

  useEffect(() => {
    if (!isMultiModal) {
      handleFileChange([])
    }
  }, [isMultiModal])

  async function startRecording() {
    setRecordingError(null)
    setIsRecording(true)
    try {
      // 1. Fetch ephemeral OpenAI token from backend
      const tokenResponse = await fetch('/api/openai-ephemeral-token')
      const data = await tokenResponse.json()
      if (!data.client_secret?.value) {
        throw new Error('Failed to get OpenAI token')
      }
      const EPHEMERAL_KEY = data.client_secret.value

      // 2. Create peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // 3. Set up remote audio playback
      if (!audioElRef.current) {
        audioElRef.current = document.createElement('audio')
        audioElRef.current.autoplay = true
        document.body.appendChild(audioElRef.current)
      }
      pc.ontrack = e => {
        if (audioElRef.current) audioElRef.current.srcObject = e.streams[0]
      }

      // 4. Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = ms
      pc.addTrack(ms.getTracks()[0])

      // 5. Set up data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      
      // Handle various WebRTC events
      dc.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data)
          console.log('Received event:', event)

          // Handle speech detection events
          if (event.type === 'input_audio_buffer.speech_started') {
            console.log('Speech started')
          } else if (event.type === 'input_audio_buffer.speech_stopped') {
            console.log('Speech stopped')
          }

          // Handle function call events for code generation
          if (event.type === 'response.done' && event.response?.output?.[0]?.type === 'function_call') {
            const functionCall = event.response.output[0]
            if (functionCall.name === 'generate_code') {
              const args = JSON.parse(functionCall.arguments)
              // Create a code block with the generated code
              const codeBlock = `Language: ${args.language}\n\`\`\`${args.language}\n${args.description}\n\`\`\``;
              handleInputChange({
                target: { value: codeBlock },
                currentTarget: { value: codeBlock },
              } as React.ChangeEvent<HTMLTextAreaElement>)
              if (onVoiceSubmit) onVoiceSubmit()
            }
          }

          // Handle text transcript events
          if (event.type === 'response.done' && event.response?.output?.[0]?.text) {
            const text = event.response.output[0].text;
            // Check if the text contains code blocks
            if (text.includes('```')) {
              handleInputChange({
                target: { value: text },
                currentTarget: { value: text },
              } as React.ChangeEvent<HTMLTextAreaElement>)
            } else {
              // If no code blocks, wrap it in a code block
              const codeBlock = `\`\`\`\n${text}\n\`\`\``;
              handleInputChange({
                target: { value: codeBlock },
                currentTarget: { value: codeBlock },
              } as React.ChangeEvent<HTMLTextAreaElement>)
            }
            setIsRecording(false)
            stopRecording()
            if (onVoiceSubmit) onVoiceSubmit()
          }
        } catch (err) {
          console.error('Error handling WebRTC message:', err)
        }
      })

      // Handle data channel state
      dc.addEventListener('open', () => {
        console.log('Data channel opened')
        // Send initial session configuration
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: 'You are a voice-to-code assistant. Convert natural language descriptions into code.',
            turn_detection: {
              type: 'semantic_vad',
              eagerness: 'medium'
            }
          }
        }))
      })

      dc.addEventListener('close', () => {
        console.log('Data channel closed')
        stopRecording()
      })

      // 6. Start the session (SDP)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const baseUrl = 'https://api.openai.com/v1/realtime'
      const model = 'gpt-4o-realtime-preview-2024-12-17'
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1'
        },
      })

      if (!sdpResponse.ok) {
        throw new Error(`Failed to establish WebRTC connection: ${sdpResponse.statusText}`)
      }

      const answer = { type: 'answer' as const, sdp: await sdpResponse.text() }
      await pc.setRemoteDescription(answer)
    } catch (err: any) {
      console.error('Error starting recording:', err)
      setRecordingError(err.message || 'Failed to start recording')
      setIsRecording(false)
      stopRecording()
    }
  }

  function stopRecording() {
    setIsRecording(false)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (audioElRef.current) {
      audioElRef.current.remove()
      audioElRef.current = null
    }
  }

  async function handleGenerateImage() {
    if (!input) return;
    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await response.json();
      if (data.image) {
        // Insert markdown image link into the chat input
        handleInputChange({
          target: { value: `${input}\n![generated image](data:image/png;base64,${data.image})` },
          currentTarget: { value: `${input}\n![generated image](data:image/png;base64,${data.image})` },
        } as React.ChangeEvent<HTMLTextAreaElement>);
      }
    } catch (err) {
      // Optionally handle error
    }
    setIsGeneratingImage(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={onEnter}
      className="mb-2 mt-auto flex flex-col bg-background"
      onDragEnter={isMultiModal ? handleDrag : undefined}
      onDragLeave={isMultiModal ? handleDrag : undefined}
      onDragOver={isMultiModal ? handleDrag : undefined}
      onDrop={isMultiModal ? handleDrop : undefined}
    >
      {isErrored && (
        <div
          className={`flex items-center p-1.5 text-sm font-medium mx-4 mb-10 rounded-xl ${
            isRateLimited
              ? 'bg-orange-400/10 text-orange-400'
              : 'bg-red-400/10 text-red-400'
          }`}
        >
          <span className="flex-1 px-1.5">{errorMessage}</span>
          <button
            className={`px-2 py-1 rounded-sm ${
              isRateLimited ? 'bg-orange-400/20' : 'bg-red-400/20'
            }`}
            onClick={retry}
          >
            Try again
          </button>
        </div>
      )}
      {recordingError && (
        <div className="flex items-center p-1.5 text-sm font-medium mx-4 mb-4 rounded-xl bg-red-400/10 text-red-400">
          <span className="flex-1 px-1.5">{recordingError}</span>
          <button
            className="px-2 py-1 rounded-sm bg-red-400/20"
            onClick={() => setRecordingError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="relative">
        <RepoBanner className="absolute bottom-full inset-x-2 translate-y-1 z-0 pb-2" />
        <div
          className={`shadow-md rounded-2xl relative z-10 bg-background border ${
            dragActive
              ? 'before:absolute before:inset-0 before:rounded-2xl before:border-2 before:border-dashed before:border-primary'
              : ''
          }`}
        >
          {children}
          <div className="flex items-center px-3 py-2 gap-1">
            <button
              type="button"
              aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
              title={isRecording ? 'Stop voice input' : 'Start voice input'}
              className={`relative p-2 rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 ${
                isRecording 
                  ? 'bg-[#39ff14]/20 ring-2 ring-[#39ff14]' 
                  : ''
              }`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              <MicrophoneIcon 
                className={`text-[#39ff14] drop-shadow-[0_0_6px_#a020f0] transition-all duration-200 ${
                  isRecording 
                    ? 'animate-pulse scale-110' 
                    : ''
                }`} 
              />
              {isRecording && (
                <span className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39ff14]" />
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Generate image from prompt"
              title="Generate image from prompt"
              className={`p-2 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isGeneratingImage ? 'opacity-50' : ''}`}
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !input}
            >
              {/* Image icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5zm0 0l5.25-5.25a2.25 2.25 0 013.18 0l5.32 5.32M15 11.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </button>
          </div>
          <TextareaAutosize
            autoFocus={true}
            minRows={1}
            maxRows={5}
            className="text-normal px-3 resize-none ring-0 bg-inherit w-full m-0 outline-none"
            required={true}
            placeholder={isRecording ? "Listening... Speak your code description" : "Describe your app..."}
            disabled={isErrored || isRecording}
            value={input}
            onChange={handleInputChange}
            onPaste={isMultiModal ? handlePaste : undefined}
          />
        </div>
      </div>
    </form>
  )
}