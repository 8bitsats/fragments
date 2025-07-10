import {
  NextRequest,
  NextResponse,
} from 'next/server'

import lighthouse from '@lighthouse-web3/sdk'

interface UploadRequest {
  data: any
  name?: string
  encrypted?: boolean
  type: 'text' | 'buffer' | 'json'
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json()
    const { data, name, encrypted = false, type } = body

    const apiKey = process.env.LIGHTHOUSE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Lighthouse API key not configured' },
        { status: 500 }
      )
    }

    let uploadResponse

    try {
      switch (type) {
        case 'text':
          const textData = typeof data === 'string' ? data : JSON.stringify(data)
          uploadResponse = await lighthouse.uploadText(textData, apiKey, name)
          break
          
        case 'buffer':
          uploadResponse = await lighthouse.uploadBuffer(Buffer.from(data), apiKey)
          break
          
        case 'json':
        default:
          const jsonString = JSON.stringify(data, null, 2)
          uploadResponse = await lighthouse.uploadText(jsonString, apiKey, name)
          break
      }
    } catch (uploadError: any) {
      console.error('Lighthouse upload error:', uploadError)
      return NextResponse.json(
        { 
          error: 'Failed to upload to Lighthouse',
          details: uploadError.message 
        },
        { status: 500 }
      )
    }

    if (!uploadResponse?.data) {
      return NextResponse.json(
        { error: 'Invalid response from Lighthouse' },
        { status: 500 }
      )
    }

    const { Hash, Name, Size } = uploadResponse.data
    const url = `https://gateway.lighthouse.storage/ipfs/${Hash}`

    return NextResponse.json({
      success: true,
      hash: Hash,
      name: Name,
      size: Size,
      url,
      gateway: 'https://gateway.lighthouse.storage/ipfs/',
      cid: Hash,
      type: encrypted ? 'encrypted' : 'public',
      storage: 'lighthouse-ipfs'
    })

  } catch (error) {
    console.error('Lighthouse API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const apiKey = process.env.LIGHTHOUSE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Lighthouse API key not configured' },
        { status: 500 }
      )
    }

    switch (action) {
      case 'balance':
        const balance = await lighthouse.getBalance(apiKey)
        return NextResponse.json({
          success: true,
          balance: balance.data,
          dataLimit: balance.data.dataLimit,
          dataUsed: balance.data.dataUsed,
          dataLimitFormatted: `${(balance.data.dataLimit / (1024 ** 3)).toFixed(2)} GB`,
          dataUsedFormatted: `${(balance.data.dataUsed / (1024 ** 3)).toFixed(2)} GB`,
          usagePercentage: ((balance.data.dataUsed / balance.data.dataLimit) * 100).toFixed(2)
        })

      case 'uploads':
        const lastKey = searchParams.get('lastKey')
        const uploads = await lighthouse.getUploads(apiKey, lastKey)
        return NextResponse.json({
          success: true,
          uploads: uploads.data.fileList,
          totalFiles: uploads.data.totalFiles,
          hasMore: uploads.data.fileList.length === 2000
        })

      case 'file-info':
        const cid = searchParams.get('cid')
        if (!cid) {
          return NextResponse.json(
            { error: 'CID parameter required' },
            { status: 400 }
          )
        }
        const fileInfo = await lighthouse.getFileInfo(cid)
        return NextResponse.json({
          success: true,
          fileInfo: fileInfo.data
        })

      default:
        return NextResponse.json({
          status: 'healthy',
          service: 'lighthouse-storage',
          features: {
            textUpload: true,
            fileUpload: true,
            encryptedUpload: true,
            balanceCheck: true,
            fileInfo: true,
            uploadHistory: true
          },
          endpoints: {
            upload: '/api/upload-to-lighthouse',
            balance: '/api/upload-to-lighthouse?action=balance',
            uploads: '/api/upload-to-lighthouse?action=uploads',
            fileInfo: '/api/upload-to-lighthouse?action=file-info&cid=<CID>'
          }
        })
    }

  } catch (error) {
    console.error('Lighthouse API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from Lighthouse',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
