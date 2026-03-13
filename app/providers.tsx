'use client';

import { WagmiProvider, createConfig, http, fallback } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { celo, celoAlfajores } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useState } from 'react';

const config = createConfig({
  chains: [celoAlfajores, celo],
  transports: {
    [celoAlfajores.id]: fallback([
      http('https://celo-sepolia.rpc.thirdweb.com'),
      http('https://forno.celo.org'),
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
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}