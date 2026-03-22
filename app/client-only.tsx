'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import providers to avoid SSR issues
const Providers = dynamic(() => import('./providers').then(m => ({ default: m.Providers })), {
  ssr: false,
  loading: () => <LoadingScreen />
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

function ErrorFallback({ error }: { error: Error }) {
  const isChainError = error?.message?.toLowerCase().includes('chain') || 
                       error?.message?.toLowerCase().includes('not configured');

  const handleReset = () => {
    // Clear wagmi/wallet cached state so reconnect doesn't crash again
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('wagmi') || key.startsWith('wc@') || key.startsWith('walletconnect') || key.includes('rainbowkit'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  return (
    <main className="min-h-screen animated-bg flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        {isChainError ? (
          <>
            <p className="text-yellow-400 mb-2 font-bold">Wrong network detected</p>
            <p className="text-gray-400 text-sm mb-4">Your wallet was connected to an unsupported chain. Click below to reset and reconnect on Celo Sepolia.</p>
          </>
        ) : (
          <p className="text-red-400 mb-4">Error: {error?.message || 'Unknown'}</p>
        )}
        <button 
          onClick={handleReset}
          className="px-6 py-2 rounded-lg bg-green-500 text-black font-bold"
        >
          {isChainError ? 'Reset & Reconnect' : 'Reload'}
        </button>
      </div>
    </main>
  );
}

// Error boundary class component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      setMounted(true);
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary onError={setError}>
      <Providers>{children}</Providers>
    </ErrorBoundary>
  );
}