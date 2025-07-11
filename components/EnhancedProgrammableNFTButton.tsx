import React, {
  useCallback,
  useState,
} from 'react'

import {
  Check,
  Code2,
  LoaderIcon,
  Shield,
  Star,
  Upload,
  Wallet,
  Zap,
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
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

interface EnhancedProgrammableNFTConfig {
  // Basic app info
  appName: string
  appDescription: string
  appType: 'web' | 'mobile' | 'game' | 'defi' | 'ai' | 'tool'
  framework: string
  repoUrl?: string
  demoUrl?: string
  
  // Network and deployment
  network: 'devnet' | 'mainnet-beta'
  
  // Programmable NFT features
  useProgrammableNFT: boolean
  royalties: number
  mutable: boolean
  
  // Rule set configuration
  ruleSetType: 'default' | 'custom' | 'none'
  customRuleSet?: string
  
  // Advanced features
  maxSupply?: number
  useThrottling?: boolean
  requireSignature?: boolean
  enableBurning?: boolean
  
  // Collection and creators
  collection?: string
  creators: Array<{
    address: string
    share: number
    verified?: boolean
  }>
  
  // Custom attributes
  customAttributes: Array<{
    trait_type: string
    value: string | number
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date'
  }>
}

interface DeploymentResult {
  success: boolean
  mintAddress: string
  signature: string
  network: string
  tokenStandard: string
  ruleSetType: string
  metadataUrl: string
  appBundleUrl?: string
  explorerUrl: string
  magicEdenUrl: string
  appMetadata: {
    name: string
    type: string
    framework: string
    codeHash: string
    hasCode: boolean
  }
  royaltyInfo: {
    percentage: number
    creators: number
    enforcementEnabled: boolean
  }
}

export function EnhancedProgrammableNFTButton({ 
  appCode, 
  appName, 
  repoUrl,
  demoUrl 
}: { 
  appCode: string
  appName: string
  repoUrl?: string
  demoUrl?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStep, setDeploymentStep] = useState<
    'config' | 'upload' | 'mint' | 'complete'
  >('config')
  
  const [config, setConfig] = useState<EnhancedProgrammableNFTConfig>({
    appName: appName || 'My Solana App NFT',
    appDescription: 'A decentralized application deployed as a Programmable NFT on Solana with royalty enforcement',
    appType: 'web',
    framework: 'React',
    repoUrl,
    demoUrl,
    network: 'devnet',
    useProgrammableNFT: true,
    royalties: 5,
    mutable: true,
    ruleSetType: 'default',
    useThrottling: false,
    requireSignature: false,
    enableBurning: false,
    creators: [],
    customAttributes: [
      { trait_type: 'Framework', value: 'React' },
      { trait_type: 'Deployment Type', value: 'Programmable NFT' },
      { trait_type: 'Royalty Enforcement', value: 'Enabled' }
    ]
  })
  
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)
  
  const { toast } = useToast()
  const { connected, publicKey } = useWallet()

  const handleConfigChange = useCallback((field: keyof EnhancedProgrammableNFTConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }, [])

  const addCreator = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      creators: [...prev.creators, { address: '', share: 0, verified: false }]
    }))
  }, [])

  const updateCreator = useCallback((index: number, field: 'address' | 'share' | 'verified', value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      creators: prev.creators.map((creator, i) => 
        i === index ? { ...creator, [field]: value } : creator
      )
    }))
  }, [])

  const removeCreator = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index)
    }))
  }, [])

  const addAttribute = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      customAttributes: [...prev.customAttributes, { trait_type: '', value: '' }]
    }))
  }, [])

  const updateAttribute = useCallback((index: number, field: 'trait_type' | 'value' | 'display_type', value: string) => {
    setConfig(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }))
  }, [])

  const removeAttribute = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.filter((_, i) => i !== index)
    }))
  }, [])

  const deployAsEnhancedProgrammableNFT = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to deploy as Programmable NFT.",
        variant: "destructive",
      })
      return
    }

    setIsDeploying(true)
    setDeploymentStep('upload')

    try {
      toast({
        title: "🚀 Creating Enhanced Programmable NFT",
        description: "Deploying your app with royalty enforcement and transfer restrictions...",
      })

      // Prepare creators - if none specified, use the connected wallet
      const creators = config.creators.length > 0 
        ? config.creators 
        : [{ address: publicKey.toString(), share: 100, verified: true }]

      // Validate creators total share
      const totalShare = creators.reduce((sum, creator) => sum + creator.share, 0)
      if (totalShare !== 100) {
        throw new Error(`Creator shares must total 100%. Current total: ${totalShare}%`)
      }

      setDeploymentStep('mint')

      // Call the enhanced programmable NFT API
      const response = await fetch('/api/programmable-nft-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          appCode,
          walletPublicKey: publicKey.toString(),
          creators
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create enhanced programmable NFT')
      }

      const result: DeploymentResult = await response.json()
      setDeploymentResult(result)
      setDeploymentStep('complete')

      toast({
        title: "🎉 Enhanced Programmable NFT Created!",
        description: `Your app is now a programmable NFT with royalty enforcement: ${result.mintAddress.slice(0, 8)}...`,
      })

    } catch (error) {
      console.error('Enhanced Programmable NFT deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "An error occurred during deployment.",
        variant: "destructive",
      })
      setDeploymentStep('config')
    } finally {
      setIsDeploying(false)
    }
  }

  const getStepStatus = (step: string) => {
    const steps = ['config', 'upload', 'mint', 'complete']
    const currentIndex = steps.indexOf(deploymentStep)
    const stepIndex = steps.indexOf(step)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex && isDeploying) return 'current'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="relative group hover:bg-gradient-to-r hover:from-purple-50 hover:to-orange-50 dark:hover:from-purple-950/30 dark:hover:to-orange-950/30 border-purple-200 hover:border-purple-300"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="w-5 h-5 text-purple-600 transition-transform group-hover:scale-110" />
              <Star className="w-3 h-3 text-orange-500 absolute -top-1 -right-1" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-orange-600 text-transparent bg-clip-text font-medium">
              Enhanced Programmable NFT
            </span>
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30">
              Royalty Enforced
            </Badge>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Enhanced Programmable NFT Deployment
            <Badge className="bg-gradient-to-r from-purple-500 to-orange-500 text-white">
              Premium
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Create a programmable NFT with royalty enforcement, transfer restrictions, and advanced features using Metaplex Core
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-purple-50 to-orange-50 dark:from-purple-950/20 dark:to-orange-950/20 rounded-lg">
          {[
            { id: 'config', label: 'Configure', icon: Shield },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'mint', label: 'Mint pNFT', icon: Zap },
            { id: 'complete', label: 'Complete', icon: Check }
          ].map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                    status === 'current' ? 'bg-purple-500 border-purple-500 text-white' :
                    'bg-gray-100 border-gray-300 text-gray-400'}
                `}>
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : status === 'current' && isDeploying ? (
                    <LoaderIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className="ml-2 text-sm font-medium">{step.label}</span>
                {index < 3 && (
                  <div className={`
                    w-16 h-0.5 mx-4
                    ${status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            )
          })}
        </div>

        {/* Wallet Connection */}
        {!connected && (
          <Card className="mb-6 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                Connect Wallet
              </CardTitle>
              <CardDescription>
                Connect your Solana wallet to deploy your app as an enhanced programmable NFT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-orange-600 hover:!from-purple-700 hover:!to-orange-700" />
            </CardContent>
          </Card>
        )}

        {/* Configuration Form */}
        {connected && deploymentStep === 'config' && (
          <div className="space-y-6">
            {/* App Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  App Information
                </CardTitle>
                <CardDescription>
                  Configure the basic information for your programmable NFT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="appName">App Name</Label>
                    <Input
                      id="appName"
                      value={config.appName}
                      onChange={(e) => handleConfigChange('appName', e.target.value)}
                      placeholder="My Awesome Solana App"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appType">App Type</Label>
                    <Select
                      value={config.appType}
                      onValueChange={(value) => handleConfigChange('appType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web Application</SelectItem>
                        <SelectItem value="mobile">Mobile App</SelectItem>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="defi">DeFi Protocol</SelectItem>
                        <SelectItem value="ai">AI Tool</SelectItem>
                        <SelectItem value="tool">Development Tool</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="appDescription">Description</Label>
                  <Textarea
                    id="appDescription"
                    value={config.appDescription}
                    onChange={(e) => handleConfigChange('appDescription', e.target.value)}
                    placeholder="Describe your application..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="framework">Framework</Label>
                    <Input
                      id="framework"
                      value={config.framework}
                      onChange={(e) => handleConfigChange('framework', e.target.value)}
                      placeholder="React, Vue, Svelte..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="repoUrl">Repository URL</Label>
                    <Input
                      id="repoUrl"
                      value={config.repoUrl || ''}
                      onChange={(e) => handleConfigChange('repoUrl', e.target.value)}
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Programmable NFT Configuration */}
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Programmable NFT Features
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    Royalty Enforcement
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure royalty enforcement and transfer restrictions using Metaplex programmable NFTs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                    🛡️ What are Programmable NFTs?
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Programmable NFTs enforce creator royalties by specifying which programs can transfer the NFT. 
                    This ensures creators get paid on secondary sales and prevents royalty circumvention.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="useProgrammableNFT">Enable Programmable NFT</Label>
                    <p className="text-sm text-muted-foreground">
                      Enforce royalties and enable transfer restrictions
                    </p>
                  </div>
                  <Switch
                    id="useProgrammableNFT"
                    checked={config.useProgrammableNFT}
                    onCheckedChange={(checked) => handleConfigChange('useProgrammableNFT', checked)}
                  />
                </div>

                {config.useProgrammableNFT && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ruleSetType">Rule Set Type</Label>
                        <Select
                          value={config.ruleSetType}
                          onValueChange={(value) => handleConfigChange('ruleSetType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default (Metaplex Community)</SelectItem>
                            <SelectItem value="custom">Custom Rule Set</SelectItem>
                            <SelectItem value="none">No Restrictions</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Default enforces royalties on major marketplaces
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="royalties">Royalties (%)</Label>
                        <Input
                          id="royalties"
                          type="number"
                          min="0"
                          max="50"
                          value={config.royalties}
                          onChange={(e) => handleConfigChange('royalties', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {config.ruleSetType === 'custom' && (
                      <div>
                        <Label htmlFor="customRuleSet">Custom Rule Set Address</Label>
                        <Input
                          id="customRuleSet"
                          value={config.customRuleSet || ''}
                          onChange={(e) => handleConfigChange('customRuleSet', e.target.value)}
                          placeholder="Enter rule set public key"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="network">Network</Label>
                    <Select
                      value={config.network}
                      onValueChange={(value) => handleConfigChange('network', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="devnet">Devnet (Free Testing)</SelectItem>
                        <SelectItem value="mainnet-beta">Mainnet (Costs SOL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="mutable">Mutable Metadata</Label>
                      <p className="text-xs text-muted-foreground">Allow updates after minting</p>
                    </div>
                    <Switch
                      id="mutable"
                      checked={config.mutable}
                      onCheckedChange={(checked) => handleConfigChange('mutable', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Features */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
                <CardDescription>
                  Optional advanced features for your programmable NFT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Transfer Throttling</Label>
                      <p className="text-xs text-muted-foreground">Rate limit transfers</p>
                    </div>
                    <Switch
                      checked={config.useThrottling}
                      onCheckedChange={(checked) => handleConfigChange('useThrottling', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Signature</Label>
                      <p className="text-xs text-muted-foreground">Extra security for transfers</p>
                    </div>
                    <Switch
                      checked={config.requireSignature}
                      onCheckedChange={(checked) => handleConfigChange('requireSignature', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Burning</Label>
                      <p className="text-xs text-muted-foreground">Allow NFT to be burned</p>
                    </div>
                    <Switch
                      checked={config.enableBurning}
                      onCheckedChange={(checked) => handleConfigChange('enableBurning', checked)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxSupply">Max Supply (Optional)</Label>
                    <Input
                      id="maxSupply"
                      type="number"
                      min="1"
                      value={config.maxSupply || ''}
                      onChange={(e) => handleConfigChange('maxSupply', parseInt(e.target.value) || undefined)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creators */}
            <Card>
              <CardHeader>
                <CardTitle>Creators & Royalty Distribution</CardTitle>
                <CardDescription>
                  Configure creators who will receive royalties from secondary sales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add multiple creators to share royalties. Total shares must equal 100%.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addCreator}>
                    Add Creator
                  </Button>
                </div>
                <div className="space-y-2">
                  {config.creators.map((creator, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Input
                        placeholder="Creator wallet address"
                        value={creator.address}
                        onChange={(e) => updateCreator(index, 'address', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Share %"
                        type="number"
                        min="0"
                        max="100"
                        value={creator.share}
                        onChange={(e) => updateCreator(index, 'share', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={creator.verified}
                          onCheckedChange={(checked) => updateCreator(index, 'verified', checked)}
                        />
                        <Label className="text-xs">Verified</Label>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCreator(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {config.creators.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No creators added. Your wallet will be set as the default creator with 100% share.
                    </p>
                  )}
                  {config.creators.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total: {config.creators.reduce((sum, creator) => sum + creator.share, 0)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custom Attributes */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Attributes</CardTitle>
                <CardDescription>
                  Add custom metadata attributes for your app NFT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add custom attributes to describe your application
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                    Add Attribute
                  </Button>
                </div>
                <div className="space-y-2">
                  {config.customAttributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Attribute name"
                        value={attr.trait_type}
                        onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        value={attr.value}
                        onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                      />
                      <Select
                        value={attr.display_type || 'default'}
                        onValueChange={(value) => updateAttribute(index, 'display_type', value === 'default' ? '' : value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boost_percentage">Boost %</SelectItem>
                          <SelectItem value="boost_number">Boost Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttribute(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={deployAsEnhancedProgrammableNFT}
              disabled={isDeploying || !config.appName || !config.appDescription}
              className="w-full bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
              size="lg"
            >
              {isDeploying ? (
                <div className="flex items-center gap-2">
                  <LoaderIcon className="h-5 w-5 animate-spin" />
                  Creating Enhanced Programmable NFT...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Deploy as Enhanced Programmable NFT
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {config.useProgrammableNFT ? 'Royalty Enforced' : 'Standard'}
                  </Badge>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Success Screen */}
        {deploymentStep === 'complete' && deploymentResult && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Check className="w-6 h-6" />
                Enhanced Programmable NFT Created Successfully!
              </CardTitle>
              <CardDescription>
                Your application has been deployed as a programmable NFT with royalty enforcement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mint Address</Label>
                  <div className="flex items-center gap-2">
                    <Input value={deploymentResult.mintAddress} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(deploymentResult.mintAddress)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Token Standard</Label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">
                      {deploymentResult.tokenStandard}
                    </Badge>
                    {deploymentResult.royaltyInfo.enforcementEnabled && (
                      <Badge className="bg-green-100 text-green-700">
                        Royalty Enforced
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">App Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">App Type:</span> {deploymentResult.appMetadata.type}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Framework:</span> {deploymentResult.appMetadata.framework}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Has Code:</span> {deploymentResult.appMetadata.hasCode ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Royalties:</span> {deploymentResult.royaltyInfo.percentage}%
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Features Enabled</h4>
                <div className="flex flex-wrap gap-2">
                  {deploymentResult.royaltyInfo.enforcementEnabled && (
                    <Badge className="bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3 mr-1" />
                      Royalty Enforcement
                    </Badge>
                  )}
                  <Badge className="bg-blue-100 text-blue-700">
                    <Code2 className="w-3 h-3 mr-1" />
                    App Bundle Stored
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-700">
                    <Star className="w-3 h-3 mr-1" />
                    Enhanced Metadata
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(deploymentResult.explorerUrl, '_blank')}
                  className="flex-1"
                >
                  View on Solana Explorer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(deploymentResult.magicEdenUrl, '_blank')}
                  className="flex-1"
                >
                  View on Magic Eden
                </Button>
              </div>

              {deploymentResult.appBundleUrl && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(deploymentResult.appBundleUrl, '_blank')}
                    className="w-full"
                  >
                    View App Bundle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
