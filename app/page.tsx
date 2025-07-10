'use client'

import { useState } from 'react'

import { AIArtStudio } from '@/components/AIArtStudio'
import { ViewType } from '@/components/auth'
import { FluxImageGenerator } from '@/components/FluxImageGenerator'
import { NavBar } from '@/components/navbar'
import { SolanaWallet } from '@/components/SolanaWallet'
import { TerminAgentChat } from '@/components/terminagent-chat'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'

export default function Home() {
  const [isAuthDialogOpen, setAuthDialog] = useState(false);
  const [authView, setAuthView] = useState<ViewType>('sign_in');
  const [activeTab, setActiveTab] = useState('terminagent');
  const { session } = useAuth(setAuthDialog, setAuthView);

  const handleSocialClick = (target: 'github' | 'x' | 'discord') => {
    if (target === 'github') {
      window.open('https://github.com/e2b-dev/fragments', '_blank')
    } else if (target === 'x') {
      window.open('https://x.com/e2b_dev', '_blank')
    } else if (target === 'discord') {
      window.open('https://discord.gg/U7KEcGErtQ', '_blank')
    }
  };

  return (
    <main className="flex min-h-screen max-h-screen flex-col">
      <NavBar 
        session={session}
        showLogin={() => setAuthDialog(true)}
        signOut={() => {}}
        onSocialClick={handleSocialClick}
        onClear={() => {}}
        canClear={false}
        onUndo={() => {}}
        canUndo={false}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 p-4 border-r bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <div className="space-y-4">
            <div className="terminagent-glow p-4 rounded-lg bg-white dark:bg-gray-800 border">
              <h2 className="text-lg font-semibold mb-2 gradient-animate text-transparent bg-clip-text">
                🚀 X402 Agent Hub
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Multi-model AI platform with unified agent experience
              </p>
              <SolanaWallet />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Quick Access</h3>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setActiveTab('terminagent')}
                  className={`p-3 rounded-lg text-left transition-all ${
                    activeTab === 'terminagent' 
                      ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } border`}
                >
                  <div className="font-medium">🤖 TerminAgent</div>
                  <div className="text-xs text-muted-foreground">AI Terminal Assistant</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('art-studio')}
                  className={`p-3 rounded-lg text-left transition-all ${
                    activeTab === 'art-studio' 
                      ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } border`}
                >
                  <div className="font-medium">🎨 AI Art Studio</div>
                  <div className="text-xs text-muted-foreground">Multi-model Image Generation</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('flux-generator')}
                  className={`p-3 rounded-lg text-left transition-all ${
                    activeTab === 'flux-generator' 
                      ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } border`}
                >
                  <div className="font-medium">⚡ FLUX Generator</div>
                  <div className="text-xs text-muted-foreground">High-speed Image Creation</div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
              <TabsTrigger value="terminagent" className="flex items-center gap-2">
                🤖 TerminAgent
              </TabsTrigger>
              <TabsTrigger value="art-studio" className="flex items-center gap-2">
                🎨 AI Art Studio
              </TabsTrigger>
              <TabsTrigger value="flux-generator" className="flex items-center gap-2">
                ⚡ FLUX Generator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terminagent" className="flex-1 m-4 mt-0">
              <div className="h-full rounded-lg border bg-white dark:bg-gray-900 overflow-hidden">
                <TerminAgentChat />
              </div>
            </TabsContent>

            <TabsContent value="art-studio" className="flex-1 m-4 mt-0 overflow-auto">
              <div className="h-full rounded-lg border bg-white dark:bg-gray-900 overflow-auto">
                <AIArtStudio />
              </div>
            </TabsContent>

            <TabsContent value="flux-generator" className="flex-1 m-4 mt-0 overflow-auto">
              <div className="h-full rounded-lg border bg-white dark:bg-gray-900 overflow-auto">
                <FluxImageGenerator />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
