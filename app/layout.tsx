import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Atmosphere } from '@/components/Atmosphere';

export const metadata: Metadata = {
  title: 'Just Sweep It — cross-chain consolidation · built on SODAX',
  description:
    'Sweep scattered crypto fragments across EVM chains and Solana into one token, one chain, one tap. Built on SODAX.',
  openGraph: {
    title: 'Just Sweep It',
    description: 'Every chain. Every fragment. One clean wallet. Built on SODAX.',
    images: ['/og.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#06080f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Atmosphere />
        {children}
      </body>
    </html>
  );
}
