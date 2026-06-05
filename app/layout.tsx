import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Atmosphere } from '@/components/Atmosphere';

export const metadata: Metadata = {
  title: 'Just Sweep It — cross-chain consolidation · built on SODAX',
  description:
    'Sweep scattered crypto fragments across EVM chains and Solana into one token, one chain, one tap. Built on SODAX.',
};

export const viewport: Viewport = {
  themeColor: '#ece3cf',
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
