# Enhanced Programmable NFTs on Solana

A comprehensive implementation of Metaplex Programmable NFTs that allows users to turn their applications into NFTs with royalty enforcement and transfer restrictions.

## 🚀 Overview

This system transforms user-created applications into **Programmable NFTs (pNFTs)** using Metaplex's latest token standard. Programmable NFTs enable creators to enforce royalties by specifying which programs can transfer their NFTs, ensuring creators get paid on secondary sales.

## 🛡️ What are Programmable NFTs?

Programmable NFTs are a new asset class that allows for flexible configuration of various lifecycle rules, including:

- **Royalty Enforcement**: Creators can specify which programs may transfer their NFTs
- **Transfer Restrictions**: Rule sets that validate transfers against creator-applied restrictions  
- **Allow/Deny Lists**: Support for both allow-list and deny-list approaches
- **Custom Rule Sets**: Creators can use custom or community-maintained rule sets

### Key Differences from Standard NFTs

| Feature | Standard NFT | Programmable NFT |
|---------|-------------|------------------|
| Royalty Enforcement | ❌ Optional/Bypassable | ✅ Enforced by Protocol |
| Transfer Validation | ❌ None | ✅ Rule Set Validation |
| Creator Control | ❌ Limited | ✅ Full Control |
| Marketplace Support | ✅ Universal | ✅ Compliant Marketplaces |

## 🏗️ Architecture

### API Endpoints

#### Enhanced Programmable NFT API
- **Endpoint**: `/api/programmable-nft-enhanced`
- **Methods**: `POST` (mint), `GET` (info)
- **Features**: Full programmable NFT support with enhanced metadata

#### Legacy NFT API (Existing)
- **Endpoint**: `/api/mint-solana-nft`
- **Methods**: `POST` (mint), `GET` (info)
- **Features**: Standard NFTs with optional programmable NFT support

### Components

1. **EnhancedProgrammableNFTButton**: Advanced UI for creating programmable NFTs
2. **DeployToSolanaNFTButton**: Existing component with basic pNFT support
3. **SolanaWallet**: Wallet integration for NFT operations

## 📦 Features

### Core Features

✅ **Programmable NFT Standard**: Full TokenStandard.ProgrammableNonFungible support
✅ **Royalty Enforcement**: Metaplex rule sets for guaranteed creator payments
✅ **Rule Set Configuration**: Default, custom, or no restrictions
✅ **Multiple Creators**: Support for multiple creators with percentage splits
✅ **App Bundle Storage**: Decentralized storage of application code and assets
✅ **Enhanced Metadata**: Rich metadata with app-specific attributes
✅ **Transfer Restrictions**: Configurable transfer limitations
✅ **Network Support**: Both devnet (free) and mainnet deployment

### Advanced Features

🔥 **Transfer Throttling**: Rate limiting for transfers
🔥 **Signature Requirements**: Additional security for transfers  
🔥 **Burning Capability**: Optional NFT burning functionality
🔥 **Max Supply Limits**: Configurable supply restrictions
🔥 **Custom Attributes**: Rich metadata with display types
🔥 **Code Hashing**: SHA-256 verification of application code
🔥 **Mutable Metadata**: Optional post-mint metadata updates

## 🛠️ Implementation Guide

### 1. Basic Implementation

```typescript
// Mint a programmable NFT with default settings
const result = await fetch('/api/programmable-nft-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appName: 'My Solana App',
    appDescription: 'A decentralized application',
    appType: 'web',
    framework: 'React',
    appCode: '<html>...</html>',
    walletPublicKey: wallet.publicKey.toString(),
    network: 'devnet',
    useProgrammableNFT: true,
    royalties: 5,
    ruleSetType: 'default'
  })
})
```

### 2. Advanced Configuration

```typescript
// Advanced programmable NFT with custom features
const config = {
  // Basic app info
  appName: 'Advanced DeFi Dashboard',
  appDescription: 'Real-time DeFi analytics platform',
  appType: 'defi',
  framework: 'Next.js',
  repoUrl: 'https://github.com/user/defi-app',
  
  // Programmable NFT features
  useProgrammableNFT: true,
  royalties: 7.5,
  ruleSetType: 'default', // or 'custom' or 'none'
  
  // Advanced features
  maxSupply: 1000,
  useThrottling: true,
  requireSignature: true,
  enableBurning: false,
  
  // Multiple creators
  creators: [
    { address: 'Creator1Address...', share: 60, verified: true },
    { address: 'Creator2Address...', share: 40, verified: true }
  ],
  
  // Custom attributes
  customAttributes: [
    { trait_type: 'Complexity', value: 'Advanced', display_type: 'default' },
    { trait_type: 'Performance Score', value: 95, display_type: 'boost_number' },
    { trait_type: 'Security Level', value: 'High' }
  ]
}
```

### 3. Rule Set Configuration

```typescript
// Default rule set (recommended)
ruleSetType: 'default' // Uses Metaplex community-maintained allow-list

// Custom rule set
ruleSetType: 'custom'
customRuleSet: 'YourCustomRuleSetAddress...'

// No restrictions (not recommended for royalty enforcement)
ruleSetType: 'none'
```

## 🔧 API Reference

### Enhanced Programmable NFT Request

