const STORAGE_KEY = 'satoshi_pay_contacts'

export const contactsStore = {
  
  getAllContacts() {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  },

  getContact(id) {
    const contacts = this.getAllContacts()
    return contacts.find(c => c.id === id)
  },

  addContact(contact) {
    const contacts = this.getAllContacts()
    const newContact = {
      id: Date.now().toString(),
      name: contact.name,
      nostrPubkey: contact.nostrPubkey || null,
      lightningAddress: contact.lightningAddress || null,
      avatar: contact.avatar || null,
      favorite: contact.favorite || false,
      lastUsed: Date.now(),
      createdAt: Date.now()
    }
    
    contacts.push(newContact)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts))
    return newContact
  },

  updateContact(id, updates) {
    const contacts = this.getAllContacts()
    const index = contacts.findIndex(c => c.id === id)
    
    if (index === -1) return null
    
    contacts[index] = {
      ...contacts[index],
      ...updates,
      id // Preserve ID
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts))
    return contacts[index]
  },

  deleteContact(id) {
    const contacts = this.getAllContacts()
    const filtered = contacts.filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  },

  updateLastUsed(id) {
    this.updateContact(id, { lastUsed: Date.now() })
  },

  toggleFavorite(id) {
    const contact = this.getContact(id)
    if (!contact) return
    this.updateContact(id, { favorite: !contact.favorite })
  },

  getFavorites() {
    return this.getAllContacts()
      .filter(c => c.favorite)
      .sort((a, b) => b.lastUsed - a.lastUsed)
  },

  getRecent(limit = 5) {
    return this.getAllContacts()
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit)
  },

  searchContacts(query) {
    const contacts = this.getAllContacts()
    const lowerQuery = query.toLowerCase()
    
    return contacts.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.nostrPubkey && c.nostrPubkey.toLowerCase().includes(lowerQuery)) ||
      (c.lightningAddress && c.lightningAddress.toLowerCase().includes(lowerQuery))
    )
  }
}
