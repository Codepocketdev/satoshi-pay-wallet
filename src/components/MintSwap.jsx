import { useState } from 'react'
import { ArrowDownUp, ArrowLeft, Loader2 } from 'lucide-react'
import { CashuMint, CashuWallet } from '@cashu/cashu-ts'

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

      console.log('Step 1: Creating mint quote on', toMint.name)
      const toMintInstance = new CashuMint(toMint.url)
      const toWallet = new CashuWallet(toMintInstance, { bip39seed: bip39Seed })
      const mintQuote = await toWallet.createMintQuote(amount)
      console.log('Mint quote created:', mintQuote.quote)

      console.log('Step 2: Creating melt quote on', fromMint.name)
      const fromMintInstance = new CashuMint(fromMint.url)
      const fromWallet = new CashuWallet(fromMintInstance, { bip39seed: bip39Seed })
      const meltQuote = await fromWallet.createMeltQuote(mintQuote.request)
      console.log('Melt quote created:', meltQuote.quote)

      const totalCost = meltQuote.amount + meltQuote.fee_reserve
      console.log('Total cost:', totalCost, 'sats (including', meltQuote.fee_reserve, 'fee)')

      if (totalCost > fromBalance) {
        setError(`Not enough funds. Need ${totalCost} sats (including ${meltQuote.fee_reserve} sats fee)`)
        return
      }

      console.log('Step 3: Getting proofs from source mint')
      const allProofs = await getProofs(fromMint.url)
      console.log('Found', allProofs.length, 'proofs')

      let selectedProofs = []
      let sum = 0

      for (const proof of allProofs) {
        if (sum >= totalCost) break
        selectedProofs.push(proof)
        sum += proof.amount
      }

      if (sum < totalCost) {
        setError('Unable to select enough proofs for swap')
        return
      }

      console.log('Selected', selectedProofs.length, 'proofs totaling', sum, 'sats')

      console.log('Step 4: Melting tokens from', fromMint.name)
      const meltResponse = await fromWallet.meltTokens(meltQuote, selectedProofs)
      console.log('Tokens melted! Lightning invoice paid!')

      console.log('Step 5: Updating source mint proofs')
      const remainingProofs = allProofs.filter(p =>
        !selectedProofs.find(sp => sp.secret === p.secret)
      )

      if (meltResponse.change && meltResponse.change.length > 0) {
        console.log('Got', meltResponse.change.length, 'change proofs')
        remainingProofs.push(...meltResponse.change)
      }

      saveProofs(fromMint.url, remainingProofs)
      console.log('Source mint updated')

      console.log('Step 6: Waiting for Lightning settlement...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('Step 7: Minting tokens on', toMint.name)
      const { proofs: newProofs } = await toWallet.mintTokens(amount, mintQuote.quote)
      console.log('Minted', newProofs.length, 'new proofs!')

      console.log('Step 8: Saving proofs to destination mint')
      const existingToProofs = await getProofs(toMint.url)
      saveProofs(toMint.url, [...existingToProofs, ...newProofs])
      console.log('Destination mint updated')

      addTransaction('send', amount, `Swap to ${toMint.name}`, fromMint.url, 'paid')
      addTransaction('receive', amount, `Swap from ${fromMint.name}`, toMint.url, 'paid')

      setSuccess(`Swapped ${amount} sats from ${fromMint.name} to ${toMint.name}!`)
      setSwapAmount('')

      console.log('SWAP COMPLETED!')

      setTimeout(() => {
        onBack()
      }, 2000)

    } catch (err) {
      console.error('SWAP ERROR:', err)
      console.error('Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      })

      const errorMsg = err?.message || err?.toString() || 'Unknown error occurred'
      alert('REAL ERROR: ' + errorMsg)
      alert('ERROR OBJECT: ' + JSON.stringify(err, Object.getOwnPropertyNames(err)))
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

