'use client';

import { useState, useEffect } from 'react';
import { WagmiProvider, http, fallback, createConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, celo } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Custom chain for Celo Sepolia
const celoSepoliaTestnet = {
  id: 447869,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
    public: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
  blockExplorers: {
    default: { name: 'Celo Explorer', url: 'https://sepolia.celoscan.io' },
  },
  testnet: true,
} as const;

// Create config outside component to avoid recreation
let config: ReturnType<typeof createConfig> | null = null;

function getConfig() {
  if (!config) {
    config = getDefaultConfig({
      appName: 'AutoPocket',
      projectId: '570d27fd124c1dbc243a7e48350a91c0',
      chains: [mainnet, celo, celoSepoliaTestnet],
      transports: {
        [mainnet.id]: fallback([http()]),
        [celoSepoliaTestnet.id]: fallback([
          http('https://forno.celo-sepolia.celo-testnet.org'),
        ]),
        [celo.id]: fallback([
          http('https://forno.celo.org'),
        ]),
      },
    });
  }
  return config;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ 
    defaultOptions: { 
      queries: { 
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
      } 
    } 
  }));
  
  const [wagmiConfig] = useState(() => getConfig());

  return (
    <WagmiProvider config={wagmiConfig}>
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
          coolMode={false}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}