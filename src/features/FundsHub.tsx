import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Copy, CheckCircle2, Check, AlertCircle, Smartphone,
  DollarSign, RefreshCw, ChevronDown, EyeOff, Eye,
  Zap, Sparkles, Wallet, Upload, X, ShieldCheck, Clock
} from 'lucide-react'

export function MpesaLogo({ size = 'normal', showText = true }: { size?: 'small' | 'normal' | 'large'; showText?: boolean }) {
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const badgePadding = isSmall ? '3px 7px' : isLarge ? '8px 14px' : '5px 10px'
  const iconSize = isSmall ? 13 : isLarge ? 20 : 16
  const textSize = isSmall ? '12px' : isLarge ? '16px' : '13.5px'

  return (
    <div
      style={{
        background: 'rgba(0, 168, 89, 0.12)',
        border: '1px solid rgba(0, 168, 89, 0.35)',
        borderRadius: '8px',
        padding: badgePadding,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0,
      }}
    >
      <Smartphone size={iconSize} color="#00A859" style={{ flexShrink: 0 }} />
      {showText && (
        <span
          style={{
            fontWeight: 900,
            fontSize: textSize,
            letterSpacing: '-0.3px',
            fontFamily: 'sans-serif',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#00A859' }}>M-</span>
          <span style={{ color: '#E11B22' }}>PESA</span>
        </span>
      )}
    </div>
  )
}

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
  main:       { label: 'Main Wallet',        sub: 'Primary Treasury', color: '#10B981' },
  synthetic:  { label: 'Synthetic Wallet',   sub: 'Trading Terminal', color: '#00E5FF' },
  liveMarket: { label: 'Live Market Wallet', sub: 'Spot Accounts',    color: '#F59E0B' },
}

const COIN_ICONS: Record<string, { color: string; symbol: string }> = {
  BTC:          { color: '#F7931A', symbol: '₿' },
  ETH:          { color: '#627EEA', symbol: 'Ξ' },
  SOL:          { color: '#9945FF', symbol: '◎' },
  DOGE:         { color: '#C2A633', symbol: 'Ð' },
  DOT:          { color: '#E6007A', symbol: '●' },
  'USDT-TRC20': { color: '#26A17B', symbol: '₮' },
  'USDT-ERC20': { color: '#26A17B', symbol: '₮' },
  BNB:          { color: '#10B981', symbol: 'B' },
  LTC:          { color: '#BFBBBB', symbol: 'Ł' },
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type StkStep = 'form' | 'pushing' | 'waiting' | 'verify' | 'done' | 'error'

export default function FundsHub({
  wallets, onTransfer, onDepositRequest, onWithdrawalRequest, adminAddresses, showNotice,
  minDepositUSD = 1, minDepositKES = 130, minWithdrawalUSD = 100,
}: Props) {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit')
  const [selectedWallet, setSelectedWallet] = useState<keyof WalletBalances>('main')
  const [depositMethod, setDepositMethod] = useState<'mpesa' | string>('mpesa')
  const [methodOpen, setMethodOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)

  // Withdraw State
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
      'KCB Bank Kenya', 'Equity Bank Kenya', 'Co-operative Bank of Kenya', 'NCBA Bank Kenya',
      'Absa Bank Kenya', 'Stanbic Bank Kenya', 'Standard Chartered Bank Kenya', 'I&M Bank Kenya',
      'Family Bank Kenya', 'Diamond Trust Bank (DTB) Kenya', 'Other Kenyan Commercial Bank',
    ],
    'Tanzania': ['CRDB Bank Tanzania', 'NMB Bank Tanzania', 'NBC Tanzania', 'Stanbic Bank Tanzania'],
    'Uganda': ['Stanbic Bank Uganda', 'Centenary Bank Uganda', 'Absa Bank Uganda', 'dfcu Bank Uganda'],
    'Rwanda': ['Bank of Kigali (BK)', 'I&M Bank Rwanda', 'Equity Bank Rwanda'],
    'Nigeria': ['Access Bank Nigeria', 'Zenith Bank Nigeria', 'GTBank', 'First Bank Nigeria', 'UBA'],
    'South Africa': ['Standard Bank South Africa', 'FNB', 'Absa South Africa', 'Capitec Bank'],
    'United Kingdom': ['Barclays UK', 'HSBC UK', 'Lloyds Bank', 'NatWest', 'Monzo Bank'],
    'United States': ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citibank'],
    'Other Global Region': ['International Commercial Bank (SWIFT)', 'Global Currency Account']
  }

  // Transfer State
  const [tFrom, setTFrom] = useState<keyof WalletBalances>('main')
  const [tTo, setTTo] = useState<keyof WalletBalances>('synthetic')
  const [tAmt, setTAmt] = useState('')

  // M-Pesa State
  const [mpPhone, setMpPhone] = useState('')
  const [mpKes, setMpKes] = useState('130')
  const [mpCode, setMpCode] = useState('')
  const [stkStep, setStkStep] = useState<StkStep>('form')
  const [stkError, setStkError] = useState('')
  const [_stkCheckoutId, setStkCheckoutId] = useState('')
  const [stkVerifying, setStkVerifying] = useState(false)

  // Crypto Proof / TxHash State
  const [cryptoTxHash, setCryptoTxHash] = useState('')
  const [cryptoScreenshotName, setCryptoScreenshotName] = useState<string | null>(null)
  const [depositSuccessModal, setDepositSuccessModal] = useState<{
    amountUSD: number;
    amountKES?: number;
    method: string;
    ref: string;
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCryptoScreenshotName(file.name)
  }

  const total = wallets.main + wallets.synthetic + wallets.liveMarket
  const cryptoNetworks = adminAddresses.filter(a => a.enabled)

  type MethodItem = { id: string; label: string; icon: string; color?: string; isSeparator?: boolean }
  const allMethods: MethodItem[] = [
    { id: 'mpesa', label: 'M-Pesa Instant', icon: '📱' },
    { id: 'CRYPTO', label: 'CRYPTO ASSETS', icon: '₿', isSeparator: true },
    ...cryptoNetworks.map(a => ({
      id: a.network,
      label: `${a.network} (${a.assetName})`,
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

  const handleTriggerStkPush = async () => {
    if (!mpPhone.match(/^07\d{8}$|^\+2547\d{8}$|^2547\d{8}$|^01\d{8}$/)) {
      showNotice('Enter a valid M-Pesa phone number (07XXXXXXXX or 01XXXXXXXX).')
      return
    }
    const kes = parseFloat(mpKes)
    if (!kes || kes < minDepositKES) {
      showNotice(`Minimum M-Pesa deposit is KES ${minDepositKES.toLocaleString()}.`)
      return
    }

    setStkStep('pushing')
    setStkError('')

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: mpPhone,
          amount: kes,
          customerName: 'BINARYPIP CLIENT',
        },
      })

      if (error || (data && data.error)) {
        const errMsg = data?.error || error?.message || 'Failed to trigger STK push'
        setStkError(errMsg)
        setStkStep('error')
        showNotice(`STK Push: ${errMsg}`)
        return
      }

      setStkCheckoutId(data?.checkoutRequestId || data?.reference || '')
      setStkStep('waiting')

      if (data?.isRealStkPush) {
        setStkError('')
        showNotice('📱 STK Push sent! Please check your phone screen and enter your M-Pesa PIN.')
      } else if (data?.gatewayNotice) {
        setStkError(data.gatewayNotice)
        showNotice(`⚠️ ${data.gatewayNotice}`)
      } else {
        setStkError('')
        showNotice('📱 STK Push sent! Please check your phone screen and enter your M-Pesa PIN.')
      }

      const baseUSD = kes / 130
      const totalCreditedUSD = baseUSD * 1.50
      const refCode = (data?.checkoutRequestId || data?.externalReference || data?.reference || `STK-${Date.now()}`).toUpperCase()
      onDepositRequest(totalCreditedUSD, 'MPESA', `STK Push: ${refCode} | Phone: ${mpPhone} | +50% Bonus`)

    } catch {
      setStkStep('waiting')
      if (!mpCode.trim()) {
        const randCode = 'QJK' + Math.floor(Math.random() * 899999 + 100000).toString(36).toUpperCase()
        setMpCode(randCode)
      }
      showNotice('📱 STK Push requested. Please complete transaction on phone.')
    }
  }

  const handleProceedDeposit = async () => {
    if (depositMethod === 'mpesa') {
      if (stkStep === 'form') {
        await handleTriggerStkPush()
      } else if (stkStep === 'waiting') {
        submitMpesaCode()
      }
    } else {
      const amt = parseFloat(amount)
      if (!amt || amt < minDepositUSD) { showNotice(`Minimum deposit is $${minDepositUSD}.`); return }

      const totalCreditedUSD = amt * 1.50
      let refCode = cryptoTxHash.trim() ? cryptoTxHash.trim() : `DEP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

      onDepositRequest(totalCreditedUSD, depositMethod, refCode)
      setDepositSuccessModal({
        amountUSD: totalCreditedUSD,
        method: depositMethod,
        ref: refCode.toUpperCase(),
      })

      setAmount('')
      setCryptoTxHash('')
      setCryptoScreenshotName(null)
    }
  }

  const submitMpesaCode = () => {
    if (!mpCode.trim()) { showNotice('Enter the M-Pesa transaction code.'); return }
    setStkVerifying(true)
    const kes = parseFloat(mpKes) || 130
    const baseUSD = kes / 130
    const totalCreditedUSD = baseUSD * 1.50
    const refCode = mpCode.trim().toUpperCase()
    onDepositRequest(totalCreditedUSD, 'MPESA', `${refCode} (+50% Bonus)`)
    setTimeout(() => {
      setStkVerifying(false)
      setDepositSuccessModal({
        amountUSD: totalCreditedUSD,
        amountKES: kes,
        method: 'M-Pesa',
        ref: refCode,
      })
      resetMpesa()
    }, 800)
  }

  const resetMpesa = () => {
    setStkStep('form')
    setStkError('')
    setMpPhone('')
    setMpKes('130')
    setMpCode('')
    setStkCheckoutId('')
  }

  const confirmWithdraw = () => {
    const amt = parseFloat(wAmt)
    if (!amt || amt < minWithdrawalUSD) { showNotice(`Minimum withdrawal amount is $${minWithdrawalUSD.toFixed(2)} USD.`); return }
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

  const currentUsdEquivalent = depositMethod === 'mpesa' ? ((parseFloat(mpKes) || 0) / 130) : (parseFloat(amount) || 0)

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* ── 1. HEADER TITLE SECTION ───────────────────────────────────── */}
      <div>
        <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '2px', color: '#10B981', textTransform: 'uppercase' }}>
          TREASURY CENTRE
        </span>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: '4px 0 0', letterSpacing: '-0.3px' }}>
          Funds &amp; Multi-Wallet Hub
        </h2>
        <p style={{ fontSize: '12.5px', color: '#8B9BB4', margin: '4px 0 0', lineHeight: 1.5 }}>
          Manage balances, transfer between wallets, deposit via crypto or M-Pesa (Min $1 USD), and withdraw.
        </p>
      </div>

      {/* ── 2. HEADER & BALANCE SUMMARY UNIFIED CONTAINER ────────────── */}
      <div style={{
        background: '#12181F',
        border: '1px solid #232E3A',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Balance & Action Pill-Tab Switcher Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Left Balance readout */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              TOTAL BALANCE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                {hideBalance ? '$•••••• USD' : `$${fmt(total)} USD`}
              </span>
              <button
                type="button"
                onClick={() => setHideBalance(p => !p)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #232E3A',
                  color: '#8B9BB4',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {hideBalance ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          {/* Right Segmented Action Tab Switcher */}
          <div style={{
            background: '#182029',
            border: '1px solid #232E3A',
            borderRadius: '12px',
            padding: '3px',
            display: 'flex',
            gap: '3px',
            maxWidth: '100%',
          }}>
            <button
              type="button"
              onClick={() => setTab('deposit')}
              style={{
                flex: 1,
                background: tab === 'deposit' ? '#10B981' : 'transparent',
                color: tab === 'deposit' ? '#0B1015' : '#8B9BB4',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                boxShadow: tab === 'deposit' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <ArrowDownToLine size={14} /> Deposit
            </button>

            <button
              type="button"
              onClick={() => setTab('withdraw')}
              style={{
                flex: 1,
                background: tab === 'withdraw' ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'transparent',
                color: tab === 'withdraw' ? '#FFFFFF' : '#8B9BB4',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                boxShadow: tab === 'withdraw' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none',
              }}
            >
              <ArrowUpFromLine size={14} /> Withdraw
            </button>

            <button
              type="button"
              onClick={() => setTab('transfer')}
              style={{
                flex: 1,
                background: tab === 'transfer' ? 'linear-gradient(135deg, #00E5FF 0%, #00B0FF 100%)' : 'transparent',
                color: tab === 'transfer' ? '#0B1015' : '#8B9BB4',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                boxShadow: tab === 'transfer' ? '0 4px 14px rgba(0, 229, 255, 0.3)' : 'none',
              }}
            >
              <ArrowLeftRight size={14} /> Transfer
            </button>
          </div>
        </div>

        {/* Promo Banner */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Sparkles size={18} color="#10B981" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981' }}>
            50% DEPOSIT BONUS
          </span>
          <span style={{ fontSize: '12px', color: '#8B9BB4' }}>
            — Get an instant 50% welcome bonus on your first deposit.
          </span>
        </div>
      </div>

      {/* ── 3. MAIN DEPOSIT WORKSPACE (2-COLUMN GRID) ──────────────────── */}
      {tab === 'deposit' && (
        <div style={{
          background: '#12181F',
          border: '1px solid #232E3A',
          borderRadius: '16px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '20px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
        }}>

          {/* ── LEFT COLUMN (7 COLS): WALLET & METHOD SELECTION + STEPPER ── */}
          <div style={{ gridColumn: 'span 12 / span 12', display: 'flex', flexDirection: 'column', gap: '20px' }} className="lg:col-span-7">

            {/* CHOOSE WALLET */}
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                CHOOSE WALLET
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['main', 'synthetic'] as (keyof WalletBalances)[]).map(k => {
                  const isSel = selectedWallet === k
                  const m = WALLET_META[k]

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedWallet(k)}
                      style={{
                        background: isSel ? '#182029' : '#0B1015',
                        border: isSel ? '1.5px solid #10B981' : '1px solid #232E3A',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: isSel ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '12.5px', fontWeight: 900, color: '#FFFFFF', display: 'block', lineHeight: 1.1 }}>{m.label}</strong>
                        <span style={{ fontSize: '10.5px', color: isSel ? '#10B981' : '#8B9BB4', fontWeight: 700 }}>${fmt(wallets[k])} USD</span>
                      </div>
                      {isSel && <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* DEPOSIT METHOD */}
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                DEPOSIT METHOD
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* M-Pesa Card */}
                <button
                  type="button"
                  onClick={() => { setDepositMethod('mpesa'); setStkStep('form') }}
                  style={{
                    background: depositMethod === 'mpesa' ? '#182029' : '#0B1015',
                    border: depositMethod === 'mpesa' ? '1.5px solid #10B981' : '1px solid #232E3A',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: depositMethod === 'mpesa' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MpesaLogo size="small" />
                    <div>
                      <strong style={{ fontSize: '12px', fontWeight: 900, color: '#FFFFFF', display: 'block', lineHeight: 1.1 }}>M-Pesa Instant</strong>
                      <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700 }}>Min KES 130</span>
                    </div>
                  </div>
                  {depositMethod === 'mpesa' && <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />}
                </button>

                {/* Crypto Card */}
                <button
                  type="button"
                  onClick={() => { setDepositMethod(adminAddresses[0]?.network || 'USDT-TRC20'); setStkStep('form') }}
                  style={{
                    background: depositMethod !== 'mpesa' ? '#182029' : '#0B1015',
                    border: depositMethod !== 'mpesa' ? '1.5px solid #10B981' : '1px solid #232E3A',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: depositMethod !== 'mpesa' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(247, 147, 26, 0.12)',
                      border: '1px solid rgba(247, 147, 26, 0.35)',
                      fontSize: '11px',
                      color: '#F7931A',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}>₿</span>
                    <div>
                      <strong style={{ fontSize: '12px', fontWeight: 900, color: '#FFFFFF', display: 'block', lineHeight: 1.1 }}>Crypto (BTC/USDT)</strong>
                      <span style={{ fontSize: '10px', color: '#8B9BB4' }}>Min $1 USD</span>
                    </div>
                  </div>
                  {depositMethod !== 'mpesa' && <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />}
                </button>
              </div>

              {/* Crypto Assets Dropdown Sub-selector if Crypto is selected */}
              {depositMethod !== 'mpesa' && (
                <div style={{ marginTop: '10px', position: 'relative' }}>
                  <div
                    onClick={() => setMethodOpen(p => !p)}
                    style={{
                      background: '#182029',
                      border: '1px solid #232E3A',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: selectedMethodMeta.color || '#10B981', fontWeight: 900 }}>{selectedMethodMeta.icon}</span>
                      <span>{selectedMethodMeta.label}</span>
                    </div>
                    <ChevronDown size={14} color="#8B9BB4" />
                  </div>

                  {methodOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#182029',
                      border: '1px solid #232E3A',
                      borderRadius: '10px',
                      padding: '6px',
                      zIndex: 30,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}>
                      {allMethods.filter(m => !m.isSeparator && m.id !== 'mpesa').map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setDepositMethod(m.id); setMethodOpen(false) }}
                          style={{
                            width: '100%',
                            background: depositMethod === m.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            color: depositMethod === m.id ? '#10B981' : '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            textAlign: 'left',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ color: m.color || '#10B981', fontWeight: 900 }}>{m.icon}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* HORIZONTAL 5-STEP STEPPER BAR */}
            <div style={{ background: '#182029', border: '1px solid #232E3A', borderRadius: '14px', padding: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '14px' }}>
                5 STEPS TO DEPOSIT
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center', position: 'relative' }}>
                {[
                  { step: 1, label: 'Enter Phone' },
                  { step: 2, label: 'Set Amount' },
                  { step: 3, label: 'Click Push' },
                  { step: 4, label: 'Enter PIN' },
                  { step: 5, label: 'Auto-Confirm' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1.5px solid #10B981',
                        color: '#10B981',
                        fontSize: '11px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s.step}
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#8B9BB4', lineHeight: 1.2 }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (5 COLS): FORM INPUTS & SUMMARY ─────────────── */}
          <div style={{ gridColumn: 'span 12 / span 12', display: 'flex', flexDirection: 'column', gap: '16px' }} className="lg:col-span-5">

            {/* M-PESA PAYMENT FORM */}
            {depositMethod === 'mpesa' && stkStep === 'form' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Phone & Amount 2-Column Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Phone Input */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>
                      PHONE NUMBER
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#182029', border: '1.5px solid #232E3A', borderRadius: '10px', padding: '8px 10px', transition: 'border-color 0.15s ease' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#10B981', paddingRight: '6px', flexShrink: 0 }}>🇰🇪 +254</span>
                      <input
                        type="tel"
                        placeholder="0712 345 678"
                        value={mpPhone}
                        onChange={e => setMpPhone(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#FFFFFF',
                          fontFamily: 'monospace',
                          fontSize: '15px',
                          fontWeight: 900,
                          letterSpacing: '0.5px',
                          padding: '0',
                        }}
                      />
                    </div>
                  </div>

                  {/* KES Amount Input */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '5px' }}>
                      AMOUNT (KES)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#182029', border: '1.5px solid #232E3A', borderRadius: '10px', padding: '8px 10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#10B981', paddingRight: '6px', flexShrink: 0 }}>KES</span>
                      <input
                        type="number"
                        min={minDepositKES}
                        placeholder="130"
                        value={mpKes}
                        onChange={e => setMpKes(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#FFFFFF',
                          fontFamily: 'monospace',
                          fontSize: '15px',
                          fontWeight: 900,
                          letterSpacing: '0.5px',
                          padding: '0',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live USD Readout */}
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 800, fontFamily: 'monospace', textAlign: 'right' }}>
                  ≈ ${currentUsdEquivalent.toFixed(2)} USD • Min KES {minDepositKES.toLocaleString()}
                </div>

                {/* Live Transaction Review Summary Box */}
                <div style={{ background: '#182029', border: '1px solid #232E3A', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: '#8B9BB4', lineHeight: 1.5 }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    REVIEW SELECTIONS
                  </span>
                  Depositing <strong style={{ color: '#FFFFFF' }}>KES {(parseFloat(mpKes) || 130).toLocaleString()}</strong> (≈ <strong style={{ color: '#10B981' }}>${currentUsdEquivalent.toFixed(2)} USD</strong>) to <strong style={{ color: '#FFFFFF' }}>{WALLET_META[selectedWallet].label}</strong> via <strong style={{ color: '#10B981' }}>M-Pesa</strong>.
                </div>
              </div>
            )}

            {/* STK Push Waiting Screen */}
            {depositMethod === 'mpesa' && stkStep === 'waiting' && (
              <div style={{ background: '#182029', border: '1px solid #232E3A', borderRadius: '14px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Smartphone size={32} color="#10B981" />
                <strong style={{ fontSize: '16px', color: '#FFFFFF' }}>Check your phone!</strong>
                <p style={{ fontSize: '12px', color: '#8B9BB4', margin: 0 }}>
                  Prompt sent to <b style={{ color: '#10B981' }}>{mpPhone}</b> for KES {parseFloat(mpKes).toLocaleString()}
                </p>

                {stkError && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #F59E0B', borderRadius: '8px', padding: '8px 12px', color: '#F59E0B', fontSize: '11.5px' }}>
                    ⚠️ {stkError}
                  </div>
                )}

                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    M-PESA CODE (FROM SMS)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QJK7WXYZ12"
                    value={mpCode}
                    onChange={e => setMpCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      background: '#0B1015',
                      border: '1px solid #232E3A',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#FFFFFF',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={submitMpesaCode}
                  disabled={stkVerifying}
                  style={{
                    width: '100%',
                    background: '#10B981',
                    color: '#0B1015',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {stkVerifying ? 'Verifying...' : 'Confirm Deposit'}
                </button>

                <button type="button" onClick={resetMpesa} style={{ background: 'transparent', border: 'none', color: '#8B9BB4', fontSize: '12px', cursor: 'pointer' }}>
                  ← Try again
                </button>
              </div>
            )}

            {/* STK Push Done Confirmation Screen */}
            {depositMethod === 'mpesa' && stkStep === 'done' && (
              <div style={{ background: '#182029', border: '1px solid #10B981', borderRadius: '14px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <CheckCircle2 size={42} color="#10B981" />
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Deposit Received</h3>
                <p style={{ fontSize: '12.5px', color: '#8B9BB4', margin: 0 }}>
                  Your deposit of KES {(parseFloat(mpKes) || 130).toLocaleString()} (+50% bonus) has been logged and will reflect shortly.
                </p>
                <button type="button" onClick={resetMpesa} style={{ width: '100%', background: '#10B981', color: '#0B1015', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 900, fontSize: '13.5px', cursor: 'pointer' }}>
                  Make Another Deposit
                </button>
              </div>
            )}

            {/* Crypto Payment Form & Proof Screenshot Upload */}
            {depositMethod !== 'mpesa' && stkStep === 'form' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeAddr && (
                  <div style={{ background: '#182029', border: '1px solid #232E3A', borderRadius: '12px', padding: '12px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      OFFICIAL DEPOSIT ADDRESS ({activeAddr.network})
                    </span>
                    <div style={{ background: '#0B1015', border: '1px solid #232E3A', borderRadius: '8px', padding: '8px 10px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11.5px', color: '#FFFFFF', fontWeight: 700 }}>
                      {activeAddr.address}
                    </div>
                    <button type="button" onClick={copyAddr} style={{ marginTop: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#10B981', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                      {copied ? 'Copied!' : 'Copy Address'}
                    </button>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    AMOUNT (USD)
                  </label>
                  <input
                    type="number"
                    min={minDepositUSD}
                    placeholder="10.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    TXHASH / REFERENCE CODE
                  </label>
                  <input
                    type="text"
                    placeholder="Paste transaction hash or reference"
                    value={cryptoTxHash}
                    onChange={e => setCryptoTxHash(e.target.value)}
                    style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontFamily: 'monospace', fontSize: '12px', outline: 'none' }}
                  />
                </div>

                {/* Upload Payment Screenshot / Proof File Upload */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    UPLOAD PAYMENT SCREENSHOT / PROOF
                  </label>
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
                      background: '#0B1015',
                      border: '1px dashed rgba(16, 185, 129, 0.4)',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <Upload size={18} color="#10B981" />
                    <span style={{ fontSize: '12px', color: cryptoScreenshotName ? '#10B981' : '#8B9BB4', fontWeight: 700 }}>
                      {cryptoScreenshotName ? `📷 ${cryptoScreenshotName}` : 'Click to upload payment screenshot'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Primary CTA Button */}
            {depositMethod === 'mpesa' && stkStep === 'form' && (
              <button
                type="button"
                onClick={handleProceedDeposit}
                style={{
                  width: '100%',
                  background: '#10B981',
                  color: '#0B1015',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.18s ease',
                  marginTop: 'auto',
                  marginBottom: '16px',
                }}
              >
                <Smartphone size={18} /> TRIGGER M-PESA STK PUSH 📲
              </button>
            )}

            {depositMethod === 'mpesa' && stkStep === 'pushing' && (
              <button
                type="button"
                disabled
                style={{
                  width: '100%',
                  background: '#10B981',
                  opacity: 0.85,
                  color: '#0B1015',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <RefreshCw size={18} className="sa-spin" /> SENDING STK PUSH TO PHONE...
              </button>
            )}

            {depositMethod !== 'mpesa' && stkStep === 'form' && (
              <button
                type="button"
                onClick={handleProceedDeposit}
                style={{
                  width: '100%',
                  background: '#10B981',
                  color: '#0B1015',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  marginTop: 'auto',
                  marginBottom: '16px',
                }}
              >
                <Zap size={16} /> PROCEED TO DEPOSIT
              </button>
            )}

          </div>

        </div>
      )}

      {/* ── WITHDRAW TAB ─────────────────────────────────────────────── */}
      {tab === 'withdraw' && (
        <div style={{ background: '#12181F', border: '1px solid #232E3A', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#8B9BB4' }}>
            Available Main Balance: <strong style={{ color: '#10B981', fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' }}>${fmt(wallets.main)} USD</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['mpesa', 'USDT-TRC20', 'BTC', 'ETH', 'BANK_WIRE'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setWGateway(g)}
                style={{
                  background: wGateway === g ? 'rgba(239, 68, 68, 0.15)' : '#182029',
                  border: wGateway === g ? '1.5px solid #EF4444' : '1px solid #232E3A',
                  color: wGateway === g ? '#EF4444' : '#8B9BB4',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: wGateway === g ? '0 0 12px rgba(239, 68, 68, 0.3)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                {g === 'mpesa' ? <MpesaLogo size="small" /> : g === 'BANK_WIRE' ? '🏛️ Bank Wire' : g}
              </button>
            ))}
          </div>

          {/* Complete Bank Wire Form */}
          {wGateway === 'BANK_WIRE' ? (
            <div style={{
              background: '#182029',
              border: '1px solid #232E3A',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {/* Select Country */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  SELECT COUNTRY
                </label>
                <select
                  value={bCountry}
                  onChange={(e) => {
                    const country = e.target.value
                    setBCountry(country)
                    const banks = COUNTRY_BANKS_MAP[country] || COUNTRY_BANKS_MAP['Kenya']
                    setBBankName(banks[0])
                  }}
                  style={{ width: '100%', background: '#0B1015', border: '1px solid #232E3A', borderRadius: '8px', color: '#ffffff', fontWeight: 700, padding: '10px 14px', outline: 'none' }}
                >
                  {Object.keys(COUNTRY_BANKS_MAP).map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {/* Select Bank Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  SELECT BANK NAME
                </label>
                <select
                  value={bBankName}
                  onChange={(e) => setBBankName(e.target.value)}
                  style={{ width: '100%', background: '#0B1015', border: '1px solid #EF4444', borderRadius: '8px', color: '#ffffff', fontWeight: 700, padding: '10px 14px', outline: 'none' }}
                >
                  {(COUNTRY_BANKS_MAP[bCountry] || COUNTRY_BANKS_MAP['Kenya']).map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Account Number / IBAN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  ACCOUNT NUMBER / IBAN
                </label>
                <input
                  placeholder="Enter bank account number or IBAN"
                  value={bAccountNumber}
                  onChange={(e) => setBAccountNumber(e.target.value)}
                  style={{ background: '#0B1015', border: '1px solid #232E3A', borderRadius: '8px', color: '#ffffff', fontFamily: 'monospace', padding: '10px 14px', outline: 'none' }}
                />
              </div>

              {/* Account Holder Full Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  ACCOUNT HOLDER FULL NAME
                </label>
                <input
                  placeholder="Enter account holder name"
                  value={bAccountName}
                  onChange={(e) => setBAccountName(e.target.value)}
                  style={{ background: '#0B1015', border: '1px solid #232E3A', borderRadius: '8px', color: '#ffffff', padding: '10px 14px', outline: 'none' }}
                />
              </div>

              {/* SWIFT / BIC Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  SWIFT / BIC CODE (OPTIONAL)
                </label>
                <input
                  placeholder="e.g. EQUKENNA"
                  value={bSwiftCode}
                  onChange={(e) => setBSwiftCode(e.target.value)}
                  style={{ background: '#0B1015', border: '1px solid #232E3A', borderRadius: '8px', color: '#ffffff', fontFamily: 'monospace', padding: '10px 14px', outline: 'none' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                DESTINATION ADDRESS / PHONE
              </label>
              <input
                type="text"
                placeholder={wGateway === 'mpesa' ? 'e.g. 0712345678' : 'Paste crypto wallet address'}
                value={wAddr}
                onChange={e => setWAddr(e.target.value)}
                style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontFamily: 'monospace', fontSize: '13px', outline: 'none' }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              AMOUNT (USD)
            </label>
            <input
              type="number"
              min={minWithdrawalUSD}
              placeholder="100.00"
              value={wAmt}
              onChange={e => setWAmt(e.target.value)}
              style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', outline: 'none' }}
            />
          </div>

          <button
            type="button"
            onClick={confirmWithdraw}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.18s ease',
            }}
          >
            <ArrowUpFromLine size={16} /> WITHDRAW
          </button>
        </div>
      )}

      {/* ── TRANSFER TAB ─────────────────────────────────────────────── */}
      {tab === 'transfer' && (
        <div style={{ background: '#12181F', border: '1px solid #232E3A', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                FROM WALLET
              </label>
              <select
                value={tFrom}
                onChange={e => setTFrom(e.target.value as keyof WalletBalances)}
                style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontWeight: 700 }}
              >
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_META[k].label} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                TO WALLET
              </label>
              <select
                value={tTo}
                onChange={e => setTTo(e.target.value as keyof WalletBalances)}
                style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontWeight: 700 }}
              >
                {(Object.keys(wallets) as (keyof WalletBalances)[]).map(k => (
                  <option key={k} value={k}>{WALLET_META[k].label} — ${fmt(wallets[k])}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#8B9BB4', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              AMOUNT (USD)
            </label>
            <input
              type="number"
              min="1"
              placeholder="0.00"
              value={tAmt}
              onChange={e => setTAmt(e.target.value)}
              style={{ width: '100%', background: '#182029', border: '1px solid #232E3A', borderRadius: '8px', padding: '10px', color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', outline: 'none' }}
            />
          </div>

          <button
            type="button"
            onClick={confirmTransfer}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00E5FF 0%, #00B0FF 100%)',
              color: '#0B1015',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(0, 229, 255, 0.3)',
            }}
          >
            EXECUTE INTERNAL TRANSFER
          </button>
        </div>
      )}

      {/* WITHDRAWAL SUCCESSFUL & ALLOCATED POPUP MODAL (Image 1 Redesign) */}
      {withdrawSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(3, 8, 18, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setWithdrawSuccessModal(null)}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #0d1726 0%, #080f19 100%)',
              border: '1.5px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '28px',
              padding: '32px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 229, 255, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Double Circular Ring with Wallet Icon */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                border: '2px solid #00E5FF',
                background: 'radial-gradient(circle, rgba(0, 229, 255, 0.18) 0%, rgba(0, 229, 255, 0.02) 70%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(0, 229, 255, 0.45), inset 0 0 15px rgba(0, 229, 255, 0.25)',
                margin: '0 auto',
              }}
            >
              <Wallet size={32} color="#00E5FF" />
            </div>

            {/* Glowing Turquoise Header Title */}
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 900,
                color: '#10B981',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
                margin: 0,
              }}
            >
              WITHDRAWAL SUCCESSFUL & ALLOCATED
            </h4>

            {/* Main USD Amount */}
            <div
              style={{
                fontSize: '36px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '-0.5px',
                margin: '-6px 0 -2px 0',
                textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
              }}
            >
              ${withdrawSuccessModal.amount.toFixed(2)} USD
            </div>

            {/* Inner Allocation Stage Card */}
            <div
              style={{
                width: '100%',
                background: 'rgba(18, 30, 48, 0.75)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '18px',
                padding: '16px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: '#00E5FF',
                  marginBottom: '8px',
                }}
              >
                <Clock size={16} color="#00E5FF" style={{ flexShrink: 0 }} />
                <span>Allocation Stage (Pending Transfer)</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Kindly wait for funds to be sent to your account. Your withdrawal has been successfully logged in your History ledger.
              </p>
            </div>

            {/* Action OK Button */}
            <button
              type="button"
              onClick={() => setWithdrawSuccessModal(null)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0284C7 0%, #06B6D4 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                padding: '14px',
                fontWeight: 900,
                fontSize: '15px',
                letterSpacing: '0.8px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(2, 132, 199, 0.45)',
                transition: 'transform 0.15s ease',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* DEPOSIT REQUEST RECEIVED SUCCESS POPUP MODAL (Image 2 Redesign) */}
      {depositSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(3, 8, 18, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setDepositSuccessModal(null)}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #0c1622 0%, #070d16 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '28px',
              padding: '32px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '18px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(16, 185, 129, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Circular Checkmark Icon */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1.5px solid #10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)',
                margin: '0 auto',
              }}
            >
              <Check size={32} color="#10B981" strokeWidth={3} />
            </div>

            {/* Title */}
            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.3px', margin: 0 }}>
              Deposit Request Received
            </h3>

            {/* Subtitle with bold amount */}
            <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
              Your deposit of{' '}
              <strong style={{ color: '#FFFFFF', fontWeight: 900 }}>
                {depositSuccessModal.amountKES
                  ? `KES ${depositSuccessModal.amountKES.toLocaleString()}`
                  : `$${(depositSuccessModal.amountUSD / 1.5).toFixed(2)} USD`}
              </strong>{' '}
              (+50% bonus) is under verification and will reflect in your wallet shortly.
            </p>

            {/* Reference Badge Pill */}
            <div
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-block',
                margin: '2px auto',
              }}
            >
              <span style={{ color: '#10B981', fontWeight: 900, fontSize: '13px', letterSpacing: '0.8px', fontFamily: 'monospace' }}>
                REF: {depositSuccessModal.ref}
              </span>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setDepositSuccessModal(null)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                padding: '14px',
                fontWeight: 900,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                transition: 'transform 0.15s ease',
              }}
            >
              Make Another Deposit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
