'use client'

import { useState } from 'react'
import { AgentChat } from '@/components/agent-chat'
import { NavBar } from '@/components/navbar'
import { useAuth } from '@/lib/auth'
import { ViewType } from '@/components/auth'
import { SolanaWallet } from '@/components/SolanaWallet'

export default function Home() {
  const [isAuthDialogOpen, setAuthDialog] = useState(false);
  const [authView, setAuthView] = useState<ViewType>('sign_in');
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
        <div className="w-80 p-4 border-r">
          <SolanaWallet />
        </div>
        <div className="flex-1">
          <AgentChat />
        </div>
      </div>
    </main>
  )
}
