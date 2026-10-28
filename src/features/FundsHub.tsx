import { useState, useEffect, useRef } from 'react'
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Copy, CheckCircle2, AlertCircle, Smartphone,
  DollarSign, RefreshCw, ChevronDown, EyeOff, Eye,
  Zap, Sparkles, Wallet, Upload, X,
} from 'lucide-react'

export type WalletBalances = {
  main: number
  synthetic: number
  liveMarket: number
}

type DepositAddress = {
  id: string
  network: string
  assetName: string
  address: string
  note: string
  enabled: boolean
}

type Props = {
  wallets: WalletBalances
  onTransfer: (from: keyof WalletBalances, to: keyof WalletBalances, amount: number) => void
  onDepositRequest: (amount: number, network: string, reference?: string) => void
  onWithdrawalRequest: (amount: number, network: string, destination: string) => void
  adminAddresses: DepositAddress[]
  showNotice: (msg: string) => void
  minDepositUSD?: number
  minDepositKES?: number
  minWithdrawalUSD?: number
}

const WALLET_META: Record<keyof WalletBalances, { label: string; sub: string; color: string }> = {
  main:       { label: 'Main',        sub: 'Primary',   color: '#20eb5a' },
  synthetic:  { label: 'Synthetic',   sub: 'Synthetic', color: '#00e676' },
  liveMarket: { label: 'Live Market', sub: 'Live trade', color: '#f2b94b' },
}

