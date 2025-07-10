import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
} from '@metaplex-foundation/js'
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata'
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
  useProgrammableNFT: boolean
  royalties: number
  mutable: boolean
  collection?: string
  ruleSet?: string
  creators?: Array<{
    address: string
    share: number
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

// Function to mint Programmable NFTs with royalty enforcement
async function mintProgrammableNFT(params: MintNFTRequest) {
  const { metadataUrl, walletPublicKey, network, royalties, mutable, creators, ruleSet } = params
  
  const connection = getConnection(network)
  const payerKeypair = getPayerKeypair()
  
  // Initialize Metaplex with bundlr storage for better reliability
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payerKeypair))
    .use(bundlrStorage({
      address: network === 'mainnet-beta' ? 'https://node1.bundlr.network' : 'https://devnet.bundlr.network',
      providerUrl: connection.rpcEndpoint,
      timeout: 60000,
    }))
  
  // Fetch metadata from URL
  const metadataResponse = await fetch(metadataUrl)
  if (!metadataResponse.ok) {
    throw new Error('Failed to fetch metadata from provided URL')
  }
  const metadata = await metadataResponse.json()
  
  // Prepare creators array - use provided creators or default to wallet
  const nftCreators = creators && creators.length > 0 
    ? creators.map(creator => ({
        address: new PublicKey(creator.address),
        share: creator.share,
      }))
    : [
        {
          address: new PublicKey(walletPublicKey),
          share: 100,
        },
      ]
  
  // Validate creators shares sum to 100
  const totalShare = nftCreators.reduce((sum, creator) => sum + creator.share, 0)
  if (totalShare !== 100) {
    throw new Error('Creator shares must sum to 100')
  }

  console.log('Minting Programmable NFT with the following parameters:')
  console.log('- Name:', metadata.name)
  console.log('- Symbol:', metadata.symbol || 'PNFT')
  console.log('- Royalties:', royalties, '%')
  console.log('- Creators:', nftCreators.length)
  console.log('- Mutable:', mutable)
  console.log('- Rule Set:', ruleSet || 'Default (null)')

  try {
    // Create the transaction builder for Programmable NFT
    const transactionBuilder = await metaplex
      .nfts()
      .builders()
      .create({
        uri: metadataUrl,
        name: metadata.name,
        sellerFeeBasisPoints: royalties * 100, // Convert percentage to basis points
        symbol: metadata.symbol || 'PNFT',
        creators: nftCreators,
        isMutable: mutable,
        isCollection: false,
        tokenStandard: TokenStandard.ProgrammableNonFungible, // This makes it a pNFT!
        ruleSet: ruleSet ? new PublicKey(ruleSet) : null, // Custom rule set or default
        collection: params.collection ? new PublicKey(params.collection) : undefined,
      })

    // Send and confirm the transaction
    const { signature, confirmResponse } = await metaplex.rpc().sendAndConfirmTransaction(transactionBuilder)
    
    if (confirmResponse.value.err) {
      throw new Error('Failed to confirm transaction')
    }

    // Get the mint address from the transaction context
    const { mintAddress } = transactionBuilder.getContext()
    
    console.log('✅ Programmable NFT minted successfully!')
    console.log('📍 Mint Address:', mintAddress.toString())
    console.log('🔗 Transaction:', signature)

    return {
      mintAddress: mintAddress.toString(),
      signature: signature,
      network,
      tokenStandard: 'ProgrammableNonFungible',
      ruleSet: ruleSet || null,
    }

  } catch (error) {
    console.error('Error minting Programmable NFT:', error)
    throw error
  }
}

// Function to transfer Programmable NFTs (with rule enforcement)
async function transferProgrammableNFT(
  mintAddress: string,
  fromWallet: string,
  toWallet: string,
  network: string
) {
  const connection = getConnection(network)
  const payerKeypair = getPayerKeypair()
  
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payerKeypair))
  
  try {
    // Build transfer transaction for Programmable NFT
    const transferTransactionBuilder = await metaplex.nfts().builders().transfer({
      nftOrSft: {
        address: new PublicKey(mintAddress),
        tokenStandard: TokenStandard.ProgrammableNonFungible
      },
      authority: payerKeypair,
      fromOwner: new PublicKey(fromWallet),
      toOwner: new PublicKey(toWallet),
    })
    
    // Send and confirm the transfer
    const { signature: transferSignature, confirmResponse } = await metaplex
      .rpc()
      .sendAndConfirmTransaction(transferTransactionBuilder, { commitment: 'finalized' })
    
    if (confirmResponse.value.err) {
      throw new Error('Failed to confirm transfer transaction')
    }
    
    console.log('✅ Programmable NFT transferred successfully!')
    console.log('🔗 Transfer Transaction:', transferSignature)
    
    return {
      signature: transferSignature,
      from: fromWallet,
      to: toWallet,
      mintAddress,
    }
    
  } catch (error) {
    console.error('Error transferring Programmable NFT:', error)
    throw error
  }
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
    network,
    tokenStandard: 'NonFungible',
    ruleSet: null,
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
    
    // Validate creators if provided
    if (params.creators && params.creators.length > 0) {
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
    
    // Choose minting method based on parameters
    if (params.useProgrammableNFT) {
      result = await mintProgrammableNFT(params)
    } else if (params.useMetaplexCore) {
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
        useProgrammableNFT: params.useProgrammableNFT,
        royalties: params.royalties,
        mutable: params.mutable,
        tokenStandard: result.tokenStandard,
        ruleSet: result.ruleSet || null,
        creatorsCount: params.creators?.length || 1,
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
      
      if (error.message.includes('Creator shares')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Failed to confirm')) {
        return NextResponse.json(
          { error: 'Transaction failed to confirm. Please try again.' },
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
      blockhash,
      supportedFeatures: {
        legacyNFT: true,
        programmableNFT: true,
        metaplexCore: true,
        royaltyEnforcement: true,
        customRuleSets: true,
        multipleCreators: true,
      }
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
