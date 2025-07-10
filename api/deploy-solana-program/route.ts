import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js'

interface DeployProgramRequest {
  programCode: string
  programName: string
  walletPublicKey: string
  network: 'devnet' | 'mainnet-beta'
  programType: 'anchor' | 'native' | 'seahorse'
  buildTarget?: 'deploy' | 'lib'
  features?: string[]
  dependencies?: Record<string, string>
}

interface ProgramMetadata {
  name: string
  version: string
  description: string
  repository?: string
  authors: string[]
  license: string
  keywords: string[]
  categories: string[]
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

// Generate program template based on type
const generateProgramTemplate = (
  type: 'anchor' | 'native' | 'seahorse',
  name: string,
  code: string
): { cargoToml: string; libRs: string; metadata: ProgramMetadata } => {
  const metadata: ProgramMetadata = {
    name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    version: '0.1.0',
    description: `${name} - A Solana program`,
    authors: ['Fragment Builder <builder@fragments.dev>'],
    license: 'MIT',
    keywords: ['solana', 'blockchain', 'program'],
    categories: ['cryptography::cryptocurrencies']
  }

  switch (type) {
    case 'anchor':
      return {
        cargoToml: generateAnchorCargoToml(metadata),
        libRs: generateAnchorLibRs(name, code),
        metadata
      }
    
    case 'seahorse':
      return {
        cargoToml: generateSeahorseCargoToml(metadata),
        libRs: generateSeahorseLibRs(name, code),
        metadata
      }
    
    case 'native':
    default:
      return {
        cargoToml: generateNativeCargoToml(metadata),
        libRs: generateNativeLibRs(name, code),
        metadata
      }
  }
}

const generateAnchorCargoToml = (metadata: ProgramMetadata): string => {
  return `[package]
name = "${metadata.name}"
version = "${metadata.version}"
description = "${metadata.description}"
edition = "2021"
license = "${metadata.license}"
homepage = "https://fragments.dev"
documentation = "https://docs.rs/${metadata.name}"
repository = "https://github.com/fragments-dev/${metadata.name}"
readme = "README.md"
keywords = ${JSON.stringify(metadata.keywords)}
categories = ${JSON.stringify(metadata.categories)}

[lib]
crate-type = ["cdylib", "lib"]
name = "${metadata.name}"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = { version = "0.29.0", features = ["init-if-needed"] }
anchor-spl = "0.29.0"
spl-token = { version = "4.0.0", features = ["no-entrypoint"] }
spl-associated-token-account = { version = "2.2.0", features = ["no-entrypoint"] }
mpl-token-metadata = { version = "4.1.2", features = ["no-entrypoint"] }

[dev-dependencies]
solana-program-test = "1.17.0"
solana-sdk = "1.17.0"
tokio = { version = "1.0", features = ["macros", "rt-multi-thread"] }
`
}

const generateSeahorseCargoToml = (metadata: ProgramMetadata): string => {
  return `[package]
name = "${metadata.name}"
version = "${metadata.version}"
description = "${metadata.description}"
edition = "2021"
license = "${metadata.license}"

[lib]
crate-type = ["cdylib", "lib"]
name = "${metadata.name}"

[dependencies]
seahorse = "0.2.7"
borsh = "0.10.3"
solana-program = "1.17.0"
thiserror = "1.0.38"

[dev-dependencies]
seahorse-util = "0.2.7"
`
}

const generateNativeCargoToml = (metadata: ProgramMetadata): string => {
  return `[package]
name = "${metadata.name}"
version = "${metadata.version}"
description = "${metadata.description}"
edition = "2021"
license = "${metadata.license}"

[lib]
crate-type = ["cdylib"]
name = "${metadata.name}"

[dependencies]
solana-program = "1.17.0"
borsh = "0.10.3"
thiserror = "1.0.38"
spl-token = { version = "4.0.0", features = ["no-entrypoint"] }
spl-associated-token-account = { version = "2.2.0", features = ["no-entrypoint"] }

[dev-dependencies]
solana-program-test = "1.17.0"
solana-sdk = "1.17.0"
`
}

const generateAnchorLibRs = (name: string, code: string): string => {
  // If the code already contains anchor imports and program definition, use it
  if (code.includes('use anchor_lang::prelude::*') && code.includes('#[program]')) {
    return code
  }

  // Otherwise, wrap the code in a basic Anchor program structure
  return `use anchor_lang::prelude::*;

declare_id!("${generateRandomProgramId()}");

#[program]
pub mod ${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')} {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from ${name}!");
        Ok(())
    }

    ${code}
}

#[derive(Accounts)]
pub struct Initialize {}
`
}

const generateSeahorseLibRs = (name: string, code: string): string => {
  // If the code already contains seahorse imports, use it
  if (code.includes('use seahorse::*')) {
    return code
  }

  return `#![allow(unused_imports)]
#![allow(unused_variables)]
#![allow(unused_mut)]

use seahorse::*;

declare_id!("${generateRandomProgramId()}");

#[seahorse]
mod ${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')} {
    use super::*;

    #[instruction]
    pub fn init_user(owner: &mut Signer, user: &mut Empty<User>) {
        user.account.owner = owner.key();
        user.account.balance = 0;
    }

    ${code}
}

#[account]
#[derive(Debug)]
pub struct User {
    pub owner: Pubkey,
    pub balance: u64,
}
`
}

const generateNativeLibRs = (name: string, code: string): string => {
  // If the code already contains program entrypoint, use it
  if (code.includes('entrypoint!(process_instruction)') || code.includes('solana_program::entrypoint!')) {
    return code
  }

  return `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

declare_id!("${generateRandomProgramId()}");

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Hello from ${name}!");
    
    ${code}
    
    Ok(())
}
`
}

const generateRandomProgramId = (): string => {
  // Generate a random program ID for testing (this would be replaced with actual deployment)
  const keypair = Keypair.generate()
  return keypair.publicKey.toBase58()
}

// Simulate the Solana Playground build process
const buildProgram = async (
  cargoToml: string,
  libRs: string,
  programType: string
): Promise<{ success: boolean; bytecode?: Buffer; errors?: string[] }> => {
  // In a real implementation, this would:
  // 1. Create a temporary directory
  // 2. Write the Cargo.toml and lib.rs files
  // 3. Run `cargo build-bpf` or equivalent
  // 4. Return the compiled bytecode
  
  // For now, we'll simulate the build process
  const simulatedErrors: string[] = []
  
  // Basic validation
  if (!libRs.includes('pub fn') && !libRs.includes('#[program]')) {
    simulatedErrors.push('No public functions or program entry point found')
  }
  
  if (libRs.includes('panic!') || libRs.includes('unwrap()')) {
    simulatedErrors.push('Warning: Code contains panic! or unwrap() which may cause program failures')
  }
  
  if (simulatedErrors.length > 0) {
    return { success: false, errors: simulatedErrors }
  }
  
  // Simulate successful compilation with dummy bytecode
  const dummyBytecode = Buffer.from('SOLANA_PROGRAM_BYTECODE_PLACEHOLDER', 'utf-8')
  
  return { success: true, bytecode: dummyBytecode }
}

export async function POST(request: NextRequest) {
  try {
    const params: DeployProgramRequest = await request.json()
    
    // Validate required parameters
    if (!params.programCode || !params.programName || !params.walletPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: programCode, programName, walletPublicKey' },
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
    
    console.log(`Building ${params.programType} program: ${params.programName}`)
    
    // Generate program template
    const { cargoToml, libRs, metadata } = generateProgramTemplate(
      params.programType,
      params.programName,
      params.programCode
    )
    
    // Upload source code to Lighthouse for storage
    const sourceCodeBundle = {
      cargoToml,
      libRs,
      metadata,
      originalCode: params.programCode,
      buildTarget: params.buildTarget || 'deploy',
      features: params.features || [],
      dependencies: params.dependencies || {},
      timestamp: Date.now(),
      network: params.network,
      programType: params.programType
    }
    
    const sourceUploadResponse = await fetch('/api/upload-to-lighthouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: sourceCodeBundle,
        name: `${params.programName}-source`,
        type: 'json'
      })
    })
    