// Crypto coin icons (inline SVG colours)
const COIN_ICONS: Record<string, { color: string; symbol: string }> = {
  BTC:         { color: '#f7931a', symbol: '₿' },
  ETH:         { color: '#627eea', symbol: 'Ξ' },
  SOL:         { color: '#9945ff', symbol: '◎' },
  DOGE:        { color: '#c2a633', symbol: 'Ð' },
  DOT:         { color: '#e6007a', symbol: '●' },
  'USDT-TRC20':{ color: '#26a17b', symbol: '₮' },
  'USDT-ERC20':{ color: '#26a17b', symbol: '₮' },
  BNB:         { color: '#20eb5a', symbol: 'B' },
  LTC:         { color: '#bfbbbb', symbol: 'Ł' },
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ACTIVITY = [
  'GLOBAL SYNC: Volatility 25 (1s) index → Probability Check [Analyzing…]',
  'Security Audit: Passkey fully enrolled. ✅',
  '**On-boarding Update**: Questionnaire response registered. id_card_front queued for review. ⏳',
]

type StkStep = 'form' | 'pushing' | 'waiting' | 'verify' | 'done' | 'error'

export default function FundsHub({
  wallets, onTransfer, onDepositRequest, onWithdrawalRequest, adminAddresses, showNotice,
  minDepositUSD = 10, minDepositKES = 100, minWithdrawalUSD = 10,
}: Props) {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit')
  const [selectedWallet, setSelectedWallet] = useState<keyof WalletBalances>('main')
  const [depositMethod, setDepositMethod] = useState<'mpesa' | string>('mpesa')
  const [methodOpen, setMethodOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)

  // Withdraw
  const [wAmt, setWAmt] = useState('')
  const [wAddr, setWAddr] = useState('')
  const [wGateway, setWGateway] = useState('USDT-TRC20')
  const [withdrawSuccessModal, setWithdrawSuccessModal] = useState<{ amount: number } | null>(null)

  // Bank Wire Form State
  const [bCountry, setBCountry] = useState('Kenya')
  const [bBankName, setBBankName] = useState('KCB Bank Kenya')
  const [bAccountName, setBAccountName] = useState('')
  const [bAccountNumber, setBAccountNumber] = useState('')
  const [bSwiftCode, setBSwiftCode] = useState('')

  const COUNTRY_BANKS_MAP: Record<string, string[]> = {
    'Kenya': [
      'KCB Bank Kenya',
      'Equity Bank Kenya',
      'Co-operative Bank of Kenya',
      'NCBA Bank Kenya',
      'Absa Bank Kenya',
      'Stanbic Bank Kenya',
      'Standard Chartered Bank Kenya',
      'I&M Bank Kenya',
      'Family Bank Kenya',
      'Diamond Trust Bank (DTB) Kenya',
      'Prime Bank Kenya',
      'Credit Bank Kenya',
      'Kingdom Bank Kenya',
      'Gulf African Bank',
      'SBM Bank Kenya',
      'Sidian Bank',
      'Faulu Microfinance Bank',
      'Caritas Microfinance Bank',
      'National Bank of Kenya (NBK)',
      'Postbank Kenya',
      'M-Pesa Paybill / Till Bank Bridge',
      'Other Kenyan Commercial Bank',
    ],
    'Tanzania': [
      'CRDB Bank Tanzania',
      'NMB Bank Tanzania',
      'National Bank of Commerce (NBC)',
      'Stanbic Bank Tanzania',
      'Exim Bank Tanzania',
      'Diamond Trust Bank Tanzania',
      'KCB Bank Tanzania',
      'Absa Bank Tanzania',
      'Azania Bank',
      'TCB (Tanzania Commercial Bank)',
      'Other Tanzanian Bank',
    ],
    'Uganda': [
      'Stanbic Bank Uganda',
      'Centenary Bank Uganda',
      'Absa Bank Uganda',
      'dfcu Bank Uganda',
      'Equity Bank Uganda',
      'KCB Bank Uganda',
      'Standard Chartered Uganda',
      'Bank of Baroda Uganda',
      'Diamond Trust Bank Uganda',
      'NCBA Uganda',
      'Other Ugandan Bank',
    ],
    'Rwanda': [
      'Bank of Kigali (BK)',
      'I&M Bank Rwanda',
      'Equity Bank Rwanda',
      'Cogebanque Rwanda',
      'Access Bank Rwanda',
      'Ecobank Rwanda',
      'KCB Bank Rwanda',
      'Urwego Bank',
      'Other Rwandan Bank',
    ],
    'Nigeria': [
      'Access Bank Nigeria',
      'Zenith Bank Nigeria',
      'Guaranty Trust Bank (GTBank)',
      'First Bank of Nigeria',
      'United Bank for Africa (UBA)',
      'Fidelity Bank Nigeria',
      'Stanbic IBTC Bank',
      'Ecobank Nigeria',
      'Kuda Microfinance Bank',
      'OPay Digital Services',
      'Palmpay Nigeria',
      'Moniepoint Microfinance Bank',
      'Sterling Bank',
      'Union Bank of Nigeria',
      'Wema Bank (ALAT)',
      'Other Nigerian Commercial Bank',
    ],
    'Ghana': [
      'GCB Bank Ghana',
      'Ecobank Ghana',
      'Absa Bank Ghana',
      'Fidelity Bank Ghana',
      'Stanbic Bank Ghana',
      'CalBank Ghana',
      'Guaranty Trust Bank Ghana',
      'Zenith Bank Ghana',
      'Standard Chartered Ghana',
      'Other Ghanaian Bank',
    ],
    'South Africa': [
      'Standard Bank South Africa',
      'FirstNational Bank (FNB)',
      'Absa Bank South Africa',
      'Nedbank',
      'Capitec Bank',
      'Discovery Bank',
      'TymeBank',
      'Investec',
      'Other South African Bank',
    ],
    'United Kingdom': [
      'Barclays UK',
      'HSBC UK',
      'Lloyds Bank',
      'NatWest / Royal Bank of Scotland',
      'Santander UK',
      'Monzo Bank',
      'Revolut UK',
      'Starling Bank',
      'Halifax',
      'Nationwide Building Society',
      'Metro Bank',
      'Other UK Bank',
    ],
    'Germany': [
      'Deutsche Bank',
      'Commerzbank',
      'DZ Bank',
      'KfW Group',
      'N26 Bank',
      'Sparkasse Financial Network',
      'Volksbanken Raiffeisenbanken',
      'HypoVereinsbank (UniCredit)',
      'ING-DiBa Germany',
      'Targobank',
      'Other German Bank',
    ],
    'United States': [
      'JPMorgan Chase Bank',
      'Bank of America',
      'Wells Fargo',
      'Citigroup / Citibank',
      'U.S. Bank',
      'PNC Bank',
      'Truist Bank',
      'Capital One Bank',
      'TD Bank US',
      'Goldman Sachs (Marcus)',
      'Charles Schwab Bank',
      'Other US Financial Institution',
    ],
    'Canada': [
      'Royal Bank of Canada (RBC)',
      'TD Canada Trust',
      'Scotiabank',
      'Bank of Montreal (BMO)',
      'CIBC (Canadian Imperial Bank of Commerce)',
      'National Bank of Canada',
      'Desjardins Group',
      'Tangerine Bank',
      'Other Canadian Bank',
    ],
    'United Arab Emirates': [
      'First Abu Dhabi Bank (FAB)',
      'Emirates NBD',
      'Abu Dhabi Commercial Bank (ADCB)',
      'Dubai Islamic Bank (DIB)',
      'Mashreq Bank',
      'RAKBANK',
      'Abu Dhabi Islamic Bank (ADIB)',
      'Commercial Bank of Dubai (CBD)',
      'Other UAE Financial Institution',
    ],
    'India': [
      'State Bank of India (SBI)',
      'HDFC Bank',
      'ICICI Bank',
      'Axis Bank',
      'Kotak Mahindra Bank',
      'Punjab National Bank (PNB)',
      'Bank of Baroda',
      'IndusInd Bank',
      'Other Indian Bank',
    ],
    'France': [
      'BNP Paribas',
      'Crédit Agricole',
      'Société Générale',
      'BPCE / Natixis',
      'Crédit Mutuel',
      'La Banque Postale',
      'BoursoBank (Boursorama)',
      'Other French Bank',
    ],
    'Other Global Region': [
      'International Commercial Bank (SWIFT Transfer)',
      'Digital Offshore Bank',
      'Global Currency Account / Wise / Payoneer',
      'Other Accredited Financial Institution',
    ]
  }

  // Transfer
  const [tFrom, setTFrom] = useState<keyof WalletBalances>('main')
  const [tTo, setTTo] = useState<keyof WalletBalances>('synthetic')
  const [tAmt, setTAmt] = useState('')

  // M-Pesa
  const [mpPhone, setMpPhone] = useState('')
  const [mpKes, setMpKes] = useState('')
  const [mpCode, setMpCode] = useState('')
  const [stkStep, setStkStep] = useState<StkStep>('form')
  const [stkError, setStkError] = useState('')
  const [_stkCheckoutId, setStkCheckoutId] = useState('')
  const [stkVerifying, setStkVerifying] = useState(false)

  // Crypto Proof / TxHash / Success Modal State
  const [cryptoTxHash, setCryptoTxHash] = useState('')
  const [cryptoScreenshotName, setCryptoScreenshotName] = useState<string | null>(null)
  const [depositSuccessModal, setDepositSuccessModal] = useState<{ amountUSD: number; method: string; ref: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCryptoScreenshotName(file.name)
    }
  }

  // Activity log
  const [logLines, setLogLines] = useState<string[]>([])
  const logRef = useRef(0)
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Nairobi' })
      setLogLines(prev => [`[${now} EAT] ${ACTIVITY[logRef.current % ACTIVITY.length]}`, ...prev].slice(0, 6))
      logRef.current++
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const total = wallets.main + wallets.synthetic + wallets.liveMarket

  const cryptoNetworks = adminAddresses.filter(a => a.enabled)
  type MethodItem = { id: string; label: string; icon: string; color?: string; isSeparator?: boolean }
  const allMethods: MethodItem[] = [
    { id: 'mpesa', label: 'M-PESA DEPOSIT', icon: '📱' },
    { id: 'CRYPTO', label: 'CRYPTO', icon: '₿', isSeparator: true },
    ...cryptoNetworks.map(a => ({
      id: a.network,
      label: a.network,
      icon: COIN_ICONS[a.network]?.symbol ?? '◈',
      color: COIN_ICONS[a.network]?.color,
    })),
  ]

  const selectedMethodMeta = allMethods.find(m => m.id === depositMethod) ?? allMethods[0]
  const activeAddr = adminAddresses.find(a => a.network === depositMethod && a.enabled)

  const copyAddr = () => {
    if (!activeAddr) return
    navigator.clipboard.writeText(activeAddr.address).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleProceedDeposit = async () => {
    if (depositMethod === 'mpesa') {
      if (!mpPhone.match(/^07\d{8}$|^\+2547\d{8}$/)) { showNotice('Enter a valid M-Pesa number (07XXXXXXXX).'); return }
      const kes = parseFloat(mpKes)
      if (!kes || kes < minDepositKES) { showNotice(`Minimum M-Pesa deposit is KES ${minDepositKES.toLocaleString()}.`); return }
      if (!mpCode.trim()) { showNotice('Please enter your M-Pesa confirmation transaction code.'); return }

      const usdEquiv = kes / 130
      const refCode = `M-Pesa Code: ${mpCode.trim().toUpperCase()} | Phone: ${mpPhone.trim()}`
      onDepositRequest(usdEquiv, 'MPESA', refCode)

      setDepositSuccessModal({
        amountUSD: usdEquiv,
        method: 'M-Pesa',
        ref: mpCode.trim().toUpperCase(),
      })

      setMpPhone('')
      setMpKes('')
      setMpCode('')
    } else {
      // Crypto Deposit
      const amt = parseFloat(amount)
      if (!amt || amt < minDepositUSD) { showNotice(`Minimum deposit is $${minDepositUSD}.`); return }

      let refCode = cryptoTxHash.trim() ? `TxHash: ${cryptoTxHash.trim()}` : `Crypto Deposit (${depositMethod})`
      if (cryptoScreenshotName) {
        refCode += ` | Proof: ${cryptoScreenshotName}`
      }

      onDepositRequest(amt, depositMethod, refCode)

      setDepositSuccessModal({
        amountUSD: amt,
        method: depositMethod,
        ref: cryptoTxHash.trim() || cryptoScreenshotName || 'Crypto Transfer',
      })

      setAmount('')
      setCryptoTxHash('')
      setCryptoScreenshotName(null)
    }
  }

  const submitMpesaCode = () => {
    if (!mpCode.trim()) { showNotice('Enter the M-Pesa transaction code.'); return }
    setStkVerifying(true)
    onDepositRequest(parseFloat(mpKes || amount) / 130, 'MPESA', mpCode.trim())
    setTimeout(() => { setStkStep('done'); setStkVerifying(false) }, 800)
  }

  const resetMpesa = () => { setStkStep('form'); setStkError(''); setMpPhone(''); setMpKes(''); setMpCode(''); setStkCheckoutId('') }

  const confirmWithdraw = () => {
    const amt = parseFloat(wAmt)
    if (!amt || amt < minWithdrawalUSD) { showNotice(`Minimum withdrawal is $${minWithdrawalUSD}.`); return }
    if (wallets.main < amt) { showNotice('Insufficient main balance.'); return }

    let destinationSummary = wAddr.trim()
    if (wGateway === 'BANK_WIRE') {
      if (!bAccountName.trim() || !bAccountNumber.trim()) {
        showNotice('Please enter Account Holder Name and Bank Account Number.')
        return
      }
      destinationSummary = `Country: ${bCountry} | Bank: ${bBankName} | Acc Name: ${bAccountName.trim()} | Acc No: ${bAccountNumber.trim()}`
      if (bSwiftCode.trim()) destinationSummary += ` | SWIFT: ${bSwiftCode.trim()}`
    } else {
      if (!destinationSummary) {
        showNotice(wGateway === 'mpesa' ? 'Enter M-Pesa phone number.' : 'Enter destination wallet address.')
        return
      }
    }

    onWithdrawalRequest(amt, wGateway, destinationSummary)
    setWithdrawSuccessModal({ amount: amt })
    setWAmt('')
    setWAddr('')
    setBAccountName('')
    setBAccountNumber('')
    setBSwiftCode('')
  }

  const confirmTransfer = () => {
    const amt = parseFloat(tAmt)
    if (!amt || amt <= 0) { showNotice('Enter a valid amount.'); return }
    if (tFrom === tTo) { showNotice('Select two different wallets.'); return }
    if (wallets[tFrom] < amt) { showNotice('Insufficient balance.'); return }
    onTransfer(tFrom, tTo, amt)
    showNotice(`✅ Transferred $${fmt(amt)} → ${WALLET_META[tTo].label}`)
    setTAmt('')
  }

  return (
    <div className="th-shell">
      {/* ── TITLE ───────────────────────────────────────────────────────── */}
      <div className="th-hero">
        <div className="th-hero-title">YOUR TREASURY HUB</div>
        <div className="th-hero-sub">Manage Funds</div>
      </div>

      {/* ── TOTAL BALANCE ────────────────────────────────────────────────── */}
      <div className="th-balance-bar">
        <div className="th-balance-left">
          <div className="th-balance-label" style={{ color: '#00e676' }}>Total Balance</div>
          <div className="th-balance-value">
            {hideBalance ? '••••••' : `$${fmt(total)} USD`}
            <button className="th-eye-btn" onClick={() => setHideBalance(p => !p)}>
              {hideBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
        <div className="th-balance-icons">
          <div className="th-bal-icon"><DollarSign size={18} /></div>
          <div className="th-bal-icon" style={{ opacity: 0.5 }}><DollarSign size={18} /></div>
        </div>
      </div>

      {/* ── TAB ROW ──────────────────────────────────────────────────────── */}
      <div className="th-tabs">
        <button className={`th-tab ${tab === 'deposit'  ? 'th-tab-active' : ''}`} onClick={() => setTab('deposit')}>
          <ArrowDownToLine size={14} /> Deposit
        </button>
        <button className={`th-tab ${tab === 'withdraw' ? 'th-tab-active' : ''}`} onClick={() => setTab('withdraw')}>
          <ArrowUpFromLine size={14} /> Withdraw
        </button>
        <button className={`th-tab ${tab === 'transfer' ? 'th-tab-active' : ''}`} onClick={() => setTab('transfer')}>
          <ArrowLeftRight size={14} /> Internal Transfer
        </button>
      </div>

      {/* ════════════════ DEPOSIT ═══════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div className="th-deposit-grid">
          {/* 50% DEPOSIT BONUS FOR NEW TRADERS BANNER */}
          <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15), rgba(32,235,90, 0.1))', border: '1px solid rgba(0, 230, 118, 0.35)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Sparkles size={22} color="#00e676" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ color: '#00e676', fontWeight: 800, fontSize: '13px', letterSpacing: '0.4px' }}>🎁 50% DEPOSIT BONUS FOR NEW TRADERS</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>Special Welcome Bonus: Every new trader receives a 50% bonus on their first deposit!</div>
            </div>
          </div>

          {/* ── LEFT: CHOOSE WALLET ──────────────────────────────────────── */}
          <div className="th-panel">
            <div className="th-panel-title">CHOOSE WALLET</div>
            <div className="th-wallet-list">
              {(['main', 'synthetic'] as (keyof WalletBalances)[]).map(k => {
                const m = WALLET_META[k]
                return (
                  <button
                    key={k}
                    type="button"
                    className={`th-wallet-item ${selectedWallet === k ? 'th-wallet-selected' : ''}`}
                    onClick={() => setSelectedWallet(k)}
                    style={{ '--wc': m.color } as React.CSSProperties}
                  >
                    <div className="th-wallet-radio">
                      <div className="th-wallet-radio-inner" />
                    </div>
                    {selectedWallet === k && (
                      <div className="th-wallet-check"><CheckCircle2 size={14} color={m.color} /></div>
                    )}
                    <div className="th-wallet-info">
                      <div className="th-wallet-name">{m.label}</div>
                      <div className="th-wallet-sub">{m.sub}</div>
                    </div>
                    <ChevronDown size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── CENTER: SELECT METHOD ────────────────────────────────────── */}
          <div className="th-panel">
            <div className="th-panel-title">SELECT DEPOSIT METHOD</div>

            {/* Dropdown */}
            <div className="th-method-dropdown" onClick={() => setMethodOpen(p => !p)}>
              <span className="th-method-icon">{selectedMethodMeta.icon}</span>
              <span className="th-method-label">{selectedMethodMeta.label}</span>
              <ChevronDown size={14} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: methodOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>

            {methodOpen && (
              <div className="th-method-list">
                {allMethods.map((m, i) => {
                  if (m.isSeparator) return (
                    <div key={i} className="th-method-sep">
                      <CheckCircle2 size={11} /> {m.label}
                    </div>
                  )
                  return (
                    <button key={m.id} className={`th-method-opt ${depositMethod === m.id ? 'th-method-opt-active' : ''}`}
                      onClick={() => { setDepositMethod(m.id); setMethodOpen(false); setStkStep('form') }}>
                      <span className="th-coin-icon" style={{ background: m.color ? m.color + '22' : 'rgba(255,255,255,0.06)', color: m.color ?? '#fff' }}>
                        {m.icon}
                      </span>
                      {m.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* M-Pesa inputs */}
            {depositMethod === 'mpesa' && stkStep === 'form' && (
              <div className="th-mpesa-fields">
                <label className="th-field-label">
                  M-Pesa Phone Number
                  <div className="th-input-wrap">
                    <span className="th-input-pre">🇰🇪</span>
                    <input className="th-input" type="tel" placeholder="07XXXXXXXX"
                      value={mpPhone} onChange={e => setMpPhone(e.target.value)} />
                  </div>
                </label>
                <label className="th-field-label">
                  Amount (KES)
                  <div className="th-input-wrap">
                    <span className="th-input-pre">KES</span>
                    <input className="th-input" type="number" min={minDepositKES} placeholder={minDepositKES.toString()}
                      value={mpKes} onChange={e => setMpKes(e.target.value)} />
                  </div>
                  <span className="th-hint">
                    Min KES {minDepositKES.toLocaleString()} · ~${(parseFloat(mpKes) > 0 ? (parseFloat(mpKes) / 130) : minDepositUSD).toFixed(2)} USD
                  </span>
                </label>
                <label className="th-field-label" style={{ marginTop: '10px' }}>
                  M-Pesa Transaction Code (from SMS)
                  <div className="th-input-wrap">
                    <span className="th-input-pre">📲</span>
                    <input className="th-input th-mono" placeholder="e.g. QJK7WXYZ12"
                      value={mpCode} onChange={e => setMpCode(e.target.value.toUpperCase())} />
                  </div>
                  <span className="th-hint">Enter the transaction code from your M-Pesa confirmation SMS</span>
                </label>
              </div>
            )}

            {/* STK Push states */}
            {depositMethod === 'mpesa' && stkStep === 'pushing' && (
              <div className="th-stk-status">
                <div className="th-spinner" />
                <strong>Sending STK Push…</strong>
              </div>
            )}

            {depositMethod === 'mpesa' && stkStep === 'waiting' && (
              <div className="th-stk-waiting">
                <Smartphone size={32} color="#00e676" />
                <strong>Check your phone!</strong>
                <p>Prompt sent to <b style={{color:'#20eb5a'}}>{mpPhone}</b> for KES {parseFloat(mpKes).toLocaleString()}</p>
                <label className="th-field-label" style={{width:'100%'}}>
                  M-Pesa Code (from SMS)
                  <input className="th-input th-mono" placeholder="e.g. QJK7WXYZ12"
                    value={mpCode} onChange={e => setMpCode(e.target.value.toUpperCase())} autoFocus />
                </label>
                <button className="th-proceed-btn" onClick={submitMpesaCode} disabled={stkVerifying}>
                  {stkVerifying ? 'Verifying…' : <><DollarSign size={15}/> Confirm Deposit</>}
                </button>
                <button className="th-back-btn" onClick={resetMpesa}>← Try again</button>
              </div>
            )}

            {depositMethod === 'mpesa' && stkStep === 'done' && (
              <div className="th-stk-done">
                <div style={{fontSize:40}}>✅</div>
                <strong>Deposit Submitted!</strong>
                <p>KES {parseFloat(mpKes).toLocaleString()} submitted for admin verification.</p>
                {mpCode && <code className="th-ref-code">{mpCode}</code>}
                <button className="th-proceed-btn" onClick={resetMpesa}>Make Another</button>
              </div>
            )}

            {depositMethod === 'mpesa' && stkStep === 'error' && (
              <div className="th-stk-err">
                <div style={{fontSize:36}}>❌</div>
                <strong>STK Push Failed</strong>
                <p>{stkError}</p>
                <button className="th-proceed-btn" onClick={resetMpesa}>Try Again</button>
              </div>
            )}

            {/* Crypto receiving address card */}
            {depositMethod !== 'mpesa' && stkStep === 'form' && (
              <div className="th-crypto-fields">
                {activeAddr ? (
                  <div style={{ background: 'rgba(32,235,90, 0.05)', border: '1px solid rgba(32,235,90, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--mint-teal)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        🎯 OFFICIAL DEPOSIT ADDRESS ({activeAddr.network})
                      </span>
                      <button
                        type="button"
                        className="th-copy-btn"
                        onClick={copyAddr}
                        style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {copied ? <><CheckCircle2 size={12}/> Copied!</> : <><Copy size={12}/> Copy Address</>}
                      </button>
                    </div>
                    <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12.5px', color: '#ffffff', fontWeight: 700, letterSpacing: '0.3px', userSelect: 'all' }}>
                      {activeAddr.address}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      💡 {activeAddr.note || `Send only ${activeAddr.assetName} (${activeAddr.network}) to this deposit receiving address.`}
                    </div>
                  </div>
                ) : (
                  <div className="th-addr-bar">
                    <span className="th-addr-text">No active receiving address for {depositMethod}</span>
                  </div>
                )}
                <label className="th-field-label">
                  Amount (USD)
                  <div className="th-input-wrap">
                    <span className="th-input-pre">$</span>
                    <input className="th-input" type="number" min={minDepositUSD} placeholder={minDepositUSD.toFixed(2)}
                      value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <span className="th-hint">
                    Min ${minDepositUSD} USD · ~KES {(parseFloat(amount) > 0 ? (parseFloat(amount) * 130) : (minDepositUSD * 130)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </label>

                <label className="th-field-label" style={{ marginTop: '10px' }}>
                  Transaction Hash / Reference Code
                  <div className="th-input-wrap">
                    <span className="th-input-pre">🔗</span>
                    <input className="th-input th-mono" placeholder="Paste TxHash or transfer reference"
                      value={cryptoTxHash} onChange={e => setCryptoTxHash(e.target.value)} />
                  </div>
                </label>

                <label className="th-field-label" style={{ marginTop: '10px' }}>
                  Upload Payment Screenshot / Proof
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(15,23,42,0.6)',
                      border: '1px dashed rgba(0,230,118,0.4)',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      marginTop: '6px',
                    }}
                  >
                    <Upload size={18} color="#00e676" />
                    <span style={{ fontSize: '12px', color: cryptoScreenshotName ? '#00e676' : 'var(--text-muted)', fontWeight: 700 }}>
                      {cryptoScreenshotName ? `📷 ${cryptoScreenshotName}` : 'Click to upload payment screenshot'}
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Real Account Deposit Capital Calculation Card */}
            {((depositMethod === 'mpesa' && parseFloat(mpKes) > 0) || (depositMethod !== 'mpesa' && parseFloat(amount) > 0)) && (
              <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.28)', borderRadius: '10px', padding: '12px 14px', marginTop: '14px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontWeight: 800 }}>
                  <span>Deposit Capital Credited:</span>
                  <strong style={{ color: '#00e676', fontSize: '13px' }}>${(depositMethod === 'mpesa' ? (parseFloat(mpKes) || 0) / 130 : (parseFloat(amount) || 0)).toFixed(2)} USD</strong>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: INSTRUCTIONS ──────────────────────────────────────── */}
          <div className="th-panel">
            {depositMethod === 'mpesa' ? (
              <>
                <div className="th-panel-title">📱 M-PESA DEPOSIT</div>
                <ol className="th-instructions">
                  <li>ENTER PHONE NUMBER (Left)</li>
                  <li>ENTER KES AMOUNT</li>
                  <li>CLICK PROCEED BELOW</li>
                  <li>ENTER PIN ON YOUR PHONE</li>
                  <li>PASTE SMS CODE TO CONFIRM</li>
                </ol>
              </>
            ) : (
              <>
                <div className="th-panel-title" style={{color: COIN_ICONS[depositMethod]?.color ?? '#20eb5a'}}>
                  {COIN_ICONS[depositMethod]?.symbol ?? '◈'} {depositMethod} DEPOSIT
                  <button className="th-help-btn" title="How to deposit">?</button>
                </div>
                <ol className="th-instructions">
                  <li>SELECT WALLET (Left)</li>
                  <li>SELECT CRYPTO ASSET</li>
                  <li>COPY ADDRESS</li>
                  <li>ENTER AMOUNT BELOW</li>
                </ol>
                <div className="th-panel-title" style={{marginTop:16}}>ENTER AMOUNT BELOW</div>
                {activeAddr && (
                  <div className="th-addr-note">
                    <AlertCircle size={11}/> {activeAddr.note}
                  </div>
                )}
              </>
            )}

            {/* Review line */}
            <div className="th-review-line">
              Review selections: Deposit:{' '}
              <span>{amount ? `$${amount}` : '[amount]'}</span> to{' '}
              <span>{WALLET_META[selectedWallet].label}</span> via{' '}
              <span>{depositMethod === 'mpesa' ? 'M-Pesa' : depositMethod}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PROCEED BUTTON (Deposit) ─────────────────────────────────────── */}
      {tab === 'deposit' && stkStep === 'form' && (
        <button className="th-proceed-btn th-proceed-full" onClick={handleProceedDeposit}>
          <Zap size={16} /> PROCEED TO DEPOSIT
        </button>
      )}

      {/* ════════════════ WITHDRAW ══════════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div className="th-simple-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Available Balance Line */}
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Available Balance: <strong style={{ color: '#00e5ff', fontSize: '16px', fontWeight: 900 }}>${fmt(wallets.main)}</strong>
          </div>

          {/* Network Chips Row */}
          <div className="th-net-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['mpesa', 'USDT-TRC20', 'BTC', 'ETH', 'BANK_WIRE'].map(g => (
              <button
                key={g}
                type="button"
                className={`th-net-chip ${wGateway === g ? 'th-net-chip-on' : ''}`}
                style={{
                  background: wGateway === g ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: wGateway === g ? '1.5px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: wGateway === g ? '#00e5ff' : '#a0aec0',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => setWGateway(g)}
              >
                {g === 'mpesa' ? '📱 M-Pesa' : g === 'BANK_WIRE' ? '🏛️ Bank Wire' : g}
              </button>
            ))}
          </div>

          {/* Form Box */}
          {wGateway === 'BANK_WIRE' ? (
            <div style={{
              background: '#09101d',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {/* Select Country */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  SELECT COUNTRY
                </label>
                <select
                  className="th-input"
                  value={bCountry}
                  onChange={(e) => {
                    const country = e.target.value
                    setBCountry(country)
                    const banks = COUNTRY_BANKS_MAP[country] || COUNTRY_BANKS_MAP['Kenya']
                    setBBankName(banks[0])
                  }}
                  style={{ width: '100%', background: '#101929', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '10px', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}
                >
                  {Object.keys(COUNTRY_BANKS_MAP).map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {/* Select Bank Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  SELECT BANK NAME
                </label>
                <select
                  className="th-input"
                  value={bBankName}
                  onChange={(e) => setBBankName(e.target.value)}
                  style={{ width: '100%', background: '#101929', border: '1px solid #00e5ff', borderRadius: '10px', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}
                >
                  {(COUNTRY_BANKS_MAP[bCountry] || COUNTRY_BANKS_MAP['Kenya']).map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Account Number / IBAN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  ACCOUNT NUMBER / IBAN
                </label>
                <input
                  className="th-input th-mono"
                  placeholder="Enter bank account number or IBAN"
                  value={bAccountNumber}
                  onChange={(e) => setBAccountNumber(e.target.value)}
                  style={{ background: '#101929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ffffff', padding: '10px 14px' }}
                />
              </div>

              {/* Account Holder Full Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  ACCOUNT HOLDER FULL NAME
                </label>
                <input
                  className="th-input"
                  placeholder="Enter account holder name"
                  value={bAccountName}
                  onChange={(e) => setBAccountName(e.target.value)}
                  style={{ background: '#101929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ffffff', padding: '10px 14px' }}
                />
              </div>

              {/* SWIFT / BIC Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  SWIFT / BIC CODE (OPTIONAL)
                </label>
                <input
                  className="th-input th-mono"
                  placeholder="e.g. EQUKENNA"
                  value={bSwiftCode}
                  onChange={(e) => setBSwiftCode(e.target.value)}
                  style={{ background: '#101929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ffffff', padding: '10px 14px' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                DESTINATION WALLET ADDRESS / NUMBER
              </label>
              <input
                className="th-input th-mono"
                placeholder={wGateway === 'mpesa' ? 'Enter M-Pesa phone number (e.g. 0712345678)…' : 'Paste crypto wallet address…'}
                value={wAddr}
                onChange={e => setWAddr(e.target.value)}
                style={{ background: '#101929', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '10px', color: '#ffffff', padding: '10px 14px' }}
              />
            </div>
          )}

          {/* Quick Amount Chips */}
          <div className="th-quick-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[minWithdrawalUSD, 50, 100, 500].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(q => (
              <button key={q} type="button" className={`th-quick ${wAmt === String(q) ? 'th-quick-on' : ''}`} onClick={() => setWAmt(String(q))}>
                ${q}
              </button>
            ))}
            <button type="button" className="th-quick" onClick={() => setWAmt(wallets.main.toFixed(2))}>MAX</button>
          </div>

          {/* Amount Input */}
          <div className="th-input-wrap" style={{ background: '#0a1220', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-muted)', marginRight: '8px' }}>$</span>
            <input
              className="th-input"
              type="number"
              min={minWithdrawalUSD}
              placeholder="0.00"
              value={wAmt}
              onChange={e => setWAmt(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', fontWeight: 800, width: '100%', outline: 'none' }}
            />
          </div>

          {/* Hint */}
          <div className="th-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={11} color="#00e5ff" /> Processed within 24 hours after admin review.
          </div>

          {/* Submit Withdrawal Button */}
          <button
            type="button"
            className="th-proceed-btn th-proceed-full th-proceed-red"
            onClick={confirmWithdraw}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(255, 23, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <ArrowUpFromLine size={16} /> WITHDRAW
          </button>
        </div>
      )}

      {/* ════════════════ TRANSFER ══════════════════════════════════════════ */}
      {tab === 'transfer' && (
        <div className="th-simple-body">
          <div className="th-transfer-row">
            <label className="th-field-label" style={{flex:1}}>
              From
              <select className="th-input" value={tFrom} onChange={e => setTFrom(e.target.value as keyof WalletBalances)}>
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_META[k].label} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </label>
            <button className="th-swap-btn" onClick={() => { const t=tFrom; setTFrom(tTo); setTTo(t) }}>
              <RefreshCw size={15}/>
            </button>
            <label className="th-field-label" style={{flex:1}}>
              To
              <select className="th-input" value={tTo} onChange={e => setTTo(e.target.value as keyof WalletBalances)}>
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_META[k].label} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="th-quick-row">
            {[10,50,100,500].map(q => (
              <button key={q} className={`th-quick ${tAmt===String(q)?'th-quick-on':''}`} onClick={() => setTAmt(String(q))}>
                ${q}
              </button>
            ))}
            <button className="th-quick" onClick={() => setTAmt(wallets[tFrom].toFixed(2))}>MAX</button>
          </div>
          <div className="th-input-wrap">
            <span className="th-input-pre">$</span>
            <input className="th-input" type="number" min="1" placeholder="0.00" value={tAmt} onChange={e => setTAmt(e.target.value)}/>
          </div>
          <div className="th-hint" style={{marginTop:4,color:'var(--ft-cyan)'}}><ArrowLeftRight size={11}/> Zero fees · Instant settlement.</div>
          <button className="th-proceed-btn th-proceed-full th-proceed-trf" onClick={confirmTransfer} style={{marginTop:16}}>
            <ArrowLeftRight size={15}/> EXECUTE TRANSFER
          </button>
        </div>
      )}

      {/* ── ACTIVITY LOG ─────────────────────────────────────────────────── */}
      <div className="fhub-log">
        {logLines.map((line, i) => (
          <div key={i} className="fhub-log-line" style={{ opacity: 1 - i * 0.18 }}>{line}</div>
        ))}
        {logLines.length === 0 && <div className="fhub-log-line" style={{opacity:0.4}}>Awaiting activity…</div>}
      </div>

      {/* ── WITHDRAWAL SUCCESS POPUP MODAL ─────────────────────────────────── */}
      {withdrawSuccessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(3, 9, 22, 0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setWithdrawSuccessModal(null)}>
          <div style={{
            background: '#071326',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 229, 255, 0.2)',
            borderRadius: '24px',
            padding: '36px 28px 28px',
            maxWidth: '430px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            animation: 'fhubPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }} onClick={e => e.stopPropagation()}>

            {/* Top Icon Badge */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,229,255,0.2) 0%, rgba(7,19,38,0.95) 100%)',
              border: '1.5px solid #00e5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00e5ff',
              boxShadow: '0 0 24px rgba(0,229,255,0.35)',
            }}>
              <Wallet size={32} />
            </div>

            {/* Banner Kicker */}
            <div style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#1ccf84',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              ✨ WITHDRAWAL SUCCESSFUL &amp; ALLOCATED ✨
            </div>

            {/* Amount Display */}
            <div style={{
              fontSize: '34px',
              fontWeight: 900,
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '-0.5px',
              marginTop: '-6px',
            }}>
              ${withdrawSuccessModal.amount.toFixed(2)} USD
            </div>

            {/* Inner Info Box */}
            <div style={{
              background: 'rgba(3, 20, 42, 0.75)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: '14px',
              padding: '16px 18px',
              textAlign: 'left',
              width: '100%',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#00e5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px',
              }}>
                ⏳ Allocation Stage (Pending Transfer)
              </div>
              <p style={{
                fontSize: '12px',
                color: '#a0aec0',
                lineHeight: 1.5,
                margin: 0,
              }}>
                Kindly wait for funds to be sent to your account. Your withdrawal has been successfully logged in your History ledger.
              </p>
            </div>

            {/* OK Button */}
            <button
              type="button"
              onClick={() => setWithdrawSuccessModal(null)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(0, 180, 216, 0.4)',
                transition: 'transform 0.15s ease, boxShadow 0.15s ease',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── DEPOSIT SUBMITTED SUCCESS POPUP BANNER MODAL ── */}
      {depositSuccessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(3, 9, 22, 0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setDepositSuccessModal(null)}>
          <div style={{
            background: '#071326',
            border: '1px solid rgba(0, 230, 118, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 230, 118, 0.25)',
            borderRadius: '24px',
            padding: '36px 28px 28px',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setDepositSuccessModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#a0aec0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            {/* Top Icon Badge */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(0, 230, 118, 0.15)',
              border: '2px solid #00e676',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00e676',
              boxShadow: '0 0 24px rgba(0, 230, 118, 0.35)',
            }}>
              <CheckCircle2 size={36} color="#00e676" />
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#00e676', textTransform: 'uppercase', letterSpacing: '1px' }}>
                CONFIRMATION SUBMITTED
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: '6px 0 0' }}>
                Deposit Submitted Successfully!
              </h2>
            </div>

            <div style={{
              background: 'rgba(3, 20, 42, 0.75)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              borderRadius: '14px',
              padding: '16px 18px',
              textAlign: 'left',
              width: '100%',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#00e676',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px',
              }}>
                ⏳ Pending Verification Stage
              </div>
              <p style={{
                fontSize: '12.5px',
                color: '#e2e8f0',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Your deposit of <strong style={{ color: '#00e676' }}>${depositSuccessModal.amountUSD.toFixed(2)} USD</strong> via <strong>{depositSuccessModal.method}</strong> is under verification. Your balance will be updated once payment is confirmed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDepositSuccessModal(null)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)',
                color: '#030916',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 230, 118, 0.35)',
              }}
            >
              Got it, Thank You!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
