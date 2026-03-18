'use client';

import { useState } from 'react';
import { WagmiProvider, createConfig, http, fallback } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, celo } from 'wagmi/chains';
import { darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// WalletConnect project ID
const projectId = '570d27fd124c1dbc243a7e48350a91c0';

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

// Create config - using function to avoid issues
const createWagmiConfig = () => createConfig({
  chains: [mainnet, celo, celoSepoliaTestnet],
  transports: {
    [mainnet.id]: fallback([http()]),
    [celoSepoliaTestnet.id]: fallback([
      http('https://forno.celo-sepolia.celo-testnet.org'),
      http('https://rpc.ankr.com/celo_sepolia'),
    ]),
    [celo.id]: fallback([
      http('https://forno.celo.org'),
    ]),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [config] = useState(() => createWagmiConfig());
  const [queryClient] = useState(() => new QueryClient({ 
    defaultOptions: { 
      queries: { 
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
      } 
    } 
  }));

  return (
    <WagmiProvider config={config} reconnect={false}>
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