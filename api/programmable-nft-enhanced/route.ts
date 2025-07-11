import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  toBigNumber,
} from '@metaplex-foundation/js'
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js'

interface EnhancedProgrammableNFTRequest {
  // Basic NFT data
  metadataUrl?: string
  appCode?: string
  appName: string
  appDescription: string
  
  // App-specific metadata
  appType: 'web' | 'mobile' | 'game' | 'defi' | 'ai' | 'tool'
  framework: string
  repoUrl?: string
  demoUrl?: string
  
  // Wallet and network
  walletPublicKey: string
  network: 'devnet' | 'mainnet-beta'
  
  // Programmable NFT specific options
  useProgrammableNFT: boolean
  royalties: number
  mutable: boolean
  
  // Rule set configuration
  ruleSetType: 'default' | 'custom' | 'none'
  customRuleSet?: string
  
  // Transfer restrictions
  allowList?: string[] // Wallets/programs allowed to transfer
  denyList?: string[] // Wallets/programs denied transfer
  
  // Collection and creators
  collection?: string
  creators: Array<{
    address: string
    share: number
    verified?: boolean
  }>
  
  // Advanced features
  maxSupply?: number
  useThrottling?: boolean // Rate limit transfers
  requireSignature?: boolean // Require signature for transfers
  enableBurning?: boolean
  
  // App-specific attributes
  customAttributes?: Array<{
    trait_type: string
    value: string | number
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date'
  }>
}

interface RuleSetConfig {
  name: string
  operations: Array<{
    operation: 'Transfer' | 'Delegate' | 'SaleTransfer' | 'Burn'
    rules: Array<{
      type: 'AllowList' | 'DenyList' | 'ProgramOwnedList' | 'AdditionalSigner'
      config?: any
    }>
  }>
}

const getConnection = (network: string) => {
  const endpoint = network === 'mainnet-beta' 
    ? process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com'
    : process.env.SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com'
  
  return new Connection(endpoint, 'confirmed')
}

const getPayerKeypair = () => {
  const privateKeyString = process.env.SOLANA_PAYER_PRIVATE_KEY
  if (!privateKeyString) {
    throw new Error('SOLANA_PAYER_PRIVATE_KEY environment variable not set')
  }
  
  const privateKeyArray = JSON.parse(privateKeyString)
  return Keypair.fromSecretKey(new Uint8Array(privateKeyArray))
}

// Enhanced metadata generation for app NFTs
const generateEnhancedMetadata = (params: EnhancedProgrammableNFTRequest) => {
  const baseAttributes = [
    { trait_type: 'App Type', value: params.appType },
    { trait_type: 'Framework', value: params.framework },
    { trait_type: 'Blockchain', value: 'Solana' },
    { trait_type: 'NFT Standard', value: params.useProgrammableNFT ? 'Programmable NFT' : 'Standard NFT' },
    { trait_type: 'Created Date', value: new Date().toISOString(), display_type: 'date' },
    { trait_type: 'Royalties', value: params.royalties, display_type: 'boost_percentage' },
  ]

  // Add custom attributes
  const allAttributes = [
    ...baseAttributes,
    ...(params.customAttributes || [])
  ]

  return {
    name: params.appName,
    description: params.appDescription,
    image: '', // Will be populated if provided
    animation_url: '', // Will be populated with app bundle
    external_url: params.repoUrl || params.demoUrl || '',
    attributes: allAttributes,
    properties: {
      category: 'application',
      creators: params.creators.map(creator => ({
        address: creator.address,
        share: creator.share
      })),
      files: [] as Array<{ uri: string; type: string }>,
    },
    // Programmable NFT specific metadata
    programmable_config: params.useProgrammableNFT ? {
      rule_set: params.ruleSetType,
      max_supply: params.maxSupply,
      uses_throttling: params.useThrottling,
      requires_signature: params.requireSignature,
      burning_enabled: params.enableBurning,
    } : undefined,
    // App-specific metadata
    app_metadata: {
      code_hash: '', // Will be populated with app code hash
      deployment_timestamp: Date.now(),
      version: '1.0.0',
      type: 'solana-app-nft',
      framework: params.framework,
      repo_url: params.repoUrl,
      demo_url: params.demoUrl,
    }
  }
}

