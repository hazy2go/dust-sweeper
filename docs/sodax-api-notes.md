# SODAX SDK rc.8 — verified API notes

Verified against installed `@sodax/sdk@2.0.0-rc.8` type defs (not docs). Source of truth for our code.

## Sodax root
- `new Sodax(config?: DeepPartial<SodaxConfig>)`. Partner fee → `{ swaps: { partnerFee } }`.
- Services: `.swaps`, `.bridge`, `.moneyMarket`, `.partners`, `.recovery`, `.config`, `.backendApi`, `.dex`, `.staking`, `.migration`, `.hubProvider`, `.spoke`.
- `initialize(): Promise<Result<void>>` — fetches fresh chain/token config; falls back to packaged defaults on failure.

## Result
`type Result<T,E> = { ok:true; value:T } | { ok:false; error:E }`. Always discriminate on `.ok`.

## PartnerFee  ⚠ unit confirmed
`PartnerFeePercentage = { address: Address; percentage: number }` — **percentage is BASIS POINTS, max 100 (= 1%)**. So `15` = 0.15%. (`PartnerFeeAmount = { address; amount: bigint }`; if both, amount wins.)

## SwapService (`sodax.swaps`)
- `getQuote(payload: SolverIntentQuoteRequest): Promise<Result<SolverIntentQuoteResponse, SolverErrorResponse>>`
- `getPartnerFee(inputAmount: bigint): bigint`   (sync)
- `getSolverFee(inputAmount: bigint): bigint`     (sync, fixed 0.1%)
- `isAllowanceValid(params): Promise<Result<boolean>>`
- `approve(params): Promise<Result<TxReturnType>>`
- `createIntent(params): Promise<Result<CreateIntentResult, SwapCreateIntentError>>` → `{ tx, intent, relayData }`
- `submitIntent(payload: IntentRelayRequest<'submit'>): Promise<Result<GetRelayResponse<'submit'>>>`
- `postExecution(req: SolverExecutionRequest): Promise<Result<SolverExecutionResponse, PostExecutionError>>`
- `getStatus(req: SolverIntentStatusRequest): Promise<Result<SolverIntentStatusResponse, SolverErrorResponse>>`
- `swap(params): Promise<Result<SwapResponse, SwapError>>`  (all-in-one; we use the split path instead)

`SolverIntentQuoteRequest = { token_src; token_src_blockchain_id: SpokeChainKey; token_dst; token_dst_blockchain_id: SpokeChainKey; amount: bigint; quote_type: QuoteType }`

## ConfigService (`sodax.config`)
- `getSupportedSwapTokensByChainId(chainId: SpokeChainKey): readonly XToken[]`  (SYNC)
- `getSupportedSwapTokens(): GetSwapTokensApiResponse`
- `getSupportedSpokeChains(): SpokeChainKey[]`
- `findSupportedTokenBySymbol(chainId, symbol): XToken | undefined`

`XToken = { symbol; name; decimals; address; chainKey: ChainKey; hubAsset: Address; vault: Address }`  ← field is **chainKey**, not xChainId.

## ChainKeys (exact string values)
`SONIC_MAINNET="sonic"`, `ETHEREUM_MAINNET="ethereum"`, `BASE_MAINNET="0x2105.base"`, `ARBITRUM_MAINNET="0xa4b1.arbitrum"`, `OPTIMISM_MAINNET="0xa.optimism"`, `POLYGON_MAINNET="0x89.polygon"`, `BSC_MAINNET="0x38.bsc"`, `AVALANCHE_MAINNET="0xa86a.avax"`, `SOLANA_MAINNET="solana"`. Import `{ ChainKeys }` from `@sodax/sdk`.

## partners.feeClaim
- `fetchAssetsBalances(queryAddress: string): Promise<Result<Map<string, PartnerFeeClaimAssetBalance>>>`
- `swap(params): Promise<Result<IntentAutoSwapResult>>`, `setSwapPreference`, `isTokenApproved`, `approveToken`.

## recovery
- `fetchHubAssetBalances({ chainKey, srcAddress }): Promise<Result<HubAssetBalance[]>>`
- `withdrawHubAsset({ srcChainKey, srcAddress, token, amount }, ...): Promise<Result<TxReturnType>>`
- `HubAssetBalance = { spokeTokenAddress; hubAssetAddress; symbol; name; decimal; balance: bigint }`

## wallet-sdk-react
- `<SodaxWalletProvider config={SodaxWalletConfig}>`
- `useXConnectors({ xChainType } | { xChainId }): IXConnector[]`
- `useXConnect(): UseMutationResult<XAccount|undefined, Error, IXConnector>`
- `useXAccount({ xChainType } | { xChainId }): XAccount`  (`.address`)
- `useWalletProvider<K>(xChainId: K): GetWalletProviderType<K> | undefined`  ← positional arg, not object

## dapp-kit
- `<SodaxProvider config={DeepPartial<SodaxConfig>}>`, `createSodaxQueryClient()`
- hooks: `useSwap`, `useApproveToken`, `useQuote`, `useFetchAssetsBalances`, `useFeeClaimSwap`, `useWithdrawHubAsset`, `useHubAssetBalances`.
