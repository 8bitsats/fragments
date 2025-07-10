import chalk from 'chalk'
import {
  exec,
  spawn,
} from 'child_process'
import express, {
  Request,
  Response,
} from 'express'
import fs from 'fs/promises'
import { createServer } from 'http'
import OpenAI from 'openai'
import path from 'path'

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface TerminAgentConfig {
  apiKey: string
  openaiApiKey?: string
  model: string
  enableVoice?: boolean
  enableSearch?: boolean
  enableComputerUse?: boolean
  enableSolanaTrading?: boolean
  workingDirectory: string
  port?: number
}

export interface AgentCapabilities {
  webSearch: boolean
  fileSearch: boolean
  codeExecution: boolean
  codeEditing: boolean
  imageGeneration: boolean
  computerUse: boolean
  solanaTrading: boolean
  mcpServers: boolean
}

export interface ModelProvider {
  name: 'google' | 'openai'
  model: string
  capabilities: AgentCapabilities
}

export class TerminAgent {
  private config: TerminAgentConfig
  private googleAI: GoogleGenerativeAI
  private openAI?: OpenAI
  private currentProvider: ModelProvider
  private app!: express.Application
  private server: any
  private isRunning: boolean = false
  private animationFrames: string[] = []
  private currentFrame: number = 0

  constructor(config: TerminAgentConfig) {
    this.config = config
    this.googleAI = new GoogleGenerativeAI(config.apiKey)
    
    if (config.openaiApiKey) {
      this.openAI = new OpenAI({ apiKey: config.openaiApiKey })
    }

    this.currentProvider = {
      name: 'google',
      model: config.model,
      capabilities: {
        webSearch: true,
        fileSearch: true,
        codeExecution: true,
        codeEditing: true,
        imageGeneration: false,
        computerUse: false,
        solanaTrading: false,
        mcpServers: true
      }
    }

    this.setupServer()
    this.initializeAnimations()
  }

  private initializeAnimations() {
    this.animationFrames = [
      '🤖 TerminAgent',
      '🔥 TerminAgent',
      '⚡ TerminAgent',
      '🚀 TerminAgent',
      '✨ TerminAgent',
      '🌟 TerminAgent',
      '💫 TerminAgent',
      '🎯 TerminAgent'
    ]
  }

