import type { Metadata } from 'next';
import './globals.css';
import TestPage from './test-page';

export const metadata: Metadata = {
  title: 'AutoPocket - Autonomous Savings Agent',
  description: '🤖 AI-powered autonomous savings & bill payment agent for Celo. ERC-8004 compliant.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout() {
  return (
    <html lang="en">
      <body>
        <TestPage />
      </body>
    </html>
  );
}