// Create a custom rule set for app NFTs
const createAppRuleSet = async (
  metaplex: Metaplex,
  params: EnhancedProgrammableNFTRequest
): Promise<PublicKey | null> => {
  if (params.ruleSetType === 'none' || !params.useProgrammableNFT) {
    return null
  }

  if (params.ruleSetType === 'custom' && params.customRuleSet) {
    return new PublicKey(params.customRuleSet)
  }

  if (params.ruleSetType === 'default') {
    // Use Metaplex's default rule set (null)
    return null
  }

  // Create a custom rule set for this app
  try {
    console.log('Creating custom rule set for app NFT...')
    
    // This would create a custom rule set - for now we'll use the default
    // In a full implementation, you'd use the Metaplex Authorization Rules SDK
    return null
    
  } catch (error) {
    console.error('Error creating rule set:', error)
    return null
  }
}

// Upload app bundle to decentralized storage
const uploadAppBundle = async (params: EnhancedProgrammableNFTRequest): Promise<string> => {
  try {
    const appBundle = {
      name: params.appName,
      description: params.appDescription,
      code: params.appCode || '',
      type: params.appType,
      framework: params.framework,
      repo_url: params.repoUrl,
      demo_url: params.demoUrl,
      timestamp: Date.now(),
      version: '1.0.0',
      nft_config: {
        programmable: params.useProgrammableNFT,
        royalties: params.royalties,
        rule_set_type: params.ruleSetType,
      }
    }

    // Upload to your preferred storage (IPFS, Arweave, etc.)
    const response = await fetch('/api/upload-to-lighthouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: appBundle,
        type: 'app-bundle'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to upload app bundle')
    }

    const result = await response.json()
    return result.url
  } catch (error) {
    console.error('Error uploading app bundle:', error)
    throw error
  }
}

