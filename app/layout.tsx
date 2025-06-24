import './globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'

import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@vercel/analytics/next'

import {
  PostHogProvider,
  ThemeProvider,
} from './providers'
import { PrivyProvider } from '@/components/PrivyProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Agent Chat',
  description: 'Advanced AI agent with conversation, web search, and image generation capabilities',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <PostHogProvider>
        <PrivyProvider>
          <body className={inter.className}>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
            <Toaster />
            <Analytics />
            
            {/* ElevenLabs ConvAI Widget */}
            <div 
              className="fixed bottom-4 right-4 z-50"
              dangerouslySetInnerHTML={{
                __html: '<elevenlabs-convai agent-id="agent_01jy0nxqsxe09t553eh8zh3q54"></elevenlabs-convai>'
              }}
            />
            
            <Script 
              src="https://unpkg.com/@elevenlabs/convai-widget-embed" 
              strategy="lazyOnload"
            />
          </body>
        </PrivyProvider>
      </PostHogProvider>
    </html>
  )
}
