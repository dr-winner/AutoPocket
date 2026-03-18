'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Loading component
function Loading() {
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

// Error component
function ErrorFallback() {
  return (
    <main className="min-h-screen animated-bg flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-400 mb-4">Failed to load. Please refresh.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-lg bg-green-500 text-black font-bold"
        >
          Reload
        </button>
      </div>
    </main>
  );
}

// Dynamically import the actual page with error boundary
const HomePage = dynamic(() => import('./page'), { 
  ssr: false,
  loading: () => <Loading />
});

export default function PageWrapper() {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Catch any errors during loading
    const handleError = () => setError(true);
    const handleRejection = () => setError(true);
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    // Set a timeout - if page doesn't load in 5 seconds, show error
    const timeout = setTimeout(() => {
      // Check if we still have the loading state
      const loadingEl = document.querySelector('p.text-gray-400');
      if (loadingEl && loadingEl.textContent === 'Loading...') {
        setError(true);
      }
    }, 5000);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      clearTimeout(timeout);
    };
  }, []);
  
  if (error) {
    return <ErrorFallback />;
  }
  
  return <HomePage />;
}