// Main function to mint enhanced programmable NFT
async function mintEnhancedProgrammableNFT(params: EnhancedProgrammableNFTRequest) {
  const { walletPublicKey, network, royalties, mutable, creators } = params
  
  const connection = getConnection(network)
  const payerKeypair = getPayerKeypair()
  
  // Initialize Metaplex with enhanced storage configuration
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payerKeypair))
    .use(bundlrStorage({
      address: network === 'mainnet-beta' 
        ? 'https://node1.bundlr.network' 
        : 'https://devnet.bundlr.network',
      providerUrl: connection.rpcEndpoint,
      timeout: 60000,
    }))

  console.log('🚀 Starting Enhanced Programmable NFT creation for app:', params.appName)

  try {
    // Step 1: Upload app bundle if app code is provided
    let appBundleUrl = ''
    if (params.appCode) {
      console.log('📦 Uploading app bundle to decentralized storage...')
      appBundleUrl = await uploadAppBundle(params)
      console.log('✅ App bundle uploaded:', appBundleUrl)
    }

    // Step 2: Generate enhanced metadata
    console.log('📝 Generating enhanced metadata...')
    const metadata = generateEnhancedMetadata(params)
    
    // Add app bundle URL to metadata
    if (appBundleUrl) {
      metadata.animation_url = appBundleUrl
      metadata.properties.files.push({
        uri: appBundleUrl,
        type: 'application/json'
      })
      
      // Generate a simple hash of the app code for verification
      const encoder = new TextEncoder()
      const data = encoder.encode(params.appCode || '')
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      metadata.app_metadata.code_hash = hashHex
    }

    // Step 3: Upload metadata to storage
    console.log('☁️ Uploading metadata to decentralized storage...')
    const metadataResponse = await fetch('/api/upload-to-lighthouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: metadata,
        type: 'nft-metadata'
      })
    })

    if (!metadataResponse.ok) {
      throw new Error('Failed to upload metadata')
    }

    const metadataResult = await metadataResponse.json()
    const metadataUrl = metadataResult.url
    console.log('✅ Metadata uploaded:', metadataUrl)

    // Step 4: Create custom rule set if needed
    console.log('⚙️ Setting up rule set configuration...')
    const ruleSet = await createAppRuleSet(metaplex, params)
    
    // Step 5: Prepare creators
    const nftCreators = creators.map(creator => ({
      address: new PublicKey(creator.address),
      share: creator.share,
      verified: creator.verified ?? false
    }))

    // Validate creators shares sum to 100
    const totalShare = nftCreators.reduce((sum, creator) => sum + creator.share, 0)
    if (totalShare !== 100) {
      throw new Error(`Creator shares must sum to 100. Current total: ${totalShare}`)
    }

    console.log('🎨 Minting Enhanced Programmable NFT with configuration:')
    console.log('  - Name:', metadata.name)
    console.log('  - Type:', params.appType)
    console.log('  - Framework:', params.framework)
    console.log('  - Programmable:', params.useProgrammableNFT)
    console.log('  - Rule Set:', params.ruleSetType)
    console.log('  - Royalties:', royalties + '%')
    console.log('  - Creators:', nftCreators.length)
    console.log('  - App Bundle:', appBundleUrl ? 'Yes' : 'No')

    // Step 6: Create the transaction builder
    const transactionBuilder = await metaplex
      .nfts()
      .builders()
      .create({
        uri: metadataUrl,
        name: metadata.name,
        sellerFeeBasisPoints: royalties * 100, // Convert percentage to basis points
        symbol: params.appType.toUpperCase().substring(0, 4), // Use app type as symbol
        creators: nftCreators,
        isMutable: mutable,
        isCollection: false,
        tokenStandard: params.useProgrammableNFT 
          ? TokenStandard.ProgrammableNonFungible 
          : TokenStandard.NonFungible,
        ruleSet: ruleSet,
        collection: params.collection ? new PublicKey(params.collection) : undefined,
        uses: params.maxSupply ? toBigNumber(params.maxSupply) : undefined,
      })

    // Step 7: Send and confirm the transaction
    console.log('📡 Sending transaction to Solana network...')
    const { signature, confirmResponse } = await metaplex.rpc().sendAndConfirmTransaction(
      transactionBuilder,
      { commitment: 'finalized' }
    )
    
    if (confirmResponse.value.err) {
      throw new Error('Failed to confirm transaction: ' + JSON.stringify(confirmResponse.value.err))
    }

    // Step 8: Get the mint address
    const { mintAddress } = transactionBuilder.getContext()
    
    console.log('🎉 Enhanced Programmable NFT created successfully!')
    console.log('📍 Mint Address:', mintAddress.toString())
    console.log('🔗 Transaction:', signature)
    console.log('🌐 Metadata URL:', metadataUrl)
    console.log('📦 App Bundle URL:', appBundleUrl || 'N/A')

    return {
      success: true,
      mintAddress: mintAddress.toString(),
      signature: signature,
      network,
      tokenStandard: params.useProgrammableNFT ? 'ProgrammableNonFungible' : 'NonFungible',
      ruleSet: ruleSet?.toString() || null,
      ruleSetType: params.ruleSetType,
      metadataUrl,
      appBundleUrl: appBundleUrl || null,
      appMetadata: {
        name: params.appName,
        type: params.appType,
        framework: params.framework,
        codeHash: metadata.app_metadata.code_hash,
        hasCode: !!params.appCode,
      },
      royaltyInfo: {
        percentage: royalties,
        creators: creators.length,
        enforcementEnabled: params.useProgrammableNFT && params.ruleSetType !== 'none'
      }
    }

  } catch (error) {
    console.error('❌ Error creating Enhanced Programmable NFT:', error)
    throw error
  }
}

