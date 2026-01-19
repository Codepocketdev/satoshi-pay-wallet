import { useQueries } from '@tanstack/react-query'
import { CashuMint, CashuWallet } from '@cashu/cashu-ts'
import { getPendingMintQuotes, deleteMintQuote } from '../utils/mintQuoteRepository.js'
import { vibrate } from '../utils/cashu.js'

export const useMintQuoteProcessor = ({
  bip39Seed,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  setSuccess,
  onQuotePaid
}) => {
  // Get all pending quotes
  const { data: pendingQuotes = [] } = useQueries({
    queries: [
      {
        queryKey: ['pending-mint-quotes'],
        queryFn: getPendingMintQuotes,
        refetchInterval: 5000, // Check for new pending quotes every 5s
        refetchIntervalInBackground: true,
      }
    ]
  })[0]

  // Poll each quote
  useQueries({
    queries: pendingQuotes.map((quote) => ({
      queryKey: ['mint-quote-check', quote.id],
      queryFn: async () => {
        try {
          const mint = new CashuMint(quote.mintUrl)
          const wallet = new CashuWallet(mint, { bip39seed: bip39Seed })

          const mintQuote = await wallet.mint.checkMintQuote(quote.id)

          if (mintQuote.state === 'PAID' || mintQuote.state === 'ISSUED') {
            // Mint the tokens
            const proofs = await wallet.mintProofs(quote.amount, quote.id)

            if (proofs && proofs.length > 0) {
              // Add to existing proofs
              const existingProofs = await getProofs(quote.mintUrl)
              const allProofs = [...existingProofs, ...proofs]
              await saveProofs(quote.mintUrl, allProofs)

              await calculateAllBalances()

              await addTransaction(
                'receive',
                quote.amount,
                'Minted via Lightning',
                quote.mintUrl
              )

              await deleteMintQuote(quote.id)

              vibrate([200])
              setSuccess(`✅ Received ${quote.amount} sats!`)
              setTimeout(() => setSuccess(''), 2000)
              
              // Clear invoice UI
              if (onQuotePaid) {
                onQuotePaid()
              }
            }
          }

          return mintQuote
        } catch (err) {
          console.error('Error checking quote:', err)
          
          if (err.message?.includes('already issued')) {
            await deleteMintQuote(quote.id)
          }
          
          throw err
        }
      },
      refetchInterval: 10000, // Poll every 10 seconds like BoardwalkCash
      refetchIntervalInBackground: true,
      retry: 1,
      enabled: !!bip39Seed, // Only run if we have seed
    })),
  })
}
