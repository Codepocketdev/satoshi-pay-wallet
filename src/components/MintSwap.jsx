import { useState } from 'react'
import { ArrowDownUp, ArrowLeft, Loader2 } from 'lucide-react'
import { CashuMint, CashuWallet } from '@cashu/cashu-ts'
import { vibrate } from '../utils/cashu.js'

export default function MintSwap({
  allMints,
  balances,
  wallet,
  masterKey,
  bip39Seed,
  getProofs,
  saveProofs,
  addTransaction,
  onBack,
  setError,
  setSuccess
}) {
  const [fromMint, setFromMint] = useState(allMints[0])
  const [toMint, setToMint] = useState(allMints[1] || allMints[0])
  const [swapAmount, setSwapAmount] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)

  const fromBalance = balances[fromMint?.url] || 0
  const estimatedFee = Math.ceil(Number(swapAmount) * 0.02) || 0
  const availableForSwap = Math.floor(fromBalance * 0.98)

  const handleSwap = async () => {
    try {
      setIsSwapping(true)
      setError('')

      const amount = Number(swapAmount)

      if (!amount || amount <= 0) {
        setError('Please enter a valid amount')
        return
      }

      if (amount > fromBalance) {
        setError('Insufficient balance')
        return
      }

      if (fromMint.url === toMint.url) {
        setError('Please select different mints')
        return
      }

      console.log('Starting swap:', { from: fromMint.name, to: toMint.name, amount })

      console.log('Step 1: Creating destination wallet and loading keys')
      const toMintInstance = new CashuMint(toMint.url)
      const toWallet = new CashuWallet(toMintInstance, { bip39seed: bip39Seed })
      await toWallet.getKeys() // LOAD KEYS!
      console.log('Destination wallet ready')

      console.log('Step 2: Creating mint quote on', toMint.name)
      const mintQuote = await toWallet.createMintQuote(amount)
      console.log('Mint quote created:', mintQuote.quote)

      console.log('Step 3: Creating source wallet and loading keys')
      const fromMintInstance = new CashuMint(fromMint.url)
      const fromWallet = new CashuWallet(fromMintInstance, { bip39seed: bip39Seed })
      await fromWallet.getKeys() // LOAD KEYS!
      console.log('Source wallet ready')

      console.log('Step 4: Creating melt quote on', fromMint.name)
      const meltQuote = await fromWallet.createMeltQuote(mintQuote.request)
      console.log('Melt quote created:', meltQuote.quote)

      const totalCost = meltQuote.amount + meltQuote.fee_reserve
      console.log('Total cost:', totalCost, 'sats (including', meltQuote.fee_reserve, 'fee)')

      if (totalCost > fromBalance) {
        setError(`Not enough funds. Need ${totalCost} sats (including ${meltQuote.fee_reserve} sats fee)`)
        return
      }

      console.log('Step 5: Getting proofs from source mint')
      const allProofs = await getProofs(fromMint.url)
      console.log('Found', allProofs.length, 'proofs')

      console.log('Step 6: Splitting proofs')
      const sendOptions = {}
      const sendResult = await fromWallet.send(totalCost, allProofs, sendOptions)
      
      const proofsToKeep = sendResult.keep || sendResult.returnChange || []
      const proofsToMelt = sendResult.send || []

      if (!proofsToMelt || proofsToMelt.length === 0) {
        throw new Error('Failed to prepare proofs for melting')
      }

      console.log('Split complete')

      console.log('Step 7: Saving keep proofs BEFORE melting')
      await saveProofs(fromMint.url, proofsToKeep)
      console.log('Keep proofs saved')

      console.log('Step 8: Melting tokens')
      const meltResponse = await fromWallet.meltProofs(meltQuote, proofsToMelt)
      console.log('Tokens melted')

      console.log('Step 9: Handling melt change')
      const changeProofs = meltResponse.change || []
      if (changeProofs.length > 0) {
        const currentProofs = await getProofs(fromMint.url)
        await saveProofs(fromMint.url, [...currentProofs, ...changeProofs])
      }

      console.log('Step 10: Waiting for settlement...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      console.log('Step 11: Minting on destination')
      const newProofs = await toWallet.mintProofs(amount, mintQuote.quote)
      console.log('Minted', newProofs.length, 'proofs')

      console.log('Step 12: Saving to destination')
      const existingToProofs = await getProofs(toMint.url)
      await saveProofs(toMint.url, [...existingToProofs, ...newProofs])


      addTransaction('send', amount, `Swap to ${toMint.name}`, fromMint.url, 'paid')
      addTransaction('receive', amount, `Swap from ${fromMint.name}`, toMint.url, 'paid')

      setSuccess(`Swapped ${amount} sats from ${fromMint.name} to ${toMint.name}!`)
      vibrate([200])
      setSwapAmount('')

      console.log('SWAP COMPLETED!')

      setTimeout(() => {
        onBack()
      }, 2000)

    } catch (err) {
      console.error('SWAP ERROR:', err)
      const errorMsg = err?.message || 'Unknown error occurred'
      setError(`Swap failed: ${errorMsg}`)
    } finally {
      setIsSwapping(false)
    }
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Swap</h1>
      </header>

      <div className="card">
        <h3 style={{ marginBottom: '1em' }}>Swap Tokens</h3>

        <div style={{ marginBottom: '1.5em' }}>
          <label style={{
            display: 'block',
            fontSize: '0.85em',
            opacity: 0.7,
            marginBottom: '0.5em'
          }}>
            From Mint
          </label>
          <select
            value={fromMint?.url}
            onChange={(e) => setFromMint(allMints.find(m => m.url === e.target.value))}
            disabled={isSwapping}
            style={{
              width: '100%',
              padding: '0.8em',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '1em'
            }}
          >
            {allMints.map(mint => (
              <option key={mint.url} value={mint.url}>
                {mint.name} ({balances[mint.url] || 0} sats)
              </option>
            ))}
          </select>

          <div style={{
            marginTop: '0.5em',
            fontSize: '0.9em',
            color: '#FF8C00'
          }}>
            Available: {fromBalance} sats
            {fromBalance > 0 && (
              <span style={{ opacity: 0.7, marginLeft: '0.5em' }}>
                (~{availableForSwap} sats after fees)
              </span>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '1em 0'
        }}>
          <ArrowDownUp size={24} style={{ color: '#FF8C00' }} />
        </div>

        <div style={{ marginBottom: '1.5em' }}>
          <label style={{
            display: 'block',
            fontSize: '0.85em',
            opacity: 0.7,
            marginBottom: '0.5em'
          }}>
            To Mint
          </label>
          <select
            value={toMint?.url}
            onChange={(e) => setToMint(allMints.find(m => m.url === e.target.value))}
            disabled={isSwapping}
            style={{
              width: '100%',
              padding: '0.8em',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '1em'
            }}
          >
            {allMints.map(mint => (
              <option key={mint.url} value={mint.url}>
                {mint.name} ({balances[mint.url] || 0} sats)
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5em' }}>
          <label style={{
            display: 'block',
            fontSize: '0.85em',
            opacity: 0.7,
            marginBottom: '0.5em'
          }}>
            Amount (sats)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              disabled={isSwapping}
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '0.8em',
                paddingRight: '4em',
                fontSize: '1.1em'
              }}
            />
            <button
              onClick={() => setSwapAmount(availableForSwap.toString())}
              disabled={isSwapping || fromBalance === 0}
              style={{
                position: 'absolute',
                right: '0.5em',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#FF8C00',
                border: 'none',
                borderRadius: '4px',
                padding: '0.4em 0.8em',
                color: 'white',
                fontSize: '0.85em',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              MAX
            </button>
          </div>

          {swapAmount && estimatedFee > 0 && (
            <div style={{
              marginTop: '0.5em',
              fontSize: '0.85em',
              opacity: 0.7
            }}>
              Estimated fee: ~{estimatedFee} sats (2%)
            </div>
          )}
        </div>

        <button
          className="primary-btn"
          onClick={handleSwap}
          disabled={isSwapping || !swapAmount || Number(swapAmount) <= 0 || fromMint?.url === toMint?.url}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em'
          }}
        >
          {isSwapping ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Swapping...
            </>
          ) : (
            <>
              <ArrowDownUp size={20} />
              Swap Tokens
            </>
          )}
        </button>

        <div style={{
          marginTop: '1.5em',
          padding: '1em',
          background: 'rgba(255, 140, 0, 0.1)',
          borderRadius: '8px',
          fontSize: '0.85em',
          lineHeight: '1.6'
        }}>
          <strong>How it works:</strong>
          <ol style={{ marginTop: '0.5em', paddingLeft: '1.2em' }}>
            <li>Request Lightning invoice from destination mint</li>
            <li>Pay invoice using tokens from source mint</li>
            <li>Receive new tokens at destination mint</li>
          </ol>
          <div style={{ marginTop: '0.8em', opacity: 0.8 }}>
            <strong>Note:</strong> Swap fees (~2%) are charged by mints for Lightning operations.
          </div>
        </div>
      </div>
    </div>
  )
}