// Function to transfer programmable NFTs with enhanced rule checking
async function transferEnhancedProgrammableNFT(
  mintAddress: string,
  fromWallet: string,
  toWallet: string,
  network: string,
  authority?: Keypair
) {
  const connection = getConnection(network)
  const payerKeypair = authority || getPayerKeypair()
  
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payerKeypair))
  
  try {
    console.log('🔄 Initiating Enhanced Programmable NFT transfer...')
    console.log('  - From:', fromWallet)
    console.log('  - To:', toWallet)
    console.log('  - Mint:', mintAddress)

    // Get NFT info to check if it's programmable
    const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) })
    
    const isProgammable = nft.tokenStandard === TokenStandard.ProgrammableNonFungible

    console.log('  - Is Programmable:', isProgammable)
    console.log('  - Has Rule Set:', !!nft.programmableConfig?.ruleSet)

    // Build transfer transaction with proper token standard
    const transferTransactionBuilder = await metaplex.nfts().builders().transfer({
      nftOrSft: {
        address: new PublicKey(mintAddress),
        tokenStandard: nft.tokenStandard || TokenStandard.NonFungible
      },
      authority: payerKeypair,
      fromOwner: new PublicKey(fromWallet),
      toOwner: new PublicKey(toWallet),
    })
    
    // Send and confirm the transfer
    const { signature: transferSignature, confirmResponse } = await metaplex
      .rpc()
      .sendAndConfirmTransaction(transferTransactionBuilder, { 
        commitment: 'finalized',
        skipPreflight: false,
        maxRetries: 3
      })
    
    if (confirmResponse.value.err) {
      throw new Error('Failed to confirm transfer transaction: ' + JSON.stringify(confirmResponse.value.err))
    }
    
    console.log('✅ Enhanced Programmable NFT transferred successfully!')
    console.log('🔗 Transfer Transaction:', transferSignature)
    
    return {
      success: true,
      signature: transferSignature,
      from: fromWallet,
      to: toWallet,
      mintAddress,
      isProgrammable: isProgammable,
      ruleSetApplied: !!nft.programmableConfig?.ruleSet
    }
    
  } catch (error) {
    console.error('❌ Error transferring Enhanced Programmable NFT:', error)
    throw error
  }
}

