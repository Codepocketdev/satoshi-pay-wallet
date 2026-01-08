# ⚡ Satoshi Pay - Bitcoin Ecash Wallet

A modern, open-source Bitcoin wallet powered by Cashu ecash protocol and Lightning Network. Send and receive bitcoin instantly with enhanced privacy.

[![Live Demo](https://img.shields.io/badge/Live-Demo-orange)](https://satoshi-pay-wallet.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/Codepocketdev/satoshi-pay-wallet)](https://github.com/Codepocketdev/satoshi-pay-wallet/issues)

---

## 🚀 Live Demo

**Try it now:** [https://satoshi-pay-wallet.vercel.app](https://satoshi-pay-wallet.vercel.app)

📱 **Install as PWA** for the best mobile experience! Tap "Add to Home Screen" in your browser menu.

---

## ✨ Features

### 🔐 **Privacy First**
- **Cashu Ecash Protocol**: Enhanced privacy through blind signatures
- **No Personal Data**: No registration, no KYC, no tracking
- **Non-Custodial**: You control your keys and funds

### ⚡ **Lightning Fast**
- **Instant Payments**: Send and receive sats in seconds
- **Lightning Network**: Connect to the global Bitcoin payment network
- **Multi-Mint Support**: Use multiple Cashu mints simultaneously

### 💼 **Full-Featured Wallet**
- **Generate Invoices**: Create Lightning invoices to receive bitcoin
- **Send Tokens**: Generate ecash tokens to send to others
- **Receive Tokens**: Redeem ecash tokens from any Cashu mint
- **Transaction History**: Track all your payments
- **Balance Management**: View balances across multiple mints

### 🔄 **Wallet Recovery**
- **12-Word Seed Phrase**: Standard BIP39 mnemonic backup
- **Restore from Seed**: Recover your funds from any device
- **Multi-Mint Restore**: Automatically scans all mints for your tokens

### 🌐 **Nostr Integration** 
- **Nostr DMs**: Receive ecash tokens via Nostr direct messages
- **Lightning Address**: Use your Nostr Lightning address (Coming Soon)
- **Social Payments**: Send sats to Nostr npubs

### 📱 **Progressive Web App**
- **Install on Any Device**: Works on iOS, Android, and Desktop
- **Offline Capable**: Access your wallet anytime
- **Native Feel**: Smooth, app-like experience

---

## 🎯 What is Cashu?

[Cashu](https://cashu.space) is a free and open-source ecash protocol built on Bitcoin and Lightning Network. It provides:

- **Privacy**: Uses blind signatures so mints can't track your transactions
- **Instant Payments**: Ecash tokens settle instantly
- **Lightning Compatible**: Mint and melt tokens using Lightning invoices
- **Offline Transactions**: Send tokens without internet connection
- **Interoperability**: Tokens work across all Cashu wallets

### How It Works

1. **Mint**: Pay a Lightning invoice to create ecash tokens
2. **Hold**: Store tokens in your wallet (mint doesn't know it's you)
3. **Send**: Share tokens with anyone via text, QR, or Nostr
4. **Receive**: Redeem tokens from others instantly
5. **Melt**: Convert tokens back to Lightning at any time

---

## 🏁 Getting Started

### For Users

1. **Visit**: [https://satoshi-pay-wallet.vercel.app](https://satoshi-pay-wallet.vercel.app)
2. **Install**: Tap "Add to Home Screen" in your browser menu
3. **Create Wallet**: Your seed phrase will be generated automatically
4. **Backup**: Write down your 12-word seed phrase securely
5. **Fund**: Create an invoice to receive your first sats!

### For Developers

#### Prerequisites
- Node.js 18+ 
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/Codepocketdev/satoshi-pay-wallet.git
cd satoshi-pay-wallet

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app running locally.

#### Build for Production

```bash
npm run build
npm run preview
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite
- **Cashu Library**: [@cashu/cashu-ts](https://github.com/cashubtc/cashu-ts)
- **Nostr**: [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- **QR Codes**: jsQR for scanning, qrcode-generator for creating
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA plugin
- **Deployment**: Vercel

---

## 🏗️ Project Structure

```
satoshi-pay-wallet/
├── src/
│   ├── components/       # React components
│   │   ├── App.jsx      # Main app component
│   │   ├── SendPage.jsx # Send tokens interface
│   │   ├── ReceivePage.jsx # Receive tokens interface
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   │   └── useWallet.js # Wallet state management
│   ├── utils/           # Utility functions
│   │   ├── cashu.js     # Cashu protocol logic
│   │   ├── storage.js   # localStorage wrapper
│   │   └── nostr.js     # Nostr integration
│   └── main.jsx         # App entry point
├── public/              # Static assets
│   ├── manifest.json    # PWA manifest
│   ├── sw.js           # Service worker
│   └── icons/          # App icons
└── vite.config.js      # Vite configuration
```

---

## 🔐 Security

### Your Responsibility
- **Backup Your Seed**: Write down your 12-word seed phrase on paper
- **Keep It Secret**: Never share your seed phrase with anyone
- **Multiple Copies**: Store backups in separate secure locations
- **Test Recovery**: Verify you can restore your wallet before storing large amounts

### Wallet Security
- **Non-Custodial**: You control your private keys
- **No Server**: No backend storing your data
- **Local Storage**: All data stored locally on your device
- **Open Source**: Code is public and auditable

### Cashu Trust Model
- **Mint Trust**: You trust the mint not to rug-pull your funds
- **Privacy**: Mint cannot track how you spend tokens
- **Multi-Mint**: Spread risk across multiple mints
- **Lightning Gateway**: Convert to Lightning anytime to minimize mint risk

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Report Bugs
Found a bug? [Open an issue](https://github.com/Codepocketdev/satoshi-pay-wallet/issues/new) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Suggest Features
Have an idea? [Open an issue](https://github.com/Codepocketdev/satoshi-pay-wallet/issues/new) with:
- Feature description
- Use case / problem it solves
- Proposed implementation (optional)

### Submit Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 Roadmap

### ✅ Completed
- [x] Basic Cashu wallet functionality
- [x] Lightning invoice generation
- [x] Send/receive ecash tokens
- [x] Multi-mint support
- [x] Transaction history
- [x] Wallet restore from seed
- [x] PWA installation
- [x] QR code scanning
- [x] Nostr DM token sending

### 🔮 Future Plans
- [ ] Token swap between mints
- [ ] Scheduled/recurring payments
- [ ] Multi-signature transactions
- [ ] Hardware wallet support
- [ ] Tor/VPN integration
- [ ] Fiat currency display
- [ ] Payment requests with memos
- [ ] Wallet encryption with password

---

## 🐛 Known Issues

See our [issue tracker](https://github.com/Codepocketdev/satoshi-pay-wallet/issues) for current bugs and feature requests.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Cashu Protocol**: Created by [@callebtc](https://github.com/callebtc)
- **Cashu TS Library**: [@cashu/cashu-ts](https://github.com/cashubtc/cashu-ts)
- **Default Mints**: Thanks to all public Cashu mint operators
- **Community**: All contributors and testers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Codepocketdev/satoshi-pay-wallet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Codepocketdev/satoshi-pay-wallet/discussions)
- **Email**: support@satoshi-pay.com (if applicable)

---

## ⚠️ Disclaimer

This wallet is in active development. While we strive for security and reliability:

- **Use at your own risk**: Only store amounts you can afford to lose
- **Test first**: Try with small amounts before larger transactions
- **Backup religiously**: Your seed phrase is your only backup
- **Mint trust**: Remember that Cashu mints are custodial (though private)
- **No warranties**: This software is provided "as is" without warranties

---

## 🌟 Show Your Support

If you find this project useful:

- ⭐ Star this repository
- 🐦 Share on social media
- ⚡ Send sats to support development (address coming soon)
- 🤝 Contribute code or documentation

---

**Made with ⚡ and 🧡 for the Bitcoin community**

[Website](https://satoshi-pay-wallet.vercel.app) • [GitHub](https://github.com/Codepocketdev/satoshi-pay-wallet) • [Issues](https://github.com/Codepocketdev/satoshi-pay-wallet/issues)

