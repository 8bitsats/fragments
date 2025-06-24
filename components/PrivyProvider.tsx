import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

interface PrivyProviderProps {
  children: React.ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  const router = useRouter();

  return (
    <BasePrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#39ff14',
          logo: '/smol.png',
        },
        embeddedWallets: {
          createOnLogin: 'all',
          noPromptOnSignature: false,
        },
        defaultChain: 'solana:mainnet',
        supportedChains: ['solana:mainnet', 'solana:devnet'],
        walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }}
      onSuccess={() => {
        router.push('/');
      }}
    >
      {children}
    </BasePrivyProvider>
  );
} 