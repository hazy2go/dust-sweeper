'use client';

import { SodaxProvider, createSodaxQueryClient } from '@sodax/dapp-kit';
import { SodaxWalletProvider, type SodaxWalletConfig } from '@sodax/wallet-sdk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ChainKeys } from '@sodax/sdk';
import { PARTNER_FEE } from '@/lib/config';

const queryClient = createSodaxQueryClient();

const RPC = {
  sonic: process.env.NEXT_PUBLIC_SONIC_RPC ?? 'https://rpc.soniclabs.com',
  ethereum: process.env.NEXT_PUBLIC_ETH_RPC ?? 'https://eth.llamarpc.com',
  base: process.env.NEXT_PUBLIC_BASE_RPC ?? 'https://mainnet.base.org',
  arbitrum: process.env.NEXT_PUBLIC_ARB_RPC ?? 'https://arb1.arbitrum.io/rpc',
  optimism: process.env.NEXT_PUBLIC_OP_RPC ?? 'https://mainnet.optimism.io',
  polygon: process.env.NEXT_PUBLIC_POLYGON_RPC ?? 'https://polygon-rpc.com',
  bsc: process.env.NEXT_PUBLIC_BSC_RPC ?? 'https://bsc-dataseed.binance.org',
  avax: process.env.NEXT_PUBLIC_AVAX_RPC ?? 'https://api.avax.network/ext/bc/C/rpc',
  solana: process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com',
};

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const evmSlot: NonNullable<SodaxWalletConfig['EVM']> = {
  ssr: true,
  reconnectOnMount: true,
  chains: {
    [ChainKeys.SONIC_MAINNET]: { rpcUrl: RPC.sonic },
    [ChainKeys.ETHEREUM_MAINNET]: { rpcUrl: RPC.ethereum },
    [ChainKeys.BASE_MAINNET]: { rpcUrl: RPC.base },
    [ChainKeys.ARBITRUM_MAINNET]: { rpcUrl: RPC.arbitrum },
    [ChainKeys.OPTIMISM_MAINNET]: { rpcUrl: RPC.optimism },
    [ChainKeys.POLYGON_MAINNET]: { rpcUrl: RPC.polygon },
    [ChainKeys.BSC_MAINNET]: { rpcUrl: RPC.bsc },
    [ChainKeys.AVALANCHE_MAINNET]: { rpcUrl: RPC.avax },
  },
};
if (WC_PROJECT_ID) {
  evmSlot.walletConnect = { projectId: WC_PROJECT_ID };
}

const walletConfig: SodaxWalletConfig = {
  EVM: evmSlot,
  SOLANA: {
    chains: {
      [ChainKeys.SOLANA_MAINNET]: { rpcUrl: RPC.solana },
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SodaxProvider config={{ swaps: { partnerFee: PARTNER_FEE } }}>
      <QueryClientProvider client={queryClient}>
        <SodaxWalletProvider config={walletConfig}>{children}</SodaxWalletProvider>
      </QueryClientProvider>
    </SodaxProvider>
  );
}
