export type SweepPhase = 'idle' | 'quoting' | 'approving' | 'swapping' | 'done' | 'failed';

export interface TokenSweepState {
  id: string;
  chainKey: string;
  symbol: string;
  phase: SweepPhase;
  /** solver-quoted output (base units, string) */
  quotedOut?: string;
  /** min acceptable output after slippage (base units, string) */
  minOut?: string;
  /** solver intent hash on success */
  intentHash?: string;
  /** failure stage + message */
  failedAt?: string;
  error?: string;
  /** true when funds may have moved and recovery may be needed */
  recoverable?: boolean;
}

export const tokenId = (chainKey: string, address: string) => `${chainKey}:${address.toLowerCase()}`;

export const isTerminal = (p: SweepPhase) => p === 'done' || p === 'failed';
