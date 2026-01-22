export default function TermsPage({ onBack }) {
  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1></h1>
      </header>
      
      <h1 style={{ 
        color: '#FF8C00', 
        textAlign: 'center',
        marginTop: '0.5em',
        marginBottom: '0.5em'
      }}>
        Terms of Service
      </h1>

      <div style={{ padding: '0 1em', maxWidth: '800px', margin: '0 auto' }}>
        <p style={{ opacity: 0.6, fontSize: '0.9em', marginBottom: '2em' }}>
          Last Updated: January 22, 2026
        </p>

        <div style={{ 
          background: 'rgba(255, 140, 0, 0.1)', 
          border: '2px solid #FF8C00',
          borderRadius: '8px',
          padding: '1em', 
          marginBottom: '2em'
        }}>
          <strong style={{ color: '#FF8C00' }}>IMPORTANT:</strong> Satoshi Pay is an experimental, non-custodial Cashu wallet. By using this service, you acknowledge that you understand and accept all risks associated with Cashu ecash. If you do not agree with these terms, do not use Satoshi Pay.
        </div>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          1. About Satoshi Pay
        </h2>
        
        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>1.1 What We Are</h3>
        <p>Satoshi Pay (satoshipay.me) is a <strong style={{ color: '#FFA500' }}>non-custodial web wallet</strong> for Cashu ecash. We provide software that runs in your browser to help you manage Cashu tokens.</p>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>1.2 What We Are NOT</h3>
        <p>We are NOT:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>A bank, financial institution, or money transmitter</li>
          <li>A custodian of your funds</li>
          <li>Responsible for any Cashu mints you use</li>
          <li>Able to recover lost tokens or restore access to your wallet</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>1.3 How It Works</h3>
        <p>Satoshi Pay executes entirely in your browser. We do not:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Store your ecash tokens</li>
          <li>Have access to your wallet</li>
          <li>Control or operate any Cashu mints</li>
          <li>Execute transactions on your behalf</li>
        </ul>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          2. Your Responsibilities
        </h2>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>2.1 You Are in Control</h3>
        <p>You alone are responsible for:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Securing your seed phrase and backup</li>
          <li>Choosing which Cashu mints to trust</li>
          <li>Verifying transactions before confirming them</li>
          <li>Understanding how Cashu ecash works</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>2.2 Seed Phrase Security</h3>
        <p><strong style={{ color: '#FFA500' }}>CRITICAL:</strong> Your seed phrase is the ONLY way to restore your wallet. If you lose it, your funds are lost forever. We cannot recover it for you.</p>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>2.3 Mint Selection</h3>
        <p>When you add a Cashu mint to your wallet, you are trusting that mint operator. Satoshi Pay does not verify, endorse, or guarantee any mint. Mints can:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Disappear at any time</li>
          <li>Refuse to honor tokens</li>
          <li>Experience technical issues</li>
          <li>Be operated maliciously</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>2.4 Legal Compliance</h3>
        <p>You are responsible for determining whether using Cashu ecash is legal in your jurisdiction and for complying with all applicable laws and regulations.</p>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          3. Risks & Disclaimers
        </h2>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>3.1 Experimental Technology</h3>
        <p>Cashu is <strong style={{ color: '#FFA500' }}>experimental technology</strong>. It may contain bugs, vulnerabilities, or design flaws. Use at your own risk.</p>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>3.2 Bearer Asset</h3>
        <p>Cashu tokens are <strong style={{ color: '#FFA500' }}>bearer assets</strong> - anyone with the token data can spend it. This means:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Transactions are irreversible</li>
          <li>Lost tokens cannot be recovered</li>
          <li>Stolen tokens cannot be frozen or returned</li>
          <li>There is no customer support to reverse mistakes</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>3.3 Mint Risks</h3>
        <p>Mints can fail, disappear, or refuse to honor tokens. You could lose all funds stored with a particular mint.</p>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>3.4 No Guarantees</h3>
        <p>We make no guarantees about:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Uptime or availability</li>
          <li>Compatibility with specific devices</li>
          <li>Future updates or support</li>
          <li>Value preservation of ecash</li>
        </ul>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          4. Limitation of Liability
        </h2>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>4.1 "AS IS" Service</h3>
        <p>Satoshi Pay is provided <strong style={{ color: '#FFA500' }}>"AS IS"</strong> without warranties of any kind. We disclaim all warranties, express or implied.</p>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>4.2 No Liability</h3>
        <p>To the maximum extent permitted by law, Satoshi Pay and its operators are NOT liable for:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Loss of funds due to mint failures</li>
          <li>Lost or stolen seed phrases</li>
          <li>User errors or mistakes</li>
          <li>Technical bugs or vulnerabilities</li>
          <li>Regulatory actions or legal consequences</li>
          <li>Any indirect, incidental, or consequential damages</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>4.3 Third-Party Services</h3>
        <p>Satoshi Pay integrates with third-party services (npub.cash, Nostr relays). We are not responsible for:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Availability or reliability of these services</li>
          <li>Privacy practices of third parties</li>
          <li>Terms of service of third parties</li>
          <li>Actions or failures of third parties</li>
        </ul>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          5. Privacy
        </h2>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>5.1 Local Storage Only</h3>
        <p>Your wallet data is stored <strong style={{ color: '#FFA500' }}>locally in your browser</strong>. We do not:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Collect or store personal information</li>
          <li>Track your transactions</li>
          <li>Share data with third parties</li>
          <li>Require account registration</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>5.2 Third-Party Services</h3>
        <p>When you use Satoshi Pay, you may interact with third-party services such as:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li><strong>npub.cash</strong> - Lightning Address service (if you use it)</li>
          <li><strong>Nostr relays</strong> - For Nostr features (if you use them)</li>
          <li><strong>Cashu mints</strong> - For ecash operations</li>
        </ul>
        <p>Each service has its own privacy policy. We recommend reviewing them.</p>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>5.3 Browser Data</h3>
        <p>Clearing your browser data will delete your wallet. Always back up your seed phrase before clearing browser data.</p>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          6. Acceptable Use
        </h2>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>6.1 Prohibited Activities</h3>
        <p>You may not use Satoshi Pay for:</p>
        <ul style={{ paddingLeft: '1.5em' }}>
          <li>Illegal activities</li>
          <li>Money laundering or terrorism financing</li>
          <li>Fraud or scams</li>
          <li>Violating others' rights</li>
          <li>Evading sanctions or export controls</li>
        </ul>

        <h3 style={{ color: '#FFB84D', marginTop: '1.2em' }}>6.2 User Responsibility</h3>
        <p>You are responsible for ensuring your use of Satoshi Pay complies with all applicable laws in your jurisdiction.</p>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          7. Changes to Terms
        </h2>
        <p>We may update these Terms at any time. Continued use of Satoshi Pay after changes constitutes acceptance of the updated Terms. Check this page periodically for updates.</p>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          8. No Warranty
        </h2>
        <p>SATOSHI PAY IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          9. Governing Law
        </h2>
        <p>These Terms are governed by the laws of Kenya. However, you are responsible for compliance with laws in your own jurisdiction.</p>

        <h2 style={{ color: '#FFA500', marginTop: '1.5em', borderBottom: '2px solid #FF8C00', paddingBottom: '0.3em' }}>
          10. Contact
        </h2>
        <p>For questions about these Terms, visit: <a href="https://satoshipay.me" style={{ color: '#FF8C00' }}>satoshipay.me</a></p>

        <div style={{ 
          background: 'rgba(255, 140, 0, 0.1)', 
          border: '2px solid #FF8C00',
          borderRadius: '8px',
          padding: '1em', 
          margin: '2em 0'
        }}>
          <strong style={{ color: '#FFA500' }}>BY USING SATOSHI PAY, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.</strong>
        </div>
      </div>
    </div>
  )
}
