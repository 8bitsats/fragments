import React, {
  useCallback,
  useState,
} from 'react'

import {
  Check,
  Code,
  LoaderIcon,
  Upload,
  Wallet,
} from 'lucide-react'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

interface ProgramDeploymentOptions {
  programName: string
  programType: 'anchor' | 'native' | 'seahorse'
  network: 'devnet' | 'mainnet-beta'
  buildTarget: 'deploy' | 'lib'
  features: string[]
  dependencies: Record<string, string>
}

interface DeploymentResult {
  programId: string
  programKeypair: number[]
  buildResult: {
    bytecodeSize: number
    bytecodeUrl: string
    bytecodeCid: string
    estimatedCostSOL: number
    estimatedCostLamports: number
  }
  sourceCode: {
    url: string
    cid: string
    cargoToml: string
    libRs: string
  }
  explorerUrl: string
}

export function DeployToSolanaProgramButton({ 
  appCode, 
  appName 
}: { 
  appCode: string
  appName: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStep, setDeploymentStep] = useState<
    'config' | 'build' | 'upload' | 'complete'
  >('config')
  
  const [deploymentOptions, setDeploymentOptions] = useState<ProgramDeploymentOptions>({
    programName: appName.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'my_program',
    programType: 'anchor',
    network: 'devnet',
    buildTarget: 'deploy',
    features: [],
    dependencies: {}
  })
  
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)
  const [newFeature, setNewFeature] = useState('')
  const [newDepName, setNewDepName] = useState('')
  const [newDepVersion, setNewDepVersion] = useState('')
  
  const { toast } = useToast()
  const { connected, publicKey } = useWallet()

  const addFeature = useCallback(() => {
    if (newFeature.trim() && !deploymentOptions.features.includes(newFeature.trim())) {
      setDeploymentOptions(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }))
      setNewFeature('')
    }
  }, [newFeature, deploymentOptions.features])

  const removeFeature = useCallback((feature: string) => {
    setDeploymentOptions(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }))
  }, [])

  const addDependency = useCallback(() => {
    if (newDepName.trim() && newDepVersion.trim()) {
      setDeploymentOptions(prev => ({
        ...prev,
        dependencies: {
          ...prev.dependencies,
          [newDepName.trim()]: newDepVersion.trim()
        }
      }))
      setNewDepName('')
      setNewDepVersion('')
    }
  }, [newDepName, newDepVersion])

  const removeDependency = useCallback((depName: string) => {
    setDeploymentOptions(prev => ({
      ...prev,
      dependencies: Object.fromEntries(
        Object.entries(prev.dependencies).filter(([name]) => name !== depName)
      )
    }))
  }, [])

  const deployAsProgram = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to deploy as program.",
        variant: "destructive",
      })
      return
    }

    setIsDeploying(true)
    setDeploymentStep('build')

    try {
      // Step 1: Build and prepare program
      toast({
        title: "Building Program",
        description: "Compiling your code into a Solana program...",
      })

      const buildResponse = await fetch('/api/deploy-solana-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programCode: appCode,
          programName: deploymentOptions.programName,
          walletPublicKey: publicKey.toString(),
          network: deploymentOptions.network,
          programType: deploymentOptions.programType,
          buildTarget: deploymentOptions.buildTarget,
          features: deploymentOptions.features,
          dependencies: deploymentOptions.dependencies
        })
      })

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json()
        throw new Error(errorData.error || 'Failed to build program')
      }

      const buildResult = await buildResponse.json()
      
      if (!buildResult.success) {
        throw new Error(buildResult.errors?.join('\n') || 'Build failed')
      }

      setDeploymentStep('upload')

      // Step 2: Upload to storage (already done in the API)
      toast({
        title: "Uploading to Storage",
        description: "Storing source code and bytecode on IPFS via Lighthouse...",
      })

      setDeploymentStep('complete')
      setDeploymentResult(buildResult)

      toast({
        title: "Program Built Successfully!",
        description: `Your program ${deploymentOptions.programName} is ready for deployment.`,
      })

    } catch (error) {
      console.error('Program deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "An error occurred during program deployment.",
        variant: "destructive",
      })
      setDeploymentStep('config')
    } finally {
      setIsDeploying(false)
    }
  }

  const getStepStatus = (step: string) => {
    const steps = ['config', 'build', 'upload', 'complete']
    const currentIndex = steps.indexOf(deploymentStep)
    const stepIndex = steps.indexOf(step)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex && isDeploying) return 'current'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="relative group hover:bg-blue-50 dark:hover:bg-blue-950/30"
        >
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="text-blue-700 dark:text-blue-400">
              Deploy as Solana Program
            </span>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deploy as Solana Program</DialogTitle>
          <DialogDescription>
            Turn your application into a deployable Solana program using Anchor, Native Rust, or Seahorse
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[
            { id: 'config', label: 'Configure', icon: Upload },
            { id: 'build', label: 'Build', icon: Code },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'complete', label: 'Complete', icon: Check }
          ].map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2
                  ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                    status === 'current' ? 'bg-blue-500 border-blue-500 text-white' :
                    'bg-gray-100 border-gray-300 text-gray-400'}
                `}>
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : status === 'current' && isDeploying ? (
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="ml-2 text-sm font-medium">{step.label}</span>
                {index < 3 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            )
          })}
        </div>

        {/* Wallet Connection */}
        {!connected && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </CardTitle>
              <CardDescription>
                Connect your Solana wallet to deploy your program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
            </CardContent>
          </Card>
        )}

        {/* Configuration Form */}
        {connected && deploymentStep === 'config' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Program Configuration</CardTitle>
                <CardDescription>
                  Configure your Solana program deployment settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="programName">Program Name</Label>
                    <Input
                      id="programName"
                      value={deploymentOptions.programName}
                      onChange={(e) =>
                        setDeploymentOptions(prev => ({
                          ...prev,
                          programName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                        }))
                      }
                      placeholder="my_awesome_program"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must be lowercase with underscores only
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="programType">Program Type</Label>
                    <Select
                      value={deploymentOptions.programType}
                      onValueChange={(value: 'anchor' | 'native' | 'seahorse') =>
                        setDeploymentOptions(prev => ({ ...prev, programType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anchor">Anchor Framework</SelectItem>
                        <SelectItem value="native">Native Rust</SelectItem>
                        <SelectItem value="seahorse">Seahorse (Python-like)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="network">Network</Label>
                    <Select
                      value={deploymentOptions.network}
                      onValueChange={(value: 'devnet' | 'mainnet-beta') =>
                        setDeploymentOptions(prev => ({ ...prev, network: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="devnet">Devnet (Free)</SelectItem>
                        <SelectItem value="mainnet-beta">Mainnet (Costs SOL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="buildTarget">Build Target</Label>
                    <Select
                      value={deploymentOptions.buildTarget}
                      onValueChange={(value: 'deploy' | 'lib') =>
                        setDeploymentOptions(prev => ({ ...prev, buildTarget: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deploy">Deployable Program</SelectItem>
                        <SelectItem value="lib">Library</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <Label>Features (Optional)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add feature flag"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    />
                    <Button type="button" variant="outline" onClick={addFeature}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deploymentOptions.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="cursor-pointer" onClick={() => removeFeature(feature)}>
                        {feature} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Dependencies */}
                <div>
                  <Label>Custom Dependencies (Optional)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Package name"
                      value={newDepName}
                      onChange={(e) => setNewDepName(e.target.value)}
                    />
                    <Input
                      placeholder="Version"
                      value={newDepVersion}
                      onChange={(e) => setNewDepVersion(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={addDependency}>
                      Add
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(deploymentOptions.dependencies).map(([name, version]) => (
                      <div key={name} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm">{name} = &quot;{version}&quot;</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDependency(name)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Program Type Descriptions */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Program Type Guide:</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div><strong>Anchor:</strong> High-level framework with automatic serialization and security features</div>
                    <div><strong>Native Rust:</strong> Low-level Solana program with full control and smaller size</div>
                    <div><strong>Seahorse:</strong> Python-like syntax that compiles to Anchor programs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={deployAsProgram}
              disabled={isDeploying || !deploymentOptions.programName}
              className="w-full"
            >
              {isDeploying ? (
                <div className="flex items-center gap-2">
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  Building Program...
                </div>
              ) : (
                'Build & Prepare Program'
              )}
            </Button>
          </div>
        )}

        {/* Success Screen */}
        {deploymentStep === 'complete' && deploymentResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                Program Built Successfully!
              </CardTitle>
              <CardDescription>
                Your program has been compiled and is ready for deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Program ID</Label>
                  <div className="flex items-center gap-2">
                    <Input value={deploymentResult.programId} readOnly className="text-sm" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(deploymentResult.programId, 'Program ID')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Estimated Cost</Label>
                  <div className="text-lg font-semibold">
                    {deploymentResult.buildResult.estimatedCostSOL.toFixed(4)} SOL
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Program Size: {(deploymentResult.buildResult.bytecodeSize / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>

              <div>
                <Label>Program Keypair (Save this securely!)</Label>
                <Textarea
                  value={JSON.stringify(deploymentResult.programKeypair)}
                  readOnly
                  className="text-xs h-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(JSON.stringify(deploymentResult.programKeypair), 'Program Keypair')}
                >
                  Copy Keypair
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Storage Links</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(deploymentResult.sourceCode.url, '_blank')}
                  >
                    View Source Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(deploymentResult.buildResult.bytecodeUrl, '_blank')}
                  >
                    View Bytecode
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Next Steps</Label>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div>1. Save the program keypair in a secure location</div>
                  <div>2. Ensure you have {deploymentResult.buildResult.estimatedCostSOL.toFixed(4)} SOL for deployment</div>
                  <div>3. Use Solana CLI or deploy via Solana Playground</div>
                  <div>4. Deploy command: <code className="bg-muted px-1">solana program deploy [bytecode.so]</code></div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(deploymentResult.explorerUrl, '_blank')}
                >
                  View on Explorer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://beta.solpg.io', '_blank')}
                >
                  Deploy on Solana Playground
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