```typescript
interface EnhancedProgrammableNFTRequest {
  // Basic NFT data
  appName: string
  appDescription: string
  appCode?: string
  
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
  royalties: number // 0-50
  mutable: boolean
  
  // Rule set configuration
  ruleSetType: 'default' | 'custom' | 'none'
  customRuleSet?: string
  
  // Advanced features
  maxSupply?: number
  useThrottling?: boolean
  requireSignature?: boolean
  enableBurning?: boolean
  
  // Creators and collection
  creators: Array<{
    address: string
    share: number // Must total 100
    verified?: boolean
  }>
  collection?: string
  
  // Custom attributes
  customAttributes?: Array<{
    trait_type: string
    value: string | number
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date'
  }>
}
```

### Response Format

```typescript
interface DeploymentResult {
  success: boolean
  mintAddress: string
  signature: string
  network: string
  tokenStandard: 'ProgrammableNonFungible' | 'NonFungible'
  ruleSetType: string
  metadataUrl: string
  appBundleUrl?: string
  explorerUrl: string
  magicEdenUrl: string
  
  appMetadata: {
    name: string
    type: string
    framework: string
    codeHash: string // SHA-256 of app code
    hasCode: boolean
  }
  
  royaltyInfo: {
    percentage: number
    creators: number
    enforcementEnabled: boolean
  }
}
```

## 📋 Rule Sets Explained

### Default Rule Set (Recommended)
- Uses Metaplex Foundation's community-maintained allow-list
- Updated periodically to include programs that pay creator royalties
- Ensures maximum marketplace compatibility
- Best for most creators

### Custom Rule Set
- Create your own transfer restrictions
- Full control over which programs can transfer
- Requires advanced knowledge of Solana programs
- Use when you need specific transfer logic

### No Restrictions
- Standard NFT behavior
- No royalty enforcement
- Not recommended if you want guaranteed royalties
- Use only for special cases

## 🎯 Use Cases

### 1. **Web Applications**
Turn your React/Vue/Angular apps into programmable NFTs with guaranteed royalties

### 2. **Games**
Mint game assets as programmable NFTs with transfer restrictions

### 3. **DeFi Protocols**
Package DeFi interfaces as NFTs with revenue sharing

### 4. **AI Tools**
Create transferable AI models with creator royalties

### 5. **Development Tools**
Monetize developer tools through NFT ownership

## 💰 Royalty Enforcement

### How It Works

1. **Rule Set Validation**: Every transfer is validated against the NFT's rule set
2. **Program Allow-List**: Only approved programs can facilitate transfers
3. **Automatic Enforcement**: Protocol-level enforcement, not marketplace-dependent
4. **Creator Payments**: Royalties are automatically distributed to creators

### Supported Marketplaces

✅ **Magic Eden**: Full pNFT support with royalty enforcement
✅ **Tensor**: Supports programmable NFTs
✅ **OpenSea**: Limited support (check current status)
✅ **Solana Native**: All compliant marketplace protocols

## 🔍 Monitoring & Analytics

### Transaction Tracking
- Monitor NFT transfers on Solana Explorer
- Track royalty payments to creator wallets
- Analyze secondary market activity

### Metadata Verification
- Verify app bundle integrity using code hashes
- Check metadata immutability settings
- Validate rule set configurations

## ⚠️ Important Considerations

### Gas Costs
- Programmable NFTs have slightly higher transaction costs
- Rule set validation adds computational overhead
- Budget ~0.02-0.05 SOL for mainnet minting

### Marketplace Compatibility
- Not all marketplaces support programmable NFTs yet
- Some may bypass royalty enforcement
- Choose marketplaces that respect pNFT rules

### Rule Set Updates
- Default rule sets may be updated by Metaplex
- Custom rule sets are immutable once set
- Plan your rule set strategy carefully

## 🔗 Resources

### Official Documentation
- [Metaplex Programmable NFTs](https://docs.metaplex.com/programs/token-metadata/programmable-nfts)
- [Token Metadata Program](https://docs.metaplex.com/programs/token-metadata/)
- [Authorization Rules](https://docs.metaplex.com/programs/authorization-rules/)

### Code Examples
- [Metaplex JavaScript SDK](https://github.com/metaplex-foundation/js)
- [pNFT Examples](https://github.com/metaplex-foundation/js-examples)

### Tools
- [Solana Explorer](https://explorer.solana.com/)
- [Magic Eden](https://magiceden.io/)
- [Metaplex Studio](https://studio.metaplex.com/)

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Creator shares must sum to 100"
**Solution**: Ensure all creator share percentages add up to exactly 100

**Issue**: "Invalid rule set address"  
**Solution**: Verify the custom rule set address is a valid Solana public key

**Issue**: "Insufficient SOL balance"
**Solution**: Ensure wallet has enough SOL for transaction fees (~0.05 SOL recommended)

**Issue**: "Failed to confirm transaction"
**Solution**: Network congestion - retry with higher priority fees

### Getting Help

1. Check the Solana Explorer for transaction details
2. Verify wallet connection and permissions
3. Ensure you're using the correct network (devnet vs mainnet)
4. Contact support with transaction signatures for debugging

## 🔮 Future Enhancements

- **Advanced Rule Sets**: More sophisticated transfer logic
- **Collection Management**: Better support for NFT collections  
- **Batch Operations**: Mint multiple pNFTs in one transaction
- **Governance Integration**: DAO-controlled rule sets
- **Cross-Chain Support**: Bridge to other blockchains
- **Enhanced Analytics**: Detailed royalty tracking dashboard

---

*Built with ❤️ for the Solana ecosystem using Metaplex Programmable NFTs*
