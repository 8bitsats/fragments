'use client';

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';

interface PrivyProviderProps {
  children: React.ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {

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
          createOnLogin: 'users-without-wallets',
        },
        walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }}
    >
      {children}
    </BasePrivyProvider>
  );
} 