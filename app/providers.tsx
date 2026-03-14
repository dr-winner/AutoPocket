'use client';

import { WagmiProvider, createConfig, http, fallback } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, celo, celoAlfajores } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useState } from 'react';

// Get free projectId at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '570d27fd124c1dbc243a7e48350a91c0';

// Custom chain for Celo Sepolia
const celoSepolia = {
  id: 447869,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://celo-sepoliarpc.testnetops.io'] },
    public: { http: ['https://celo-sepoliarpc.testnetops.io'] },
  },
  blockExplorers: {
    default: { name: 'Celo Explorer', url: 'https://sepolia.celoscan.io' },
  },
  testnet: true,
} as const;

const config = getDefaultConfig({
  appName: 'AutoPocket',
  projectId: projectId,
  chains: [mainnet, celo, celoAlfajores, celoSepolia],
  transports: {
    [mainnet.id]: http(),
    [celoAlfajores.id]: fallback([
      http('https://alfajores.forno.celo.org'),
    ]),
    [celoSepolia.id]: fallback([
      http('https://celo-sepoliarpc.testnetops.io'),
    ]),
    [celo.id]: fallback([
      http('https://forno.celo.org'),
    ]),
  },
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#35D07F',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}