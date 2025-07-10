'use client'

import React, {
  useCallback,
  useRef,
  useState,
} from 'react'

import {
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle,
  Eye,
  Keyboard,
  Monitor,
  Mouse,
  Pause,
  Play,
  Square,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

import { TerminAgentAnimation } from './TerminAgentAnimation'

interface ComputerAction {
  id: string
  type: 'click' | 'type' | 'scroll' | 'screenshot' | 'wait'
  timestamp: number
  coordinates?: { x: number; y: number }
  text?: string
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
}

interface ScreenshotData {
  id: string
  timestamp: number
  dataUrl: string
  description: string
}

export function ComputerUseAgent() {
  const [isActive, setIsActive] = useState(false)
  const [task, setTask] = useState('')
  const [actions, setActions] = useState<ComputerAction[]>([])
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>([])
  const [currentAction, setCurrentAction] = useState<ComputerAction | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startAgent = useCallback(async () => {
    if (!task.trim()) {
      toast({
        title: 'Task Required',
        description: 'Please describe what you want the agent to do.',
        variant: 'destructive',
      })
      return
    }

    setIsActive(true)
    setActions([])
    setScreenshots([])

    try {
      // Simulate computer use agent initialization
      const initialActions: ComputerAction[] = [
        {
          id: '1',
          type: 'screenshot',
          timestamp: Date.now(),
          description: 'Taking initial screenshot',
          status: 'pending'
        },
        {
          id: '2',
          type: 'click',
          timestamp: Date.now() + 1000,
          coordinates: { x: 100, y: 200 },
          description: 'Clicking on target element',
          status: 'pending'
        },
        {
          id: '3',
          type: 'type',
          timestamp: Date.now() + 2000,
          text: 'Hello, World!',
          description: 'Typing text input',
          status: 'pending'
        }
      ]

      setActions(initialActions)

      // Simulate action execution
      for (const action of initialActions) {
        setCurrentAction(action)
        
        // Update action status to executing
        setActions(prev => prev.map(a => 
          a.id === action.id ? { ...a, status: 'executing' } : a
        ))

        // Simulate action execution time
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Simulate screenshot capture for screenshot actions
        if (action.type === 'screenshot') {
          await captureScreenshot(action.description)
        }

        // Update action status to completed
        setActions(prev => prev.map(a => 
          a.id === action.id ? { ...a, status: 'completed' } : a
        ))
      }

      setCurrentAction(null)
      toast({
        title: 'Task Completed! ✨',
        description: 'Computer use agent has finished executing the task.',
      })

    } catch (error) {
      console.error('Computer use error:', error)
      toast({
        title: 'Execution Failed',
        description: 'An error occurred while executing the task.',
        variant: 'destructive',
      })
    } finally {
      setIsActive(false)
    }
  }, [task, toast])

  const stopAgent = useCallback(() => {
    setIsActive(false)
    setCurrentAction(null)
    toast({
      title: 'Agent Stopped',
      description: 'Computer use agent has been stopped.',
    })
  }, [toast])

  const captureScreenshot = useCallback(async (description: string) => {
    try {
      // Simulate screenshot capture (in real implementation, this would capture the actual screen)
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Create a mock screenshot
      canvas.width = 800
      canvas.height = 600
      
      // Draw a gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add some mock UI elements
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(50, 50, 700, 80)
      ctx.fillStyle = '#000000'
      ctx.font = '16px Arial'
      ctx.fillText('Mock Desktop Screenshot - ' + new Date().toLocaleTimeString(), 60, 80)

      // Add mock browser window
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(100, 150, 600, 400)
      ctx.fillStyle = '#e0e0e0'
      ctx.fillRect(100, 150, 600, 40)
      ctx.fillStyle = '#000000'
      ctx.fillText('Browser Window - Solana Trading Dashboard', 110, 175)

      const dataUrl = canvas.toDataURL('image/png')
      
      const screenshot: ScreenshotData = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        dataUrl,
        description
      }

      setScreenshots(prev => [...prev, screenshot])
    } catch (error) {
      console.error('Screenshot capture error:', error)
    }
  }, [])

  const getActionIcon = (type: ComputerAction['type']) => {
    switch (type) {
      case 'click': return <Mouse className="w-4 h-4" />
      case 'type': return <Keyboard className="w-4 h-4" />
      case 'scroll': return <Mouse className="w-4 h-4" />
      case 'screenshot': return <Camera className="w-4 h-4" />
      case 'wait': return <Pause className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: ComputerAction['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'executing': return <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <TerminAgentAnimation isActive={isActive} size="lg" />
        <h1 className="text-3xl font-bold holographic">
          Computer Use Agent
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered desktop automation and browser control
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Agent Control
            </CardTitle>
            <CardDescription>
              Describe what you want the agent to do on your computer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Description</label>
              <Textarea
                placeholder="e.g., Open a browser, navigate to Solana DEX, check SOL price, take a screenshot..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="min-h-[100px]"
                disabled={isActive}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startAgent}
                disabled={isActive || !task.trim()}
                className="flex-1"
              >
                {isActive ? (
                  <>
                    <Brain className="w-4 h-4 mr-2 animate-pulse" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Agent
                  </>
                )}
              </Button>

              {isActive && (
                <Button
                  onClick={stopAgent}
                  variant="destructive"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>

            {/* Current Action Display */}
            {currentAction && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getActionIcon(currentAction.type)}
                  <span className="font-medium">Current Action</span>
                  <Badge variant="secondary">Executing</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentAction.description}
                </p>
                {currentAction.coordinates && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Position: ({currentAction.coordinates.x}, {currentAction.coordinates.y})
                  </p>
                )}
              </div>
            )}

            {/* Safety Notice */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Safety Notice</span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                This is a demo. Real computer use requires careful security considerations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Action Timeline
            </CardTitle>
            <CardDescription>
              Real-time view of agent actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No actions yet</p>
                <p className="text-sm">Start the agent to see actions here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {actions.map((action, index) => (
                  <div
                    key={action.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border
                      ${action.status === 'executing' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' : ''}
                      ${action.status === 'completed' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''}
                      ${action.status === 'failed' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      {getActionIcon(action.type)}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.description}</p>
                      {action.text && (
                        <p className="text-xs text-muted-foreground font-mono">
                          &quot;{action.text}&quot;
                        </p>
                      )}
                      {action.coordinates && (
                        <p className="text-xs text-muted-foreground">
                          ({action.coordinates.x}, {action.coordinates.y})
                        </p>
                      )}
                    </div>
                    
                    {getStatusIcon(action.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Screenshots
            </CardTitle>
            <CardDescription>
              Visual record of agent actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map((screenshot) => (
                <div key={screenshot.id} className="space-y-2">
                  <div className="relative group">
                    <img
                      src={screenshot.dataUrl}
                      alt={screenshot.description}
                      className="w-full h-48 object-cover rounded-lg border image-reveal"
                    />
                    <div className="image-blur-overlay" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{screenshot.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(screenshot.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for screenshot generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
