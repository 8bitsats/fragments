'use client';

import {
  useEffect,
  useState,
} from 'react'

import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Image from 'next/image'

export function CollapsibleWidget() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-end gap-2">
      {/* Toggle Button with Logo */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="bg-gray-900/80 hover:bg-gray-800/80 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-200 border border-purple-500/30"
        style={{
          boxShadow: '0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.2)'
        }}
        aria-label={isCollapsed ? "Open chat widget" : "Close chat widget"}
      >
        <div className="relative">
          <Image
            src="https://vwirsyxjrbobhkoucnvd.supabase.co/storage/v1/object/public/trash//logo%20(1).png"
            alt="Logo"
            width={24}
            height={24}
            className="transition-all duration-200"
            style={{
              filter: 'drop-shadow(0 0 8px rgb(147 51 234 / 0.8)) brightness(1.2)',
            }}
          />
          {isCollapsed ? (
            <ChevronRight className="absolute -bottom-1 -right-1 w-3 h-3 text-purple-400" />
          ) : (
            <ChevronLeft className="absolute -bottom-1 -right-1 w-3 h-3 text-purple-400" />
          )}
        </div>
      </button>

      {/* Widget Container */}
      {!isCollapsed && (
        <div 
          className="transition-all duration-300 ease-in-out animate-in slide-in-from-left-2"
          dangerouslySetInnerHTML={{
            __html: '<elevenlabs-convai agent-id="agent_01jyb1k1jjeesrenphbacqvhmw"></elevenlabs-convai>'
          }}
        />
      )}
    </div>
  );
}
