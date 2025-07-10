'use client'

import React, {
  useEffect,
  useState,
} from 'react'

import {
  Brain,
  Code,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react'

interface TerminAgentAnimationProps {
  isActive?: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function TerminAgentAnimation({ 
  isActive = false, 
  size = 'md', 
  showText = true 
}: TerminAgentAnimationProps) {
  const [currentIcon, setCurrentIcon] = useState(0)
  const [isThinking, setIsThinking] = useState(false)

  const icons = [Terminal, Code, Brain, Sparkles, Zap]
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  useEffect(() => {
    if (isActive) {
      setIsThinking(true)
      const interval = setInterval(() => {
        setCurrentIcon((prev) => (prev + 1) % icons.length)
      }, 800)

      return () => {
        clearInterval(interval)
        setIsThinking(false)
      }
    }
  }, [isActive, icons.length])

  const CurrentIcon = icons[currentIcon]

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Main Animation Container */}
      <div className="relative">
        {/* Outer Glow Ring */}
        <div className={`
          absolute inset-0 rounded-full 
          ${isActive ? 'terminagent-glow animate-pulse' : ''}
          ${sizeClasses[size]}
        `} />
        
        {/* Matrix Rain Background */}
        {isActive && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="matrix-rain opacity-30" />
          </div>
        )}
        
        {/* Icon Container */}
        <div className={`
          relative flex items-center justify-center rounded-full
          bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600
          ${sizeClasses[size]}
          ${isActive ? 'animate-spin' : ''}
          transition-all duration-500
        `}>
          {/* Inner Icon */}
          <CurrentIcon 
            className={`
              ${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'}
              text-white
              ${isThinking ? 'ai-thinking' : ''}
              transition-all duration-300
            `}
          />
          
          {/* Floating Particles */}
          {isActive && (
            <>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full floating-particle" />
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-pink-400 rounded-full floating-particle" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-0 -left-2 w-1 h-1 bg-cyan-400 rounded-full floating-particle" style={{ animationDelay: '1s' }} />
            </>
          )}
        </div>
      </div>

      {/* Status Text */}
      {showText && (
        <div className="text-center space-y-1">
          <div className={`
            font-semibold holographic
            ${textSizeClasses[size]}
            ${isActive ? 'typing-animation' : ''}
          `}>
            {isActive ? 'TerminAgent Active' : 'TerminAgent Ready'}
          </div>
          
          {isActive && (
            <div className={`
              text-muted-foreground
              ${size === 'sm' ? 'text-xs' : 'text-sm'}
              ai-thinking
            `}>
              Processing your request...
            </div>
          )}
        </div>
      )}

      {/* Command Line Simulation */}
      {isActive && showText && (
        <div className="bg-black/80 rounded-lg p-3 font-mono text-green-400 text-xs max-w-xs">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400">$</span>
            <span className="typing-animation">
              terminagent --execute --mode=ai
            </span>
          </div>
          <div className="mt-1 text-yellow-400 ai-thinking">
            [INFO] Initializing neural pathways...
          </div>
          <div className="mt-1 text-green-400 ai-thinking" style={{ animationDelay: '0.5s' }}>
            [SUCCESS] Agent ready for deployment
          </div>
        </div>
      )}
    </div>
  )
}

// Loading Dots Component
export function LoadingDots() {
  return (
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-purple-500 rounded-full ai-thinking" />
      <div className="w-2 h-2 bg-purple-500 rounded-full ai-thinking" style={{ animationDelay: '0.2s' }} />
      <div className="w-2 h-2 bg-purple-500 rounded-full ai-thinking" style={{ animationDelay: '0.4s' }} />
    </div>
  )
}

// Code Typing Animation Component
export function CodeTypingAnimation({ code, speed = 50 }: { code: string; speed?: number }) {
  const [displayedCode, setDisplayedCode] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < code.length) {
      const timeout = setTimeout(() => {
        setDisplayedCode(prev => prev + code[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, code, speed])

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
      <div className="text-green-400">
        <span>{displayedCode}</span>
        <span className="animate-pulse">|</span>
      </div>
    </div>
  )
}

// Holographic Text Component
export function HolographicText({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`holographic ${className}`}>
      {children}
    </div>
  )
}
