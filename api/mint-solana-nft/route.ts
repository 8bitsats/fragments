import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  keypairIdentity,
  Metaplex,
} from '@metaplex-foundation/js'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'

interface MintNFTRequest {
  metadataUrl: string
  walletPublicKey: string
  network: 'devnet' | 'mainnet-beta'
  useMetaplexCore: boolean
  royalties: number
  mutable: boolean
  collection?: string
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

async function mintMetaplexCoreNFT(params: MintNFTRequest) {
  // For now, fall back to legacy NFT creation
  // Metaplex Core implementation can be added later when the API is more stable
  return await mintLegacyNFT(params)
}

async function mintLegacyNFT(params: MintNFTRequest) {
  const { metadataUrl, walletPublicKey, network, royalties, mutable } = params
  
  const connection = getConnection(network)
  const payerKeypair = getPayerKeypair()
  
  // Initialize Metaplex
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payerKeypair))
  
  // Fetch metadata from URL
  const metadataResponse = await fetch(metadataUrl)
  if (!metadataResponse.ok) {
    throw new Error('Failed to fetch metadata from provided URL')
  }
  const metadata = await metadataResponse.json()
  
  // Create NFT
  const { nft } = await metaplex.nfts().create({
    uri: metadataUrl,
    name: metadata.name,
    sellerFeeBasisPoints: royalties * 100,
    symbol: metadata.symbol || 'APP',
    creators: [
      {
        address: new PublicKey(walletPublicKey),
        share: 100,
      },
    ],
    isMutable: mutable,
    collection: params.collection ? new PublicKey(params.collection) : undefined,
  })
  
  return {
    mintAddress: nft.address.toString(),
    signature: nft.metadataAddress.toString(),
    network
  }
}

export async function POST(request: NextRequest) {
  try {
    const params: MintNFTRequest = await request.json()
    
    // Validate required parameters
    if (!params.metadataUrl || !params.walletPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: metadataUrl, walletPublicKey' },
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
    
    // Check if payer has sufficient balance (for devnet, we can skip this)
    if (params.network === 'mainnet-beta') {
      const connection = getConnection(params.network)
      const payerKeypair = getPayerKeypair()
      const balance = await connection.getBalance(payerKeypair.publicKey)
      
      if (balance < 0.01 * LAMPORTS_PER_SOL) { // Minimum 0.01 SOL
        return NextResponse.json(
          { error: 'Insufficient SOL balance for minting' },
          { status: 400 }
        )
      }
    }
    
    let result
    
    if (params.useMetaplexCore) {
      result = await mintMetaplexCoreNFT(params)
    } else {
      result = await mintLegacyNFT(params)
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      explorerUrl: `https://explorer.solana.com/address/${result.mintAddress}${
        params.network === 'devnet' ? '?cluster=devnet' : ''
      }`,
      magicEdenUrl: `https://magiceden.io/item-details/${result.mintAddress}`,
      metadata: {
        useMetaplexCore: params.useMetaplexCore,
        royalties: params.royalties,
        mutable: params.mutable
      }
    })
    
  } catch (error) {
    console.error('NFT minting error:', error)
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient funds for transaction' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Invalid public key')) {
        return NextResponse.json(
          { error: 'Invalid wallet address provided' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('network')) {
        return NextResponse.json(
          { error: 'Network connection failed. Please try again.' },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to mint NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check and fee estimation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network') || 'devnet'
    
    const connection = getConnection(network)
    const payerKeypair = getPayerKeypair()
    
    // Get recent blockhash for fee estimation
    const { blockhash } = await connection.getLatestBlockhash()
    
    // Estimate transaction fee
    const testTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payerKeypair.publicKey,
        toPubkey: payerKeypair.publicKey,
        lamports: 1,
      })
    )
    testTransaction.recentBlockhash = blockhash
    testTransaction.feePayer = payerKeypair.publicKey
    
    const feeEstimate = await connection.getFeeForMessage(testTransaction.compileMessage())
    
    return NextResponse.json({
      status: 'healthy',
      network,
      payerPublicKey: payerKeypair.publicKey.toString(),
      estimatedFee: feeEstimate?.value || 0,
      feeInSOL: (feeEstimate?.value || 0) / LAMPORTS_PER_SOL,
      blockhash
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
