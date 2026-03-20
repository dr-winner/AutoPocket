import type { Metadata } from 'next';
import './globals.css';
import ClientOnly from './client-only';

export const metadata: Metadata = {
  title: 'AutoPocket - Autonomous Savings Agent',
  description: '🤖 AI-powered autonomous savings & bill payment agent for Celo. ERC-8004 compliant.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientOnly>{children}</ClientOnly>
      </body>
    </html>
  );
}