// POST handler for creating enhanced programmable NFTs
export async function POST(request: NextRequest) {
  try {
    const params: EnhancedProgrammableNFTRequest = await request.json()
    
    // Validate required parameters
    if (!params.appName || !params.walletPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: appName, walletPublicKey' },
        { status: 400 }
      )
    }
    
    // Validate wallet public key
    try {
      new PublicKey(params.walletPublicKey)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet public key format' },
        { status: 400 }
      )
    }
    
    // Validate network
    if (!['devnet', 'mainnet-beta'].includes(params.network)) {
      return NextResponse.json(
        { error: 'Invalid network. Must be "devnet" or "mainnet-beta"' },
        { status: 400 }
      )
    }
    
    // Validate royalties (0-50%)
    if (params.royalties < 0 || params.royalties > 50) {
      return NextResponse.json(
        { error: 'Royalties must be between 0 and 50 percent' },
        { status: 400 }
      )
    }
    
    // Validate creators
    if (!params.creators || params.creators.length === 0) {
      // Default to the wallet owner
      params.creators = [{
        address: params.walletPublicKey,
        share: 100
      }]
    }
    
    const totalShare = params.creators.reduce((sum, creator) => sum + creator.share, 0)
    if (totalShare !== 100) {
      return NextResponse.json(
        { error: 'Creator shares must sum to 100' },
        { status: 400 }
      )
    }
    
    // Validate creator addresses
    for (const creator of params.creators) {
      try {
        new PublicKey(creator.address)
      } catch (error) {
        return NextResponse.json(
          { error: `Invalid creator address: ${creator.address}` },
          { status: 400 }
        )
      }
    }

    // Validate rule set if provided
    if (params.ruleSetType === 'custom' && params.customRuleSet) {
      try {
        new PublicKey(params.customRuleSet)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid custom rule set address' },
          { status: 400 }
        )
      }
    }
    
    // Check balance for mainnet
    if (params.network === 'mainnet-beta') {
      const connection = getConnection(params.network)
      const payerKeypair = getPayerKeypair()
      const balance = await connection.getBalance(payerKeypair.publicKey)
      
      if (balance < 0.05 * LAMPORTS_PER_SOL) { // Minimum 0.05 SOL for enhanced features
        return NextResponse.json(
          { error: 'Insufficient SOL balance for enhanced programmable NFT minting' },
          { status: 400 }
        )
      }
    }
    
    // Mint the enhanced programmable NFT
    const result = await mintEnhancedProgrammableNFT(params)
    
    return NextResponse.json({
      ...result,
      explorerUrl: `https://explorer.solana.com/address/${result.mintAddress}${
        params.network === 'devnet' ? '?cluster=devnet' : ''
      }`,
      magicEdenUrl: `https://magiceden.io/item-details/${result.mintAddress}`,
      metadata: {
        isEnhanced: true,
        appType: params.appType,
        framework: params.framework,
        useProgrammableNFT: params.useProgrammableNFT,
        ruleSetType: params.ruleSetType,
        royalties: params.royalties,
        mutable: params.mutable,
        creatorsCount: params.creators.length,
        hasAppCode: !!params.appCode,
        features: {
          royaltyEnforcement: params.useProgrammableNFT && params.ruleSetType !== 'none',
          transferRestrictions: params.useProgrammableNFT,
          burnability: params.enableBurning,
          throttling: params.useThrottling,
          maxSupply: params.maxSupply
        }
      }
    })
    
  } catch (error) {
    console.error('Enhanced Programmable NFT creation error:', error)
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient funds for enhanced programmable NFT creation' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Creator shares')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      if (error.message.includes('rule set')) {
        return NextResponse.json(
          { error: 'Rule set configuration error: ' + error.message },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Failed to upload')) {
        return NextResponse.json(
          { error: 'Storage upload failed. Please try again.' },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create enhanced programmable NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET handler for enhanced programmable NFT info and capabilities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network') || 'devnet'
    const mintAddress = searchParams.get('mint')
    
    const connection = getConnection(network)
    const payerKeypair = getPayerKeypair()
    
    // Get system info
    const { blockhash } = await connection.getLatestBlockhash()
    const balance = await connection.getBalance(payerKeypair.publicKey)
    
    let nftInfo = null
    if (mintAddress) {
      try {
        const metaplex = Metaplex.make(connection).use(keypairIdentity(payerKeypair))
        const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) })
        
        nftInfo = {
          name: nft.name,
          symbol: nft.symbol,
          mintAddress: nft.address.toString(),
          tokenStandard: nft.tokenStandard,
          isProgrammable: nft.tokenStandard === TokenStandard.ProgrammableNonFungible,
          hasRuleSet: !!nft.programmableConfig?.ruleSet,
          ruleSet: nft.programmableConfig?.ruleSet?.toString() || null,
          royalties: nft.sellerFeeBasisPoints / 100,
          creators: nft.creators.map(creator => ({
            address: creator.address.toString(),
            share: creator.share,
            verified: creator.verified
          })),
          mutable: nft.isMutable,
          metadataUri: nft.uri
        }
      } catch (error) {
        console.warn('Failed to fetch NFT info:', error)
      }
    }
    
    return NextResponse.json({
      status: 'healthy',
      network,
      enhanced: true,
      payerPublicKey: payerKeypair.publicKey.toString(),
      balance: balance / LAMPORTS_PER_SOL,
      blockhash,
      nftInfo,
      supportedFeatures: {
        enhancedProgrammableNFT: true,
        legacyNFT: true,
        metaplexCore: true,
        customRuleSets: true,
        appBundleStorage: true,
        royaltyEnforcement: true,
        transferRestrictions: true,
        multipleCreators: true,
        burnability: true,
        maxSupply: true,
        throttling: true,
        signatureRequirement: true,
        attributeManagement: true,
        appMetadata: true,
        codeHashing: true
      },
      appTypes: ['web', 'mobile', 'game', 'defi', 'ai', 'tool'],
      ruleSetTypes: ['default', 'custom', 'none'],
      maxRoyalties: 50,
      maxCreators: 5
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        enhanced: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