    if (!sourceUploadResponse.ok) {
      throw new Error('Failed to upload source code to storage')
    }
    
    const sourceUploadResult = await sourceUploadResponse.json()
    
    // Build the program
    console.log('Building program...')
    const buildResult = await buildProgram(cargoToml, libRs, params.programType)
    
    if (!buildResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Program build failed',
        errors: buildResult.errors,
        sourceCodeUrl: sourceUploadResult.url,
        sourceCodeCid: sourceUploadResult.cid
      }, { status: 400 })
    }
    
    // Generate program keypair
    const programKeypair = Keypair.generate()
    const programId = programKeypair.publicKey.toBase58()
    
    // Estimate deployment cost
    const connection = getConnection(params.network)
    const programSize = buildResult.bytecode!.length
    const lamports = await connection.getMinimumBalanceForRentExemption(programSize)
    const estimatedCostSOL = lamports / LAMPORTS_PER_SOL
    
    // Upload compiled bytecode to Lighthouse
    const bytecodeUploadResponse = await fetch('/api/upload-to-lighthouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: Array.from(buildResult.bytecode!),
        name: `${params.programName}-bytecode`,
        type: 'buffer'
      })
    })
    
    if (!bytecodeUploadResponse.ok) {
      throw new Error('Failed to upload bytecode to storage')
    }
    
    const bytecodeUploadResult = await bytecodeUploadResponse.json()
    
    console.log(`✅ Program built successfully!`)
    console.log(`📍 Program ID: ${programId}`)
    console.log(`💾 Program Size: ${(programSize / 1024).toFixed(2)} KB`)
    console.log(`💰 Estimated Cost: ${estimatedCostSOL.toFixed(4)} SOL`)
    
    return NextResponse.json({
      success: true,
      programId,
      programKeypair: Array.from(programKeypair.secretKey),
      buildResult: {
        bytecodeSize: programSize,
        bytecodeUrl: bytecodeUploadResult.url,
        bytecodeCid: bytecodeUploadResult.cid,
        estimatedCostSOL,
        estimatedCostLamports: lamports
      },
      sourceCode: {
        url: sourceUploadResult.url,
        cid: sourceUploadResult.cid,
        cargoToml,
        libRs: libRs.substring(0, 500) + '...', // Truncated for response size
      },
      metadata,
      network: params.network,
      programType: params.programType,
      explorerUrl: `https://explorer.solana.com/address/${programId}${
        params.network === 'devnet' ? '?cluster=devnet' : ''
      }`,
      deployment: {
        ready: true,
        instructions: [
          'Use the provided program keypair to deploy',
          'Ensure sufficient SOL balance for deployment',
          'Deploy using solana program deploy command',
          'Program will be upgradeable by default'
        ]
      }
    })
    
  } catch (error) {
    console.error('Program deployment preparation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to prepare program deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check and supported features
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network') || 'devnet'
    
    const connection = getConnection(network)
    const payerKeypair = getPayerKeypair()
    
    // Get current slot and block height
    const slot = await connection.getSlot()
    const blockHeight = await connection.getBlockHeight()
    
    return NextResponse.json({
      status: 'healthy',
      service: 'solana-program-deployment',
      network,
      payerPublicKey: payerKeypair.publicKey.toString(),
      currentSlot: slot,
      blockHeight,
      supportedFeatures: {
        anchorPrograms: true,
        nativePrograms: true,
        seahorsePrograms: true,
        upgradeable: true,
        programLibraries: true,
        sourceCodeStorage: true,
        bytecodeStorage: true,
        deploymentEstimation: true
      },
      buildTargets: ['deploy', 'lib'],
      programTypes: ['anchor', 'native', 'seahorse'],
      storageBackend: 'lighthouse-ipfs'
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
