import { db } from './dexieDB.js'

/**
 * Save a mint quote to the database
 */
export const saveMintQuote = async (quote) => {
  try {
    await db.mintQuotes.put({
      id: quote.quote,  // Use the mint's quote ID as primary key
      state: quote.state || 'UNPAID',
      mintUrl: quote.mintUrl,
      amount: quote.amount,
      request: quote.request,
      expiresAt: Date.now() + (60 * 60 * 1000),  // 1 hour from now
      createdAt: Date.now(),
      version: 1
    })
    console.log('✅ Saved mint quote:', quote.quote)
  } catch (err) {
    console.error('❌ Error saving mint quote:', err)
  }
}

/**
 * Get all pending mint quotes (UNPAID or PAID state)
 */
export const getPendingMintQuotes = async () => {
  try {
    const quotes = await db.mintQuotes
      .where('state')
      .anyOf(['UNPAID', 'PAID'])
      .toArray()
    
    // Filter out expired quotes
    const now = Date.now()
    const valid = quotes.filter(q => q.expiresAt > now)
    
    return valid
  } catch (err) {
    console.error('❌ Error loading pending quotes:', err)
    return []
  }
}

/**
 * Update mint quote state
 */
export const updateMintQuoteState = async (quoteId, newState) => {
  try {
    const quote = await db.mintQuotes.get(quoteId)
    if (quote) {
      await db.mintQuotes.update(quoteId, {
        state: newState,
        version: quote.version + 1,
        updatedAt: Date.now()
      })
      console.log(`✅ Updated quote ${quoteId} to ${newState}`)
    }
  } catch (err) {
    console.error('❌ Error updating quote state:', err)
  }
}

/**
 * Delete a mint quote
 */
export const deleteMintQuote = async (quoteId) => {
  try {
    await db.mintQuotes.delete(quoteId)
    console.log(`✅ Deleted quote ${quoteId}`)
  } catch (err) {
    console.error('❌ Error deleting quote:', err)
  }
}

/**
 * Get a specific mint quote
 */
export const getMintQuote = async (quoteId) => {
  try {
    return await db.mintQuotes.get(quoteId)
  } catch (err) {
    console.error('❌ Error getting quote:', err)
    return null
  }
}
