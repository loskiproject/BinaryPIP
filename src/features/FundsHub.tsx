import { useState, useEffect, useRef } from 'react'
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Copy, CheckCircle2, AlertCircle, Smartphone, Bitcoin,
  DollarSign, RefreshCw, Zap,
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
  adminAddresses: DepositAddress[]
  showNotice: (msg: string) => void
  minDepositUSD?: number
  minDepositKES?: number
  minWithdrawalUSD?: number
}

const WALLET_COLORS: Record<keyof WalletBalances, string> = {
  main:       '#00e5ff',
  synthetic:  '#00e676',
  liveMarket: '#f2b94b',
}

const WALLET_LABELS: Record<keyof WalletBalances, string> = {
  main:       'Main Balance',
  synthetic:  'Synthetic Wallet',
  liveMarket: 'Live Market Wallet',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Simulated activity log
const ACTIVITY = [
  'GLOBAL SYNC: Volatility 25 (1s) index → Probability Check [Analyzing…]',
  'Security Audit: Passkey fully enrolled. ✅',
  '**On-boarding Update**: Questionnaire response registered. id_card_front queued for review. ⏳',
]

export default function FundsHub({ wallets, onTransfer, onDepositRequest, adminAddresses, showNotice, minDepositUSD = 50, minDepositKES = 100, minWithdrawalUSD = 10 }: Props) {
  // Quick amount pills — built from admin-set minimum + standard amounts
  const quickAmounts = [minDepositUSD, 100, 250, 500, 1000, 5000]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)
  const [tab, setTab]                 = useState<'deposit' | 'withdraw' | 'transfer'>('deposit')
  const [depositMode, setDepositMode] = useState<'crypto' | 'mpesa'>('crypto')
  const [network, setNetwork]         = useState(adminAddresses.find(a => a.enabled)?.network ?? 'USDT-TRC20')
  const [amount, setAmount]           = useState('')
  const [copied, setCopied]           = useState(false)

  // withdraw
  const [wAmt, setWAmt]       = useState('')
  const [wAddr, setWAddr]     = useState('')
  const [wGateway, setWGateway] = useState('USDT-TRC20')

  // transfer
  const [tFrom, setTFrom] = useState<keyof WalletBalances>('main')
  const [tTo, setTTo]     = useState<keyof WalletBalances>('synthetic')
  const [tAmt, setTAmt]   = useState('')

  // mpesa
  const [mpPhone, setMpPhone]   = useState('')
  const [mpKes, setMpKes]       = useState('')
  const [mpCode, setMpCode]     = useState('')
  // STK Push flow state
  type StkStep = 'form' | 'pushing' | 'waiting' | 'verify' | 'done' | 'error'
  const [stkStep, setStkStep]           = useState<StkStep>('form')
  const [stkError, setStkError]         = useState('')
  const [stkCheckoutId, setStkCheckoutId] = useState('')
  const [stkVerifying, setStkVerifying] = useState(false)

  // activity log ticker
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
  const activeAddr = adminAddresses.find(a => a.network === network && a.enabled)
    ?? { network, assetName: network, address: '—', note: 'No address configured for this network.' }

  const copyAddr = () => {
    navigator.clipboard.writeText(activeAddr.address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const confirmDeposit = () => {
    const amt = parseFloat(amount)
    if (!amt || amt < minDepositUSD) { showNotice(`Minimum deposit is $${minDepositUSD}.`); return }
    onDepositRequest(amt, network)
    showNotice(`✅ Deposit of $${fmt(amt)} via ${network} submitted. Awaiting admin confirmation.`)
    setAmount('')
  }

  const confirmMpesa = async () => {
    // Validate
    if (!mpPhone.match(/^07\d{8}$|^\+2547\d{8}$/)) { showNotice('Enter a valid M-Pesa number (07XXXXXXXX).'); return }
    const kes = parseFloat(mpKes)
    if (!kes || kes < minDepositKES) { showNotice(`Minimum is KES ${minDepositKES}.`); return }

    setStkStep('pushing')
    setStkError('')

    try {
      // Call Supabase edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

      const res = await fetch(`${supabaseUrl}/functions/v1/mpesa-stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          phone: mpPhone.trim(),
          amount: Math.ceil(kes),
          accountRef: 'NEXSMARKETS',
        }),
      })

      const data = await res.json() as { success?: boolean; message?: string; checkoutRequestId?: string; error?: string }

      if (!res.ok || !data.success) {
        setStkStep('error')
        setStkError(data.error ?? 'STK Push failed. Try again.')
        return
      }

      setStkCheckoutId(data.checkoutRequestId ?? '')
      setStkStep('waiting')
    } catch (err) {
      setStkStep('error')
      setStkError('Network error. Check your connection and try again.')
    }
  }

  const submitMpesaCode = () => {
    if (!mpCode.trim()) { showNotice('Enter the M-Pesa transaction code from your SMS.'); return }
    setStkVerifying(true)
    // Submit to platform for admin verification
    onDepositRequest(parseFloat(mpKes) / 130, 'MPESA', mpCode.trim())
    setTimeout(() => {
      setStkStep('done')
      setStkVerifying(false)
    }, 800)
  }

  const resetMpesa = () => {
    setStkStep('form')
    setStkError('')
    setMpPhone('')
    setMpKes('')
    setMpCode('')
    setStkCheckoutId('')
  }

  const confirmWithdraw = () => {
    const amt = parseFloat(wAmt)
    if (!amt || amt < minWithdrawalUSD) { showNotice(`Minimum withdrawal is $${minWithdrawalUSD}.`); return }
    if (wallets.main < amt) { showNotice('Insufficient main balance.'); return }
    if (!wAddr.trim()) { showNotice('Enter destination wallet address.'); return }
    showNotice(`✅ Withdrawal of $${fmt(amt)} via ${wGateway} submitted.`)
    setWAmt(''); setWAddr('')
  }

  const confirmTransfer = () => {
    const amt = parseFloat(tAmt)
    if (!amt || amt <= 0) { showNotice('Enter a valid amount.'); return }
    if (tFrom === tTo) { showNotice('Select two different wallets.'); return }
    if (wallets[tFrom] < amt) { showNotice('Insufficient balance.'); return }
    onTransfer(tFrom, tTo, amt)
    showNotice(`✅ Transferred $${fmt(amt)} → ${WALLET_LABELS[tTo]}`)
    setTAmt('')
  }

  const NETWORKS = adminAddresses
    .filter(a => a.enabled)
    .map(a => ({ id: a.network, label: a.assetName || a.network }))

  return (
    <div className="fhub-shell">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="fhub-header">
        <div className="fhub-title-block">
          <h2 className="fhub-title">Treasury Centre | Funds &amp; Multi-Wallet Hub</h2>
          <p className="fhub-sub">Manage balances, deposit, withdraw, and transfer between wallets.</p>
        </div>
      </div>

      {/* ── BALANCE ROW ─────────────────────────────────────────────────── */}
      <div className="fhub-balance-row">
        <div className="fhub-bal-card fhub-bal-total">
          <div className="fhub-bal-label">Total Portfolio</div>
          <div className="fhub-bal-value">
            <span>${fmt(total)}</span><small>USD</small>
          </div>
        </div>
        {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
          <div key={k} className="fhub-bal-card" style={{ borderColor: WALLET_COLORS[k] + '50' }}>
            <div className="fhub-bal-label">{WALLET_LABELS[k]}</div>
            <div className="fhub-bal-value" style={{ color: WALLET_COLORS[k] }}>
              <span>${fmt(wallets[k])}</span><small>USD</small>
            </div>
          </div>
        ))}
      </div>

      {/* ── TAB NAV ─────────────────────────────────────────────────────── */}
      <div className="fhub-tabs">
        <button className={`fhub-tab ${tab === 'deposit' ? 'fhub-tab-active-dep' : ''}`} onClick={() => setTab('deposit')}>
          <ArrowDownToLine size={14} /> Deposit
        </button>
        <button className={`fhub-tab ${tab === 'withdraw' ? 'fhub-tab-active-wit' : ''}`} onClick={() => setTab('withdraw')}>
          <ArrowUpFromLine size={14} /> Withdraw
        </button>
        <button className={`fhub-tab ${tab === 'transfer' ? 'fhub-tab-active-trf' : ''}`} onClick={() => setTab('transfer')}>
          <ArrowLeftRight size={14} /> Internal Transfer
        </button>
      </div>

      {/* ════════════════════ DEPOSIT ═══════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div className="fhub-body">
          {/* Method toggle */}
          <div className="fhub-method-row">
            <button
              className={`fhub-method-btn ${depositMode === 'crypto' ? 'fhub-method-on' : ''}`}
              onClick={() => setDepositMode('crypto')}
            >
              <Bitcoin size={14} /> Crypto Gateway
              <span className={`fhub-toggle ${depositMode === 'crypto' ? 'fhub-toggle-on' : ''}`} />
            </button>
            <button
              className={`fhub-method-btn ${depositMode === 'mpesa' ? 'fhub-method-on-mpesa' : ''}`}
              onClick={() => setDepositMode('mpesa')}
            >
              <Smartphone size={14} /> M-Pesa Mobile Money
              <span className={`fhub-toggle ${depositMode === 'mpesa' ? 'fhub-toggle-on-mpesa' : ''}`} />
            </button>
          </div>

          {/* ── CRYPTO ── */}
          {depositMode === 'crypto' && (
            <div className="fhub-crypto-grid">
              {/* Left: QR */}
              <div className="fhub-qr-panel">
                <svg viewBox="0 0 120 120" width="140" height="140" className="fhub-qr-svg">
                  <rect width="120" height="120" rx="10" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5"/>
                  {/* Corner finders */}
                  {([[4,4],[82,4],[4,82]] as [number,number][]).map(([x,y],i) => (
                    <g key={i}>
                      <rect x={x} y={y} width="34" height="34" rx="4" fill="none" stroke="#00e5ff" strokeWidth="2.5"/>
                      <rect x={x+7} y={y+7} width="20" height="20" rx="2" fill="#00e5ff"/>
                    </g>
                  ))}
                  {/* Data dots */}
                  {Array.from({length:36},(_,i)=>{
                    const row=Math.floor(i/6), col=i%6
                    const x=46+col*12, y=4+row*12
                    const filled=(row*7+col*3+row+col)%3!==0
                    return filled?<rect key={i} x={x} y={y} width="9" height="9" rx="1.5" fill="#00e5ff" opacity="0.75"/>:null
                  })}
                  {Array.from({length:24},(_,i)=>{
                    const row=Math.floor(i/4), col=i%4
                    const x=4+col*9, y=46+row*9
                    const filled=(row+col)%2===0
                    return filled?<rect key={i} x={x} y={y} width="7" height="7" rx="1" fill="#00e676" opacity="0.6"/>:null
                  })}
                  {/* Scan line animation */}
                  <line x1="4" y1="60" x2="116" y2="60" stroke="#00e5ff" strokeWidth="1.5" opacity="0.5" strokeDasharray="4 3">
                    <animateTransform attributeName="transform" type="translate" values="0,-56; 0,56; 0,-56" dur="3s" repeatCount="indefinite"/>
                  </line>
                </svg>
                <div className="fhub-qr-net">{network}</div>
              </div>

              {/* Right: details */}
              <div className="fhub-crypto-detail">
                {/* Network chips */}
                <div className="fhub-net-chips">
                  {NETWORKS.map(n => (
                    <button key={n.id} className={`fhub-net-chip ${network === n.id ? 'fhub-net-chip-active' : ''}`}
                      onClick={() => setNetwork(n.id)}>
                      {n.label}
                    </button>
                  ))}
                </div>

                <div className="fhub-net-name">Network: {activeAddr.assetName}</div>

                {/* Address bar */}
                <div className="fhub-addr-bar">
                  <span className="fhub-addr-text">{activeAddr.address}</span>
                  <button className="fhub-copy-btn" onClick={copyAddr}>
                    {copied ? <><CheckCircle2 size={12}/> Copied</> : <><Copy size={12}/> Copy Address</>}
                  </button>
                </div>

                <div className="fhub-addr-warn">
                  <AlertCircle size={11}/> {activeAddr.note}
                </div>

                {/* Quick amounts */}
                <div className="fhub-quick-row">
                  {quickAmounts.map(q => (
                    <button key={q} className={`fhub-quick ${amount === String(q) ? 'fhub-quick-on' : ''}`}
                      onClick={() => setAmount(String(q))}>
                      ${q}
                    </button>
                  ))}
                </div>

                {/* Amount input */}
                <div className="fhub-amt-row">
                  <label className="fhub-amt-label">Amount to Deposit (USD)</label>
                  <div className="fhub-amt-input-wrap">
                    <span className="fhub-amt-sym">$</span>
                    <input className="fhub-amt-input" type="number" min="50" placeholder="0.00"
                      value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                </div>

                <button className="fhub-confirm-btn" onClick={confirmDeposit}>
                  <Zap size={15}/> Confirm Deposit
                </button>
              </div>
            </div>
          )}

          {/* ── M-PESA STK PUSH ── */}
          {depositMode === 'mpesa' && (
            <div className="fhub-stk-shell">

              {/* ── STEP: FORM ───────────────────────────────────────── */}
              {stkStep === 'form' && (
                <>
                  <div className="fhub-stk-header">
                    <Smartphone size={22} color="#00e676" />
                    <div>
                      <div className="fhub-stk-title">M-Pesa STK Push</div>
                      <div className="fhub-stk-sub">Enter your number and amount — we'll send a payment prompt directly to your phone.</div>
                    </div>
                  </div>

                  <div className="fhub-stk-form">
                    <label className="fhub-field-label">
                      M-Pesa Phone Number
                      <div className="fhub-amt-input-wrap">
                        <span className="fhub-amt-sym">🇰🇪</span>
                        <input
                          className="fhub-amt-input"
                          type="tel"
                          placeholder="0712 345 678"
                          value={mpPhone}
                          onChange={e => setMpPhone(e.target.value)}
                        />
                      </div>
                    </label>

                    <label className="fhub-field-label">
                      Amount (KES)
                      <div className="fhub-quick-row" style={{ marginBottom: 6 }}>
                        {[minDepositKES, 500, 1000, 2500, 5000].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(q => (
                          <button key={q} className={`fhub-quick ${mpKes===String(q)?'fhub-quick-on':''}`}
                            onClick={() => setMpKes(String(q))}>
                            {q.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <div className="fhub-amt-input-wrap">
                        <span className="fhub-amt-sym">KES</span>
                        <input
                          className="fhub-amt-input"
                          type="number"
                          min={minDepositKES}
                          placeholder="0"
                          value={mpKes}
                          onChange={e => setMpKes(e.target.value)}
                        />
                      </div>
                      <div className="fhub-addr-warn" style={{ marginTop: 4 }}>
                        <AlertCircle size={11}/> Min KES {minDepositKES} · ~${((parseFloat(mpKes)||0)/130).toFixed(2)} USD
                      </div>
                    </label>

                    <button className="fhub-confirm-btn fhub-confirm-mpesa" onClick={confirmMpesa}>
                      <Smartphone size={16}/> Send M-Pesa Prompt to My Phone
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP: PUSHING ────────────────────────────────────── */}
              {stkStep === 'pushing' && (
                <div className="fhub-stk-status">
                  <div className="fhub-stk-spinner" />
                  <strong>Sending STK Push…</strong>
                  <p>Connecting to Safaricom. Please wait.</p>
                </div>
              )}

              {/* ── STEP: WAITING ON PHONE ───────────────────────────── */}
              {stkStep === 'waiting' && (
                <div className="fhub-stk-waiting">
                  <div className="fhub-stk-phone-icon">
                    <Smartphone size={36} color="#00e676" />
                    <span className="fhub-stk-ping" />
                  </div>
                  <strong>Check your phone!</strong>
                  <p>
                    A payment prompt has been sent to <strong style={{color:'#00e5ff'}}>{mpPhone}</strong> for
                    {' '}<strong style={{color:'#00e676'}}>KES {parseFloat(mpKes).toLocaleString()}</strong>.
                  </p>
                  <ol className="fhub-stk-steps">
                    <li>Your phone shows an M-Pesa PIN prompt</li>
                    <li>Enter your M-Pesa PIN to confirm payment</li>
                    <li>You'll receive an SMS with a transaction code</li>
                    <li>Paste that code below</li>
                  </ol>

                  <label className="fhub-field-label" style={{ width: '100%' }}>
                    M-Pesa Transaction Code (from SMS)
                    <input
                      className="fhub-input fhub-mono"
                      placeholder="e.g. QJK7WXYZ12"
                      value={mpCode}
                      onChange={e => setMpCode(e.target.value.toUpperCase())}
                      style={{ fontSize: '15px', letterSpacing: '2px', marginTop: 6 }}
                      autoFocus
                    />
                  </label>

                  <button
                    className="fhub-confirm-btn fhub-confirm-mpesa"
                    onClick={submitMpesaCode}
                    disabled={stkVerifying}
                    style={{ width: '100%' }}
                  >
                    {stkVerifying
                      ? <><span className="fhub-stk-spinner-sm" /> Verifying…</>
                      : <><DollarSign size={15}/> Confirm Deposit</>}
                  </button>

                  <button className="fhub-stk-retry" onClick={resetMpesa}>
                    ← Try different number or amount
                  </button>
                </div>
              )}

              {/* ── STEP: DONE ───────────────────────────────────────── */}
              {stkStep === 'done' && (
                <div className="fhub-stk-status fhub-stk-success">
                  <div style={{ fontSize: 48 }}>✅</div>
                  <strong>Deposit Submitted!</strong>
                  <p>
                    KES {parseFloat(mpKes).toLocaleString()} via M-Pesa has been submitted for admin verification.
                    Your balance will be credited once confirmed.
                  </p>
                  {mpCode && (
                    <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#00e676', fontFamily: 'var(--ft-mono)' }}>
                      Reference: {mpCode}
                    </div>
                  )}
                  <button className="fhub-confirm-btn fhub-confirm-mpesa" onClick={resetMpesa} style={{ marginTop: 8 }}>
                    Make Another Deposit
                  </button>
                </div>
              )}

              {/* ── STEP: ERROR ──────────────────────────────────────── */}
              {stkStep === 'error' && (
                <div className="fhub-stk-status fhub-stk-err">
                  <div style={{ fontSize: 40 }}>❌</div>
                  <strong>STK Push Failed</strong>
                  <p>{stkError}</p>
                  <button className="fhub-confirm-btn" onClick={resetMpesa} style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ WITHDRAW ══════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div className="fhub-body fhub-simple">
          <div className="fhub-avail">
            Available: <strong style={{color:'#00e5ff'}}>${fmt(wallets.main)}</strong>
          </div>

          <div className="fhub-net-chips" style={{marginBottom:4}}>
            {['USDT-TRC20','BTC','ETH','BANK_WIRE'].map(g => (
              <button key={g} className={`fhub-net-chip ${wGateway===g?'fhub-net-chip-active':''}`}
                onClick={() => setWGateway(g)}>
                {g === 'BANK_WIRE' ? 'Bank Wire' : g}
              </button>
            ))}
          </div>

          <label className="fhub-field-label">Destination Address
            <input className="fhub-input fhub-mono" placeholder="Paste wallet address…"
              value={wAddr} onChange={e => setWAddr(e.target.value)}/>
          </label>

          <div className="fhub-quick-row">
            {[10,50,100,500].map(q => (
              <button key={q} className={`fhub-quick ${wAmt===String(q)?'fhub-quick-on':''}`}
                onClick={() => setWAmt(String(q))}>
                ${q}
              </button>
            ))}
            <button className="fhub-quick" onClick={() => setWAmt(wallets.main.toFixed(2))}>MAX</button>
          </div>

          <div className="fhub-amt-input-wrap">
            <span className="fhub-amt-sym">$</span>
            <input className="fhub-amt-input" type="number" min="10" placeholder="0.00"
              value={wAmt} onChange={e => setWAmt(e.target.value)}/>
          </div>

          <div className="fhub-addr-warn" style={{marginTop:4}}>
            <AlertCircle size={11}/> Processed within 24 hours after admin review.
          </div>

          <button className="fhub-confirm-btn fhub-confirm-withdraw" onClick={confirmWithdraw}>
            <ArrowUpFromLine size={15}/> Submit Withdrawal
          </button>
        </div>
      )}

      {/* ════════════════════ TRANSFER ══════════════════════════════════════ */}
      {tab === 'transfer' && (
        <div className="fhub-body fhub-simple">
          <div className="fhub-transfer-row">
            <label className="fhub-field-label" style={{flex:1}}>
              From
              <select className="fhub-input" value={tFrom} onChange={e => setTFrom(e.target.value as keyof WalletBalances)}>
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_LABELS[k]} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </label>
            <button className="fhub-swap" onClick={() => { const t=tFrom; setTFrom(tTo); setTTo(t) }}>
              <RefreshCw size={15}/>
            </button>
            <label className="fhub-field-label" style={{flex:1}}>
              To
              <select className="fhub-input" value={tTo} onChange={e => setTTo(e.target.value as keyof WalletBalances)}>
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_LABELS[k]} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="fhub-quick-row">
            {[10,50,100,500].map(q => (
              <button key={q} className={`fhub-quick ${tAmt===String(q)?'fhub-quick-on':''}`}
                onClick={() => setTAmt(String(q))}>
                ${q}
              </button>
            ))}
            <button className="fhub-quick" onClick={() => setTAmt(wallets[tFrom].toFixed(2))}>MAX</button>
          </div>

          <div className="fhub-amt-input-wrap">
            <span className="fhub-amt-sym">$</span>
            <input className="fhub-amt-input" type="number" min="1" placeholder="0.00"
              value={tAmt} onChange={e => setTAmt(e.target.value)}/>
          </div>

          <div className="fhub-addr-warn" style={{borderColor:'rgba(0,229,255,0.2)',color:'var(--text-muted)',marginTop:4}}>
            <ArrowLeftRight size={11} color="#00e5ff"/> Zero fees · Instant settlement.
          </div>

          <button className="fhub-confirm-btn fhub-confirm-transfer" onClick={confirmTransfer}>
            <ArrowLeftRight size={15}/> Execute Transfer
          </button>
        </div>
      )}

      {/* ── ACTIVITY LOG ────────────────────────────────────────────────── */}
      <div className="fhub-log">
        {logLines.map((line, i) => (
          <div key={i} className="fhub-log-line" style={{ opacity: 1 - i * 0.18 }}>
            {line}
          </div>
        ))}
        {logLines.length === 0 && <div className="fhub-log-line" style={{opacity:0.4}}>Awaiting activity…</div>}
      </div>
    </div>
  )
}
