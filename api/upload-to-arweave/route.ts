import { NextRequest, NextResponse } from 'next/server'
import Arweave from 'arweave'

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
})

interface UploadData {
  code?: string
  name?: string
  repoUrl?: string
  timestamp?: number
  type?: string
  // Or any other data structure for metadata
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    const data: UploadData = await request.json()

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No data provided for upload' },
        { status: 400 }
      )
    }

    // Get Arweave wallet from environment
    const walletKey = process.env.ARWEAVE_WALLET_KEY
    if (!walletKey) {
      return NextResponse.json(
        { error: 'Arweave wallet not configured' },
        { status: 500 }
      )
    }

    const wallet = JSON.parse(walletKey)

    // Create transaction
    const transaction = await arweave.createTransaction(
      { data: JSON.stringify(data, null, 2) },
      wallet
    )

    // Add tags for better discovery
    transaction.addTag('Content-Type', 'application/json')
    transaction.addTag('App-Name', data.name || 'Unknown')
    transaction.addTag('App-Type', data.type || 'solana-app-nft')
    transaction.addTag('Timestamp', (data.timestamp || Date.now()).toString())
    
    if (data.repoUrl) {
      transaction.addTag('Repo-URL', data.repoUrl)
    }

    // Sign and submit transaction
    await arweave.transactions.sign(transaction, wallet)
    const response = await arweave.transactions.post(transaction)

    if (response.status === 200) {
      const url = `https://arweave.net/${transaction.id}`
      
      return NextResponse.json({
        success: true,
        url,
        transactionId: transaction.id,
        status: 'pending' // Transaction is pending confirmation
      })
    } else {
      throw new Error(`Arweave upload failed with status: ${response.status}`)
    }

  } catch (error) {
    console.error('Arweave upload error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to upload to Arweave',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const info = await arweave.network.getInfo()
    return NextResponse.json({
      status: 'healthy',
      arweave: {
        network: info.network,
        height: info.height,
        release: info.release
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