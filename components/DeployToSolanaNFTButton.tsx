import React, {
  useCallback,
  useState,
} from 'react'

import {
  Check,
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
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

interface NFTMetadata {
  name: string
  description: string
  image?: string
  animation_url?: string
  external_url?: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  properties: {
    category: string
    files: Array<{
      uri: string
      type: string
    }>
  }
}

interface DeploymentOptions {
  network: 'devnet' | 'mainnet-beta'
  useMetaplexCore: boolean
  useProgrammableNFT: boolean
  royalties: number
  mutable: boolean
  collection?: string
  ruleSet?: string
  creators: Array<{
    address: string
    share: number
  }>
}

export function DeployToSolanaNFTButton({ 
  appCode, 
  appName, 
  repoUrl 
}: { 
  appCode: string
  appName: string
  repoUrl?: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStep, setDeploymentStep] = useState<
    'metadata' | 'upload' | 'mint' | 'complete'
  >('metadata')
  
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata>({
    name: appName || 'My Solana App NFT',
    description: 'A decentralized application deployed as an NFT on Solana',
    attributes: [
      { trait_type: 'Type', value: 'Web Application' },
      { trait_type: 'Framework', value: 'React' },
      { trait_type: 'Blockchain', value: 'Solana' }
    ],
    properties: {
      category: 'application',
      files: []
    }
  })
  
  const [deploymentOptions, setDeploymentOptions] = useState<DeploymentOptions>({
    network: 'devnet',
    useMetaplexCore: true,
    useProgrammableNFT: false,
    royalties: 5,
    mutable: true,
    creators: []
  })
  
  const [uploadedFiles, setUploadedFiles] = useState<{
    image?: File
    animation?: File
  }>({})
  
  const [mintAddress, setMintAddress] = useState<string>('')
  
  const { toast } = useToast()
  const { connected, publicKey, signTransaction } = useWallet()

  const handleFileUpload = useCallback((type: 'image' | 'animation') => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        setUploadedFiles(prev => ({ ...prev, [type]: file }))
        
        // Update metadata with file info
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          setNftMetadata(prev => ({
            ...prev,
            [type === 'image' ? 'image' : 'animation_url']: dataUrl,
            properties: {
              ...prev.properties,
              files: [
                ...prev.properties.files.filter(f => 
                  !f.type.startsWith(type === 'image' ? 'image' : 'video')
                ),
                {
                  uri: dataUrl,
                  type: file.type
                }
              ]
            }
          }))
        }
        reader.readAsDataURL(file)
      }
    }
  }, [])

  const handleMetadataChange = useCallback((field: keyof NFTMetadata, value: any) => {
    setNftMetadata(prev => ({ ...prev, [field]: value }))
  }, [])

  const addAttribute = useCallback(() => {
    setNftMetadata(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }]
    }))
  }, [])

  const updateAttribute = useCallback((index: number, field: 'trait_type' | 'value', value: string) => {
    setNftMetadata(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }))
  }, [])

  const removeAttribute = useCallback((index: number) => {
    setNftMetadata(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }))
  }, [])

  const addCreator = useCallback(() => {
    setDeploymentOptions(prev => ({
      ...prev,
      creators: [...prev.creators, { address: '', share: 0 }]
    }))
  }, [])

  const updateCreator = useCallback((index: number, field: 'address' | 'share', value: string | number) => {
    setDeploymentOptions(prev => ({
      ...prev,
      creators: prev.creators.map((creator, i) => 
        i === index ? { ...creator, [field]: value } : creator
      )
    }))
  }, [])

  const removeCreator = useCallback((index: number) => {
    setDeploymentOptions(prev => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index)
    }))
  }, [])

  const uploadToLighthouse = async (data: any): Promise<string> => {
    try {
      const response = await fetch('/api/upload-to-lighthouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          type: 'json'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload to Lighthouse')
      }
      
      const result = await response.json()
      return result.url
    } catch (error) {
      console.error('Lighthouse upload error:', error)
      throw error
    }
  }

  const deployAsNFT = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to deploy as NFT.",
        variant: "destructive",
      })
      return
    }

    setIsDeploying(true)
    setDeploymentStep('upload')

    try {
      // Step 1: Upload app files to Arweave/IPFS
      toast({
        title: "Uploading Application",
        description: "Uploading your app to decentralized storage...",
      })

      const appBundle = {
        code: appCode,
        name: appName,
        repoUrl,
        timestamp: Date.now(),
        type: 'solana-app-nft'
      }

      const appUrl = await uploadToLighthouse(appBundle)
      
      // Update metadata with app URL
      const finalMetadata = {
        ...nftMetadata,
        animation_url: appUrl,
        external_url: repoUrl,
        properties: {
          ...nftMetadata.properties,
          files: [
            ...nftMetadata.properties.files,
            {
              uri: appUrl,
              type: 'application/json'
            }
          ]
        }
      }

      // Step 2: Upload metadata to Lighthouse
      const metadataUrl = await uploadToLighthouse(finalMetadata)
      
      setDeploymentStep('mint')
      
      // Step 3: Mint NFT using Metaplex
      toast({
        title: "Minting NFT",
        description: "Creating your NFT on Solana...",
      })

      const mintResponse = await fetch('/api/mint-solana-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadataUrl,
          walletPublicKey: publicKey.toString(),
          network: deploymentOptions.network,
          useMetaplexCore: deploymentOptions.useMetaplexCore,
          useProgrammableNFT: deploymentOptions.useProgrammableNFT,
          royalties: deploymentOptions.royalties,
          mutable: deploymentOptions.mutable,
          collection: deploymentOptions.collection,
          ruleSet: deploymentOptions.ruleSet,
          creators: deploymentOptions.creators.length > 0 ? deploymentOptions.creators : undefined
        })
      })

      if (!mintResponse.ok) {
        throw new Error('Failed to mint NFT')
      }

      const mintResult = await mintResponse.json()
      setMintAddress(mintResult.mintAddress)
      setDeploymentStep('complete')

      toast({
        title: "NFT Deployed Successfully!",
        description: `Your app has been deployed as NFT: ${mintResult.mintAddress}`,
      })

    } catch (error) {
      console.error('NFT deployment error:', error)
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "An error occurred during NFT deployment.",
        variant: "destructive",
      })
      setDeploymentStep('metadata')
    } finally {
      setIsDeploying(false)
    }
  }

  const getStepStatus = (step: string) => {
    const steps = ['metadata', 'upload', 'mint', 'complete']
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
          className="relative group hover:bg-purple-50 dark:hover:bg-purple-950/30"
        >
          <div className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 397.7 311.7"
              className="transition-transform group-hover:scale-110"
            >
              <linearGradient id="solanaGradient" x1="360.8791" y1="351.4553" x2="141.213" y2="-69.2936" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#00FFA3"/>
                <stop offset="1" stopColor="#DC1FFF"/>
              </linearGradient>
              <path d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" fill="url(#solanaGradient)"/>
              <path d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" fill="url(#solanaGradient)"/>
              <path d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" fill="url(#solanaGradient)"/>
            </svg>
            <span className="text-purple-700 dark:text-purple-400">
              Deploy as Solana NFT
            </span>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deploy App as Solana NFT</DialogTitle>
          <DialogDescription>
            Turn your application into a unique NFT on the Solana blockchain using Metaplex Core
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[
            { id: 'metadata', label: 'Metadata', icon: Upload },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'mint', label: 'Mint NFT', icon: Wallet },
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
                Connect your Solana wallet to deploy your app as an NFT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
            </CardContent>
          </Card>
        )}

        {/* NFT Metadata Form */}
        {connected && deploymentStep === 'metadata' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>NFT Metadata</CardTitle>
                <CardDescription>
                  Configure the metadata for your application NFT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">NFT Name</Label>
                    <Input
                      id="name"
                      value={nftMetadata.name}
                      onChange={(e) => handleMetadataChange('name', e.target.value)}
                      placeholder="My Awesome App NFT"
                    />
                  </div>
                  <div>
                    <Label htmlFor="external_url">External URL</Label>
                    <Input
                      id="external_url"
                      value={nftMetadata.external_url || ''}
                      onChange={(e) => handleMetadataChange('external_url', e.target.value)}
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={nftMetadata.description}
                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                    placeholder="Describe your application..."
                    rows={3}
                  />
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="image">NFT Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload('image')}
                    />
                    {uploadedFiles.image && (
                      <Badge variant="secondary" className="mt-2">
                        {uploadedFiles.image.name}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="animation">Animation/Video (Optional)</Label>
                    <Input
                      id="animation"
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload('animation')}
                    />
                    {uploadedFiles.animation && (
                      <Badge variant="secondary" className="mt-2">
                        {uploadedFiles.animation.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Attributes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Attributes</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                      Add Attribute
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {nftMetadata.attributes.map((attr, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Trait type"
                          value={attr.trait_type}
                          onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                        />
                        <Input
                          placeholder="Value"
                          value={attr.value}
                          onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                        />
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deployment Options</CardTitle>
                <CardDescription>
                  Configure how your NFT will be deployed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Label htmlFor="royalties">Royalties (%)</Label>
                    <Input
                      id="royalties"
                      type="number"
                      min="0"
                      max="50"
                      value={deploymentOptions.royalties}
                      onChange={(e) =>
                        setDeploymentOptions(prev => ({
                          ...prev,
                          royalties: parseInt(e.target.value) || 0
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="metaplex-core">Use Metaplex Core</Label>
                    <p className="text-sm text-muted-foreground">
                      More efficient and cost-effective NFT standard
                    </p>
                  </div>
                  <Switch
                    id="metaplex-core"
                    checked={deploymentOptions.useMetaplexCore}
                    onCheckedChange={(checked) =>
                      setDeploymentOptions(prev => ({ ...prev, useMetaplexCore: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="programmable-nft">Programmable NFT (pNFT)</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable royalty enforcement and transfer restrictions
                    </p>
                  </div>
                  <Switch
                    id="programmable-nft"
                    checked={deploymentOptions.useProgrammableNFT}
                    onCheckedChange={(checked) =>
                      setDeploymentOptions(prev => ({ ...prev, useProgrammableNFT: checked }))
                    }
                  />
                </div>

                {deploymentOptions.useProgrammableNFT && (
                  <div>
                    <Label htmlFor="ruleSet">Rule Set (Optional)</Label>
                    <Input
                      id="ruleSet"
                      value={deploymentOptions.ruleSet || ''}
                      onChange={(e) =>
                        setDeploymentOptions(prev => ({ ...prev, ruleSet: e.target.value }))
                      }
                      placeholder="Enter custom rule set address (leave empty for default)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to use Metaplex&apos;s default royalty enforcement rules
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mutable">Mutable Metadata</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow metadata to be updated after minting
                    </p>
                  </div>
                  <Switch
                    id="mutable"
                    checked={deploymentOptions.mutable}
                    onCheckedChange={(checked) =>
                      setDeploymentOptions(prev => ({ ...prev, mutable: checked }))
                    }
                  />
                </div>

                {/* Creators Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Creators (Optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCreator}>
                      Add Creator
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add multiple creators to share royalties. Total shares must equal 100%.
                  </p>
                  <div className="space-y-2">
                    {deploymentOptions.creators.map((creator, index) => (
                      <div key={index} className="flex items-center gap-2">
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
                    {deploymentOptions.creators.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Total: {deploymentOptions.creators.reduce((sum, creator) => sum + creator.share, 0)}%
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={deployAsNFT}
              disabled={isDeploying || !nftMetadata.name || !nftMetadata.description}
              className="w-full"
            >
              {isDeploying ? (
                <div className="flex items-center gap-2">
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  Deploying...
                </div>
              ) : (
                'Deploy as NFT'
              )}
            </Button>
          </div>
        )}

        {/* Success Screen */}
        {deploymentStep === 'complete' && mintAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                NFT Deployed Successfully!
              </CardTitle>
              <CardDescription>
                Your application has been successfully deployed as an NFT on Solana
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Mint Address</Label>
                <div className="flex items-center gap-2">
                  <Input value={mintAddress} readOnly />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(mintAddress)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(
                    `https://explorer.solana.com/address/${mintAddress}${
                      deploymentOptions.network === 'devnet' ? '?cluster=devnet' : ''
                    }`,
                    '_blank'
                  )}
                >
                  View on Explorer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(
                    `https://magiceden.io/item-details/${mintAddress}`,
                    '_blank'
                  )}
                >
                  View on Magic Eden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
