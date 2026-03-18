'use client';

import { useState, useEffect } from 'react';
import { WagmiProvider, createConfig, http, fallback } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, celo } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Get free projectId at https://cloud.walletconnect.com
const projectId = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '570d27fd124c1dbc243a7e48350a91c0')
  : '570d27fd124c1dbc243a7e48350a91c0';

// Custom chain for Celo Sepolia (not in wagmi yet)
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
const config = createConfig({
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

function LoadingScreen() {
  return (
    <main className="min-h-screen animated-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
          </svg>
        </div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </main>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient({ 
    defaultOptions: { 
      queries: { 
        staleTime: 1000 * 60,
        refetchOnWindowFocus: false,
      } 
    } 
  }));

  useEffect(() => {
    // Small delay to ensure browser is ready
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

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