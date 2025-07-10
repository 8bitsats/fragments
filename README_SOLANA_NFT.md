# Solana NFT Deployment System

This system allows users to deploy their applications as NFTs on the Solana blockchain using Metaplex Core standard.

## Features

- **Metaplex Core NFT Standard**: Modern, efficient NFT deployment
- **Arweave Integration**: Decentralized storage for app code and metadata
- **Wallet Integration**: Connect with popular Solana wallets
- **Multi-Network Support**: Deploy to devnet or mainnet
- **Rich Metadata**: Customizable NFT attributes and properties
- **Image/Video Support**: Upload custom NFT artwork
- **Royalty Configuration**: Set creator royalties (0-50%)
- **Mutable Metadata**: Option to update metadata after minting

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Solana Configuration
SOLANA_DEVNET_RPC=https://api.devnet.solana.com
SOLANA_MAINNET_RPC=https://api.mainnet-beta.solana.com

# Solana Payer Wallet (JSON array of private key bytes)
SOLANA_PAYER_PRIVATE_KEY=[1,2,3,4,5,...]

# Arweave Configuration
ARWEAVE_WALLET_KEY={"kty":"RSA","n":"...","e":"AQAB",...}

# Network Selection
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### 3. Generate Solana Keypair

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Generate new keypair
solana-keygen new --outfile keypair.json --no-bip39-passphrase

# Copy the private key array from keypair.json to your .env file
cat keypair.json
```

### 4. Fund Your Wallet (Devnet)

```bash
# Get your public key
solana-keygen pubkey keypair.json

# Request devnet SOL
solana airdrop 2 <YOUR_PUBLIC_KEY> --url devnet
```

### 5. Generate Arweave Wallet

1. Visit [https://arweave.app/wallet](https://arweave.app/wallet)
2. Generate a new wallet
3. Download the wallet JSON file
4. Copy the entire JSON content to `ARWEAVE_WALLET_KEY` in your `.env` file

## Usage

### Basic NFT Deployment

1. **Connect Wallet**: Users connect their Solana wallet (Phantom, Solflare, etc.)
2. **Configure Metadata**: 
   - NFT name and description
   - Upload artwork (image/video)
   - Add custom attributes
3. **Set Deployment Options**:
   - Choose network (devnet/mainnet)
   - Set royalty percentage
   - Configure mutability
4. **Deploy**: App code and metadata are uploaded to Arweave, then NFT is minted

### Component Integration

```tsx
import { DeployToSolanaNFTButton } from '@/components/DeployToSolanaNFTButton'

<DeployToSolanaNFTButton 
  appCode={yourAppCode}
  appName="My Awesome App"
  repoUrl="https://github.com/user/repo"
/>
```

### Wallet Setup

Wrap your app with wallet providers:

```tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'

const network = WalletAdapterNetwork.Devnet
const endpoint = clusterApiUrl(network)
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

export default function App({ children }) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
```

## API Endpoints

### `/api/upload-to-arweave`

Uploads data to Arweave decentralized storage.

**POST Request:**
```json
{
  "code": "your app code",
  "name": "App Name",
  "repoUrl": "https://github.com/user/repo",
  "type": "solana-app-nft"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://arweave.net/transaction-id",
  "transactionId": "arweave-tx-id"
}
```

### `/api/mint-solana-nft`

Mints NFT on Solana using Metaplex Core.

**POST Request:**
```json
{
  "metadataUrl": "https://arweave.net/metadata-id",
  "walletPublicKey": "user-wallet-address",
  "network": "devnet",
  "useMetaplexCore": true,
  "royalties": 5,
  "mutable": true
}
```

**Response:**
```json
{
  "success": true,
  "mintAddress": "nft-mint-address",
  "signature": "transaction-signature",
  "explorerUrl": "https://explorer.solana.com/address/...",
  "magicEdenUrl": "https://magiceden.io/item-details/..."
}
```

## NFT Metadata Structure

```json
{
  "name": "My App NFT",
  "description": "A decentralized application deployed as an NFT",
  "image": "https://arweave.net/image-id",
  "animation_url": "https://arweave.net/app-code-id",
  "external_url": "https://github.com/user/repo",
  "attributes": [
    { "trait_type": "Type", "value": "Web Application" },
    { "trait_type": "Framework", "value": "React" },
    { "trait_type": "Blockchain", "value": "Solana" }
  ],
  "properties": {
    "category": "application",
    "files": [
      {
        "uri": "https://arweave.net/app-code-id",
        "type": "application/json"
      }
    ]
  }
}
```

## Deployment Process

1. **Metadata Creation**: User configures NFT metadata and uploads files
2. **App Bundle Upload**: Application code is packaged and uploaded to Arweave
3. **Metadata Upload**: Final metadata (including app URL) is uploaded to Arweave
4. **NFT Minting**: Metaplex Core NFT is minted with metadata URL
5. **Transaction Confirmation**: User receives mint address and explorer links

## Security Considerations

- **Private Keys**: Server-side keypair only used for gas fees, not asset control
- **User Ownership**: NFTs are minted directly to user's wallet
- **Input Validation**: All parameters are validated before processing
- **Rate Limiting**: Implement rate limiting for production use
- **Error Handling**: Comprehensive error handling and user feedback

## Cost Structure

### Devnet (Free Testing)
- Solana transactions: Free (devnet SOL)
- Arweave uploads: Small cost (~$0.01-0.10 per upload)

### Mainnet (Production)
- Solana transactions: ~0.0001-0.001 SOL per transaction
- Metaplex Core minting: ~0.0002 SOL
- Arweave storage: ~$0.01-0.10 per MB permanent storage

## Supported Wallets

- Phantom
- Solflare
- Backpack
- Glow
- Slope
- Torus
- And more via @solana/wallet-adapter

## File Types Supported

### Application Code
- JavaScript/TypeScript
- React components
- HTML/CSS
- JSON configuration
- Any text-based code

### NFT Artwork
- Images: PNG, JPG, GIF, SVG
- Videos: MP4, MOV, AVI
- Audio: MP3, WAV
- 3D: GLB, GLTF

## Example Workflows

### 1. Simple App Deployment
```javascript
const deployment = await deployAsNFT({
  appCode: componentCode,
  appName: "React Calculator",
  description: "A simple calculator built with React",
  network: "devnet"
})
```

### 2. Full-Featured Deployment
```javascript
const deployment = await deployAsNFT({
  appCode: fullAppBundle,
  appName: "Task Manager Pro",
  description: "Full-featured task management application",
  image: customArtwork,
  attributes: [
    { trait_type: "Category", value: "Productivity" },
    { trait_type: "Tech Stack", value: "Next.js" }
  ],
  royalties: 10,
  network: "mainnet-beta"
})
```

## Troubleshooting

### Common Issues

1. **Insufficient SOL**: Ensure payer wallet has enough SOL
2. **Arweave Upload Fails**: Check wallet funding and network connection
3. **Metadata Errors**: Validate JSON structure and required fields
4. **Wallet Connection**: Ensure user has compatible wallet installed

### Debug Mode

Set environment variables for debugging:
```bash
DEBUG=true
VERBOSE_LOGGING=true
```

### Network Issues

For better reliability, use dedicated RPC endpoints:
```bash
SOLANA_DEVNET_RPC=https://your-dedicated-rpc.com
SOLANA_MAINNET_RPC=https://your-mainnet-rpc.com
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [Read the docs]
- Discord: [Join our community]