  private setupServer() {
    this.app = express()
    this.app.use(express.json())
    this.server = createServer(this.app)
    this.setupRoutes()
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        provider: this.currentProvider.name,
        model: this.currentProvider.model,
        capabilities: this.currentProvider.capabilities
      })
    })

    // Switch model provider
    this.app.post('/switch-provider', async (req: Request, res: Response) => {
      try {
        const { provider, model } = req.body
        await this.switchProvider(provider, model)
        res.json({ success: true, currentProvider: this.currentProvider })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })

    // Execute code
    this.app.post('/execute-code', async (req: Request, res: Response) => {
      try {
        const { code, language } = req.body
        const result = await this.executeCode(code, language)
        res.json({ result })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })

    // File operations
    this.app.post('/file-operation', async (req: Request, res: Response) => {
      try {
        const { operation, path: filePath, content } = req.body
        const result = await this.handleFileOperation(operation, filePath, content)
        res.json({ result })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })

    // Web search
    this.app.post('/web-search', async (req: Request, res: Response) => {
      try {
        const { query } = req.body
        const results = await this.performWebSearch(query)
        res.json({ results })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })

    // Image generation with blur-to-reveal effect
    this.app.post('/generate-image', async (req: Request, res: Response) => {
      try {
        const { prompt, provider = 'openai' } = req.body
        const result = await this.generateImageWithBlurEffect(prompt, provider)
        res.json({ result })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })

    // Computer use actions
    this.app.post('/computer-action', async (req: Request, res: Response) => {
      try {
        const { action, params } = req.body
        const result = await this.performComputerAction(action, params)
        res.json({ result })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })

    // Solana trading operations
    this.app.post('/solana-trade', async (req: Request, res: Response) => {
      try {
        const { action, params } = req.body
        const result = await this.performSolanaOperation(action, params)
        res.json({ result })
      } catch (error: any) {
        res.status(500).json({ error: error.message })
      }
    })
  }

  async initialize() {
    console.log(chalk.cyan('🚀 Initializing TerminAgent...'))
    await this.testConnections()
    console.log(chalk.green('✅ TerminAgent initialized successfully!'))
  }

  private async testConnections() {
    console.log(chalk.blue('🔍 Testing API connections...'))
    
    try {
      const googleModel = this.googleAI.getGenerativeModel({ model: 'gemini-pro' })
      await googleModel.generateContent('Hello')
      console.log(chalk.green('✅ Google AI connection successful'))
    } catch (error: any) {
      console.log(chalk.red('❌ Google AI connection failed:', error.message))
    }

    if (this.openAI) {
      try {
        await this.openAI.models.list()
        console.log(chalk.green('✅ OpenAI connection successful'))
      } catch (error: any) {
        console.log(chalk.red('❌ OpenAI connection failed:', error.message))
      }
    }
  }

  async start() {
    this.isRunning = true
    const port = this.config.port || 3001

    this.server.listen(port, () => {
      console.log(chalk.green(`🌟 TerminAgent server running on port ${port}`))
      this.startAnimation()
    })

    // Start interactive mode
    await this.startInteractiveMode()
  }

  private startAnimation() {
    setInterval(() => {
      if (this.isRunning) {
        process.stdout.write(`\r${this.animationFrames[this.currentFrame]} Processing...`)
        this.currentFrame = (this.currentFrame + 1) % this.animationFrames.length
      }
    }, 500)
  }

  private async startInteractiveMode() {
    console.log(chalk.cyan('\n🎯 TerminAgent is ready! Available endpoints:'))
    console.log(chalk.white('  POST /switch-provider - Switch between Google and OpenAI'))
    console.log(chalk.white('  POST /execute-code - Execute code in various languages'))
    console.log(chalk.white('  POST /file-operation - File operations (read, write, list, delete)'))
    console.log(chalk.white('  POST /web-search - Perform web searches'))
    console.log(chalk.white('  POST /generate-image - Generate images with blur effect'))
    console.log(chalk.white('  POST /computer-action - Computer use actions'))
    console.log(chalk.white('  POST /solana-trade - Solana trading operations'))
    console.log(chalk.white('  GET /health - Health check'))
    
    this.displayStatus()
  }

  private displayStatus() {
    console.log(chalk.cyan('\n📊 TerminAgent Status:'))
    console.log(chalk.white('Provider:'), chalk.green(this.currentProvider.name))
    console.log(chalk.white('Model:'), chalk.green(this.currentProvider.model))
    console.log(chalk.white('Capabilities:'))
    Object.entries(this.currentProvider.capabilities).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? chalk.green('✅') : chalk.red('❌')}`)
    })
    console.log()
  }

  async switchProvider(provider: 'google' | 'openai', model: string) {
    console.log(chalk.blue(`🔄 Switching to ${provider}:${model}...`))
    
    if (provider === 'openai' && !this.openAI) {
      throw new Error('OpenAI API key not configured')
    }

    this.currentProvider = {
      name: provider,
      model,
      capabilities: this.getProviderCapabilities(provider)
    }

    console.log(chalk.green(`✅ Switched to ${provider}:${model}`))
  }

  private getProviderCapabilities(provider: 'google' | 'openai'): AgentCapabilities {
    if (provider === 'google') {
      return {
        webSearch: true,
        fileSearch: true,
        codeExecution: true,
        codeEditing: true,
        imageGeneration: false,
        computerUse: false,
        solanaTrading: true,
        mcpServers: true
      }
    } else {
      return {
        webSearch: true,
        fileSearch: true,
        codeExecution: true,
        codeEditing: true,
        imageGeneration: true,
        computerUse: true,
        solanaTrading: true,
        mcpServers: true
      }
    }
  }

  async processMessage(message: string, context?: any) {
    console.log(chalk.blue('🧠 Processing message...'))
    
    if (this.currentProvider.name === 'google') {
      return await this.processWithGoogle(message, context)
    } else {
      return await this.processWithOpenAI(message, context)
    }
  }

  private async processWithGoogle(message: string, context?: any) {
    const model = this.googleAI.getGenerativeModel({ model: this.currentProvider.model })
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }]
    })

    return {
      content: result.response.text(),
      provider: 'google',
      model: this.currentProvider.model
    }
  }

  private async processWithOpenAI(message: string, context?: any) {
    if (!this.openAI) {
      throw new Error('OpenAI not configured')
    }

    const response = await this.openAI.chat.completions.create({
      model: this.currentProvider.model,
      messages: [
        { role: 'system', content: 'You are TerminAgent, a helpful AI assistant with advanced capabilities.' },
        { role: 'user', content: message }
      ]
    })

    return {
      content: response.choices[0].message?.content || '',
      provider: 'openai',
      model: this.currentProvider.model
    }
  }

  async executeCode(code: string, language: string): Promise<any> {
    console.log(chalk.blue(`⚡ Executing ${language} code...`))
    
    return new Promise((resolve, reject) => {
      let command: string
      let args: string[]

      switch (language) {
        case 'javascript':
        case 'typescript':
          command = 'node'
          args = ['-e', code]
          break
        case 'python':
          command = 'python3'
          args = ['-c', code]
          break
        case 'bash':
          command = 'bash'
          args = ['-c', code]
          break
        default:
          reject(new Error(`Unsupported language: ${language}`))
          return
      }

      const process = spawn(command, args, { cwd: this.config.workingDirectory })
      let output = ''
      let error = ''

      process.stdout?.on('data', (data) => {
        output += data.toString()
      })

      process.stderr?.on('data', (data) => {
        error += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ output, exitCode: code })
        } else {
          reject(new Error(`Process exited with code ${code}: ${error}`))
        }
      })
    })
  }

  async handleFileOperation(operation: string, filePath: string, content?: string): Promise<any> {
    const fullPath = path.resolve(this.config.workingDirectory, filePath)
    
    switch (operation) {
      case 'read':
        return await fs.readFile(fullPath, 'utf-8')
      case 'write':
        await fs.writeFile(fullPath, content || '')
        return 'File written successfully'
      case 'list':
        return await fs.readdir(fullPath)
      case 'delete':
        await fs.unlink(fullPath)
        return 'File deleted successfully'
      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }
  }

  async performWebSearch(query: string): Promise<any> {
    console.log(chalk.blue(`🔍 Searching for: ${query}`))
    
    // Mock implementation - replace with actual web search API
    return [
      { title: 'Search Result 1', url: 'https://example.com/1', snippet: 'Mock result 1' },
      { title: 'Search Result 2', url: 'https://example.com/2', snippet: 'Mock result 2' },
      { title: 'Search Result 3', url: 'https://example.com/3', snippet: 'Mock result 3' }
    ]
  }

  async generateImageWithBlurEffect(prompt: string, provider: string = 'openai'): Promise<any> {
    console.log(chalk.blue(`🎨 Generating image with blur effect: ${prompt}`))
    
    if (provider === 'openai' && this.openAI) {
      const response = await this.openAI.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024'
      })
      
      return {
        url: response.data?.[0]?.url,
        blurEffect: true,
        provider: 'openai'
      }
    } else if (provider === 'flux') {
      return {
        url: 'https://example.com/flux-image.png',
        blurEffect: true,
        provider: 'flux'
      }
    }
    
    throw new Error(`Unsupported image provider: ${provider}`)
  }

  async performComputerAction(action: string, params: any): Promise<any> {
    console.log(chalk.blue(`💻 Performing computer action: ${action}`))
    
    switch (action) {
      case 'screenshot':
        return await this.takeScreenshot()
      case 'click':
        return await this.performClick(params.x, params.y)
      case 'type':
        return await this.typeText(params.text)
      case 'scroll':
        return await this.scroll(params.direction, params.amount)
      case 'open_app':
        return await this.openApplication(params.app)
      default:
        throw new Error(`Unsupported computer action: ${action}`)
    }
  }

  async performSolanaOperation(action: string, params: any): Promise<any> {
    console.log(chalk.blue(`💰 Performing Solana operation: ${action}`))
    
    switch (action) {
      case 'get_balance':
        return await this.getSolanaBalance(params.address)
      case 'send_transaction':
        return await this.sendSolanaTransaction(params)
      case 'get_token_price':
        return await this.getTokenPrice(params.token)
      case 'swap_tokens':
        return await this.swapTokens(params)
      default:
        throw new Error(`Unsupported Solana operation: ${action}`)
    }
  }

  // Computer use implementations
  private async takeScreenshot(): Promise<any> {
    return new Promise((resolve, reject) => {
      exec('screencapture -x /tmp/screenshot.png', (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve({ path: '/tmp/screenshot.png' })
        }
      })
    })
  }

  private async performClick(x: number, y: number): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(`osascript -e "tell application \\"System Events\\" to click at {${x}, ${y}}"`, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve({ success: true, x, y })
        }
      })
    })
  }

  private async typeText(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(`osascript -e "tell application \\"System Events\\" to keystroke \\"${text}\\""`, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve({ success: true, text })
        }
      })
    })
  }

  private async scroll(direction: string, amount: number): Promise<any> {
    const scrollDirection = direction === 'up' ? 'up' : 'down'
    return new Promise((resolve, reject) => {
      exec(`osascript -e "tell application \\"System Events\\" to scroll ${scrollDirection} ${amount}"`, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve({ success: true, direction, amount })
        }
      })
    })
  }

  private async openApplication(app: string): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(`open -a "${app}"`, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve({ success: true, app })
        }
      })
    })
  }

  // Solana implementations
  private async getSolanaBalance(address: string): Promise<any> {
    return { balance: 1.5, address }
  }

  private async sendSolanaTransaction(params: any): Promise<any> {
    return { signature: 'mock_signature_123', success: true }
  }

  private async getTokenPrice(token: string): Promise<any> {
    return { token, price: 100.50, currency: 'USD' }
  }

  private async swapTokens(params: any): Promise<any> {
    return { 
      success: true, 
      fromToken: params.fromToken, 
      toToken: params.toToken, 
      amount: params.amount 
    }
  }

  stop() {
    this.isRunning = false
    if (this.server) {
      this.server.close()
    }
    console.log(chalk.yellow('🛑 TerminAgent stopped'))
  }
}
