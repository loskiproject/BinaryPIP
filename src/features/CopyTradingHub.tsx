import React, { useState } from 'react'
import { Users, Star, Search, CheckCircle2, Shield } from 'lucide-react'
import { useCopyTrading } from './useCopyTrading'
import MyActiveTraders from './MyActiveTraders'
import CopyTraderModal from './CopyTraderModal'

export interface MasterTrader {
  id: string
  name: string
  risk: 'Low' | 'Medium' | 'High'
  bio: string
  winRate: number
  totalProfit: number
  copiers: number
  avatar: string
  specialty: string
}

interface CopyTradingHubProps {
  userBalance: number
  userId?: string
  supabaseUrl?: string
  supabaseKey?: string
  accountType?: 'real' | 'demo' | 'live'
  onAllocateBalance: (amount: number) => void
  showNotice: (msg: string) => void
  onOpenDeposit?: () => void
  onSwitchAccount?: () => void
}

const FIRST_NAMES = [
  'Kwame', 'Olumide', 'Gideon', 'Tariq', 'Kofi', 'Babatunde', 'Chiwetel', 'Tendai', 'Jabari', 'Chidubem',
  'Sylvia', 'Elena', 'Marcus', 'Victor', 'Amina', 'Dmitri', 'Sarah', 'Kenji', 'Carlos', 'Hannah',
  'Lucas', 'Priya', 'Alexander', 'Isabella', 'David', 'Zoe', 'Tariq', 'Chloë', 'Arthur', 'Mei-Ling',
  'Mateo', 'Nadia', 'Liam', 'Yuki', 'Fatima', 'Sven', 'Camila', 'Viktor', 'Benjamin', 'Aarav',
  'Freja', 'Jackson', 'Kwang-Sun', 'Amara', 'Dante', 'Sophie', 'Gabriel', 'Astrid', 'Hassan', 'Chloe',
  'Rohan', 'Katarina', 'Dominic', 'Zeynep', 'Nathanael', 'Keiko', 'Mikhail', 'Wanjala', 'Omondi', 'Kamau',
  'Njoroge', 'Maina', 'Mwangi', 'Kariuki', 'Ochieng', 'Onyango', 'Onyinye', 'Mutua', 'Musyoka', 'Wanjiru',
  'Akinyi', 'Adhiambo', 'Zola', 'Chimamanda', 'Folake', 'Funke', 'Yetunde', 'Blessing', 'Mercy', 'Faith',
  'Chiamaka', 'Ngozi', 'Ama', 'Akosua', 'Efua', 'Halima', 'Zainab', 'Aisha', 'Mariam', 'Thabo',
  'Sipho', 'Kehinde', 'Bakari', 'Faraji', 'Dayo', 'Temitope', 'Tunde', 'Sekou', 'Ousmane', 'Nkurunziza',
  'Kagame', 'Ndlovu', 'Dlamini', 'Khumalo', 'Nkosi', 'Mbeki', 'Zuma', 'El-Masry', 'Benali', 'Kouassi',
  'Adrian', 'Beatriz', 'Caleb', 'Daria', 'Ethan', 'Fiona', 'George', 'Helena', 'Ian', 'Julia',
  'Laura', 'Milad', 'Nora', 'Oscar', 'Paola', 'Quentin', 'Rachel', 'Samuel', 'Tatiana', 'Umar',
  'Valerie', 'Winston', 'Ximena', 'Youssef', 'Zara', 'Adam', 'Bianca', 'Christian', 'Diana', 'Ezekiel'
]

const LAST_NAMES = [
  'Adebayo', 'Mutua', 'Okafor', 'Mwangi', 'Kamau', 'Osei', 'Mensah', 'Diallo',
  'Traore', 'Sow', 'Touré', 'Diop', 'Ndiaye', 'Cissé', 'Keita', 'Kouassi', 'Koné', 'Banza',
  'Mukendi', 'Nkurunziza', 'Kagame', 'Musyoka', 'Wanjala', 'Otieno', 'Onyango', 'Odhiambo', 'Okello', 'Ochieng',
  'Kariuki', 'Ndlovu', 'Dlamini', 'Khumalo', 'Nkosi', 'Mbeki', 'Zuma', 'Botha', 'El-Masry', 'Benali',
  'FX', 'Rostova', 'Chen', 'Sterling', 'Al-Mansoor', 'Volkov', 'Jenkins', 'Takahashi', 'Mendez', 'Schmidt',
  'Rossi', 'Sharma', 'Novak', 'Silva', 'O\'Connor', 'Kravitz', 'Hassan', 'Laurent', 'Pendelton', 'Zhou',
  'Garcia', 'Petrov', 'Gallagher', 'Tanaka', 'Al-Zahra', 'Lindqvist', 'Rodriguez', 'Krum', 'Hayes', 'Patel',
  'Nielsen', 'Miller', 'Park', 'Moretti', 'Martin', 'Santos', 'Eriksen', 'Mahmoud', 'Zhang', 'Gupta',
  'Kovac', 'Wright', 'Yilmaz', 'Dubois', 'Sato', 'Romanov', 'Vargas', 'Al-Ahmadi', 'Vanderbilt', 'Goldman'
]

const SPECIALTIES = [
  'Kenya FX & Synthetic Indices', 'Nairobi FX Scalping', 'Lagos SMC Order Blocks', 'Johannesburg Gold Swings', 'Accra Trend Algos',
  'EUR/USD & Scalping', 'Gold & Commodities', 'Crypto & Indices', 'Volatility Indices', 'FX Trends & Algos',
  'NASDAQ Breakouts', 'Low Drawdown', 'JPY Crosses', 'Crude Oil & Metals', 'Euro Crosses',
  'SMC Order Blocks', 'Quant Arbitrage', 'High Leverage Growth', 'Pure Price Action', 'London Breakouts',
  'Macro Fundamentals', 'Oil & Spot Gold', 'Micro Scalping', 'Synthetic Multipliers', 'US Equity Indices',
  'FX Correlations', 'Crypto Scalper', 'CHF Safe Haven', 'GBP/JPY Dragon', 'Automated Bot',
  'Halal Swap-Free', 'Exotic FX Pairs', 'Volatility 50', 'Emerging FX', 'Crash/Boom Spikes',
  'Fibo Retracements', 'DXY Correlations', 'Global Indices', 'Hedging Strategies', 'FOMC News FX',
  'Vol 10 Grid Bot', 'Multi-Asset Focus', 'Crypto Breakouts', 'Steady Growth', 'Intraday FX',
  'DAX 40 Trends', 'Spot Gold Masters', 'Asian Indices', 'Range Breakouts', 'Crude Oil Swings',
  'Sydney FX Session', 'Emerging FX', 'Wealth Management', 'Ichimoku Cloud', 'Jump Indices Algo'
]

const BIOS = [
  'Top elite professional Master Trader from Nairobi, Kenya specializing in high-accuracy M-Pesa automated synthetic indices and forex scalping.',
  'Nairobi-based professional forex trader with 8+ years experience specializing in high-accuracy M-Pesa scalping.',
  'Lagos SMC order block trader consistently delivering high monthly returns on XAU/USD & Volatility Indices.',
  'Johannesburg Gold & Mining equities specialist with conservative risk management.',
  'Accra-based quantitative trader utilizing automated algorithms for EUR/USD and GBP/USD.',
  'Professional forex trader with 8+ years experience specializing in high-accuracy scalping.',
  'Gold & Commodities specialist. Consistent daily returns with strict risk management.',
  'Cryptocurrency and Global Index momentum trader. Low drawdown and high profitability.',
  'Institutional swing trader focusing on High-Yield Synthetic Indices and Volatility 100.',
  'FX Trend Follower & Volatility Specialist. Verified algorithm trader with 90%+ win rate.',
  'High-frequency breakout trader on NASDAQ & Crash/Boom Synthetic Index markets.',
  'Conservatively managed portfolio with strict 1% risk per trade rule. Ideal for passive income.',
  'Asian Session specialist trading JPY crosses and Asian Indices with verified accuracy.',
  'Commodities and Oil Futures scalper. High-volume intraday profits with tight stop losses.',
  'European Central Bank news trader and EUR/GBP Range trader.',
  'Smart Money Concepts (SMC) institutional order block trader on XAU/USD.',
  'Quantitative trader utilizing statistical arbitrage across Major Forex pairs.',
  'Aggressive growth strategy targeting high risk-reward setups on Crypto & Volatility 25.',
  'Price Action & Market Structure specialist. Zero martingale, pure risk management.',
  'London Session breakout trading on GBP pairs and FTSE 100.'
]

// Handcrafted Top Featured Master Traders
const INITIAL_HANDCRAFTED: MasterTrader[] = [
  {
    id: 'mt-pipmaster',
    name: 'PipMaster',
    risk: 'Low',
    bio: 'Top elite professional Master Trader from Nairobi, Kenya specializing in high-accuracy M-Pesa automated synthetic indices and forex scalping.',
    winRate: 98.5,
    totalProfit: 90780,
    copiers: 1045,
    avatar: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80',
    specialty: 'Kenya FX & Synthetic Indices'
  },
  { id: 'mt-1', name: 'Sylvia FX', risk: 'Low', bio: 'Professional forex trader with 8+ years experience specializing in EUR/USD and GBP/USD scalping.', winRate: 98.4, totalProfit: 90450, copiers: 590, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', specialty: 'EUR/USD & Scalping' },
  { id: 'mt-2', name: 'Elena Rostova', risk: 'Medium', bio: 'Gold & Commodities specialist. Consistent daily returns with strict risk management.', winRate: 88.7, totalProfit: 24101, copiers: 86, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', specialty: 'Gold & Commodities' },
  { id: 'mt-3', name: 'Marcus Chen', risk: 'Low', bio: 'Cryptocurrency and Global Index momentum trader. Low drawdown and high profitability.', winRate: 95.1, totalProfit: 52900, copiers: 220, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialty: 'Crypto & Indices' },
  { id: 'mt-4', name: 'Victor Sterling', risk: 'Low', bio: 'Institutional swing trader focusing on High-Yield Synthetic Indices and Volatility 100.', winRate: 96.2, totalProfit: 142000, copiers: 840, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'Volatility Indices' },
  { id: 'mt-5', name: 'Amina Al-Mansoor', risk: 'Medium', bio: 'FX Trend Follower & Volatility Specialist. 6+ years of verified high-win-rate algorithm trading.', winRate: 92.5, totalProfit: 68400, copiers: 310, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'FX Trends & Algos' },
]

// Generate 100% Unique Profile Photo Avatars across all 540 Traders
const getUniqueAvatar = (index: number, name: string): string => {
  const unsplashPhotos = [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  ]

  if (index <= 15) {
    return unsplashPhotos[index % unsplashPhotos.length]
  }

  if (index <= 195) {
    const isMale = index % 2 === 0
    const photoNum = Math.floor((index - 15) / 2) % 90 + 1
    return `https://randomuser.me/api/portraits/${isMale ? 'men' : 'women'}/${photoNum}.jpg`
  }

  if (index <= 395) {
    const bgColors = ['071326', '00e676', '00b0ff', 'ff1744', 'ffb300', '7c4dff', '00e5ff', '29b6f6', 'ab47bc', '26a69a', 'ef5350', '66bb6a']
    const bg = bgColors[index % bgColors.length]
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&size=150&bold=true&font-size=0.42`
  }

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + index)}`
}

// Generate Exactly 540 Master Traders with 100% Unique Names AND 100% Unique Avatars, Sorted Alphabetically A to Z
const generateAllTraders540 = (): MasterTrader[] => {
  const list: MasterTrader[] = [...INITIAL_HANDCRAFTED]
  const usedNames = new Set<string>(INITIAL_HANDCRAFTED.map(t => t.name.toLowerCase()))

  let idx = 7
  while (list.length < 540) {
    const fn = FIRST_NAMES[(idx * 3 + (idx % 7)) % FIRST_NAMES.length]
    const ln = LAST_NAMES[(idx * 5 + (idx % 11)) % LAST_NAMES.length]
    let name = `${fn} ${ln}`

    if (usedNames.has(name.toLowerCase())) {
      name = `${fn} ${ln} ${idx}`
    }
    usedNames.add(name.toLowerCase())

    const risk: 'Low' | 'Medium' | 'High' = idx % 5 === 0 ? 'High' : (idx % 2 === 0 ? 'Low' : 'Medium')
    const bio = BIOS[(idx * 4 + (idx % 9)) % BIOS.length]
    const winRate = Number((82.0 + ((idx * 19) % 170) / 10).toFixed(1))
    const totalProfit = 11000 + ((idx * 2431) % 285000)
    const copiers = 30 + ((idx * 47) % 1500)
    const avatar = getUniqueAvatar(idx, name)
    const specialty = SPECIALTIES[(idx * 3 + (idx % 13)) % SPECIALTIES.length]

    list.push({
      id: `mt-${idx}`,
      name,
      risk,
      bio,
      winRate,
      totalProfit,
      copiers,
      avatar,
      specialty,
    })
    idx++
  }

  return list.sort((a, b) => a.name.localeCompare(b.name))
}

const MASTER_TRADERS_540: MasterTrader[] = generateAllTraders540()

export default function CopyTradingHub({
  userBalance,
  userId,
  supabaseUrl,
  supabaseKey,
  accountType = 'demo',
  onAllocateBalance,
  showNotice,
  onOpenDeposit,
  onSwitchAccount,
}: CopyTradingHubProps) {
  const [selectedTrader, setSelectedTrader] = useState<MasterTrader | null>(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All')

  // Real-time copy trading subscriptions hook
  const {
    subscriptions,
    loading: subsLoading,
    startCopySubscription,
    pauseSubscription,
    resumeSubscription,
    stopSubscription,
  } = useCopyTrading({
    userId,
    supabaseUrl,
    supabaseKey,
    accountType,
    onAllocateBalance,
    showNotice,
  })

  const [successModal, setSuccessModal] = useState<{ traderName: string; amount: number; estimatedReturn: number } | null>(null)

  const filteredTraders = MASTER_TRADERS_540.filter(trader => {
    const matchesSearch = trader.name.toLowerCase().includes(search.toLowerCase()) ||
                          trader.bio.toLowerCase().includes(search.toLowerCase()) ||
                          trader.specialty.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = riskFilter === 'All' || trader.risk === riskFilter
    return matchesSearch && matchesRisk
  })

  const handleConfirmModal = async (allocatedAmount: number, copyRatio: number, stopLossLimit: number | null) => {
    if (!selectedTrader) return false

    const traderSnapshot = {
      id: selectedTrader.id,
      name: selectedTrader.name,
      avatar: selectedTrader.avatar,
      risk_level: selectedTrader.risk,
      win_rate: selectedTrader.winRate,
      specialty: selectedTrader.specialty,
    }

    const ok = await startCopySubscription(traderSnapshot, allocatedAmount, copyRatio, stopLossLimit)

    if (ok) {
      const winRateFactor = selectedTrader.winRate / 100
      const riskMultiplier = selectedTrader.risk === 'Low' ? 1.85 : selectedTrader.risk === 'Medium' ? 2.10 : 2.45
      const estReturn = allocatedAmount * winRateFactor * riskMultiplier * copyRatio

      setSuccessModal({
        traderName: selectedTrader.name,
        amount: allocatedAmount,
        estimatedReturn: estReturn,
      })
      setSelectedTrader(null)
      return true
    }
    return false
  }

  const normAccountType = accountType === 'live' || accountType === 'real' ? 'real' : 'demo'

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="cth-header-banner" style={{
        borderRadius: '20px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={26} color="#10b981" />
          <h1 className="cth-title" style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
            Copy Trading Hub
          </h1>
        </div>
        <p className="cth-sub" style={{ fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
          Automatically mirror trades from top-performing professional master traders into your account in real time.
        </p>
      </div>

      {/* ── MY ACTIVE TRADERS DASHBOARD SECTION ────────────────────────────── */}
      <div id="my-active-traders">
        <MyActiveTraders
          subscriptions={subscriptions}
          accountType={accountType}
          userBalance={userBalance}
          onPause={pauseSubscription}
          onResume={resumeSubscription}
          onStop={stopSubscription}
          loading={subsLoading}
        />
      </div>

      {/* ── SEARCH & RISK FILTER ROW ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="cth-section-heading" style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={20} color="#f59e0b" fill="#f59e0b" />
          <span>Top Master Traders ({MASTER_TRADERS_540.length} Available · A to Z)</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="cth-search-box" style={{
            borderRadius: '12px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '220px',
          }}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search trader or strategy..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="cth-search-input"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {/* Risk Filters */}
          <div style={{ display: 'flex', borderRadius: '12px', padding: '3px' }}>
            {(['All', 'Low', 'Medium', 'High'] as const).map(rf => (
              <button
                key={rf}
                type="button"
                onClick={() => setRiskFilter(rf)}
                className={riskFilter === rf ? 'cth-filter-btn-active' : 'cth-filter-btn'}
                style={{
                  borderRadius: '9px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {rf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MASTER TRADERS GRID (CARDS) ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
        {filteredTraders.map(trader => {
          const isCopied = subscriptions.some(s => {
            const sType = s.account_type === 'live' ? 'real' : s.account_type
            return s.master_trader_id === trader.id && sType === normAccountType && s.status !== 'stopped'
          })
          const riskColor = trader.risk === 'Low' ? '#10b981' : trader.risk === 'Medium' ? '#f59e0b' : '#ef4444'

          return (
            <div
              key={trader.id}
              className="cth-trader-card"
              style={{
                border: isCopied ? '1.5px solid #10b981' : undefined,
                borderRadius: '18px',
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                transition: 'transform 0.2s ease, borderColor 0.2s ease',
              }}
            >
              {/* Top Profile Header */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <img
                  src={trader.avatar}
                  alt={trader.name}
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${riskColor}`,
                    boxShadow: `0 0 12px ${riskColor}40`,
                  }}
                />
                <div>
                  <h3 className="cth-trader-name" style={{ fontSize: '17px', fontWeight: 900, margin: 0, letterSpacing: '-0.2px' }}>
                    {trader.name}
                  </h3>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: riskColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={12} color={riskColor} />
                    Risk: {trader.risk}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p className="cth-trader-bio" style={{ fontSize: '12.5px', lineHeight: 1.45, margin: 0, minHeight: '36px' }}>
                {trader.bio}
              </p>

              {/* Stats Box */}
              <div className="cth-stats-box" style={{
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                textAlign: 'center',
                gap: '4px',
              }}>
                <div>
                  <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>WIN RATE</span>
                  <strong style={{ fontSize: '15px', fontWeight: 900, color: '#10b981', display: 'block', marginTop: '2px' }}>
                    {trader.winRate}%
                  </strong>
                </div>
                <div>
                  <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL PROFIT</span>
                  <strong className="cth-stat-value" style={{ fontSize: '15px', fontWeight: 900, display: 'block', marginTop: '2px' }}>
                    ${trader.totalProfit.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>COPIERS</span>
                  <strong style={{ fontSize: '15px', fontWeight: 900, color: '#10b981', display: 'block', marginTop: '2px' }}>
                    {trader.copiers}
                  </strong>
                </div>
              </div>

              {/* Copy Trader Button */}
              <button
                type="button"
                onClick={() => {
                  if (isCopied) {
                    const el = document.getElementById('my-active-traders')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                    showNotice(`You are currently copying ${trader.name}. Manage subscription above!`)
                  } else {
                    setSelectedTrader(trader)
                  }
                }}
                style={{
                  width: '100%',
                  background: isCopied
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'linear-gradient(90deg, #ff512f, #f09819)',
                  color: isCopied ? '#10b981' : '#ffffff',
                  border: isCopied ? '1px solid #10b981' : 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: isCopied
                    ? '0 0 15px rgba(16, 185, 129, 0.2)'
                    : '0 6px 20px rgba(255, 81, 47, 0.35)',
                  transition: 'transform 0.15s ease, boxShadow 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span>✓ Active (Manage)</span>
                  </>
                ) : (
                  <span>Copy Trader</span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── COPY TRADER CONFIGURATION MODAL ──────────────────────────────── */}
      {selectedTrader && (
        <CopyTraderModal
          trader={selectedTrader}
          userBalance={userBalance}
          accountType={accountType}
          onClose={() => setSelectedTrader(null)}
          onConfirm={handleConfirmModal}
          showNotice={showNotice}
          onOpenDeposit={onOpenDeposit}
          onSwitchAccount={onSwitchAccount}
        />
      )}

      {/* ── CONFIRMATION POP-UP BANNER MODAL ─────────────────────────────── */}
      {successModal && (
        <div className="cth-modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setSuccessModal(null)}>
          <div className="cth-modal-container" style={{
            borderRadius: '24px',
            padding: '36px 28px 28px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>

            {/* Top Icon Badge */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
            }}>
              <CheckCircle2 size={36} color="#10b981" />
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                COPY TRADING ACTIVATED
              </span>
              <h2 className="cth-modal-title" style={{ fontSize: '22px', fontWeight: 900, margin: '6px 0 0' }}>
                Copy Trading Started!
              </h2>
            </div>

            <div className="cth-metrics-box" style={{
              borderRadius: '14px',
              padding: '16px 18px',
              textAlign: 'left',
              width: '100%',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px',
              }}>
                📈 Live Trade Mirroring Active ({successModal.traderName})
              </div>
              <p className="cth-modal-text" style={{
                fontSize: '12.5px',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Your capital allocation of <strong style={{ color: '#10b981' }}>${successModal.amount.toFixed(2)} USD</strong> has been reserved to automatically mirror trades executed by <strong>{successModal.traderName}</strong>.
              </p>
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '13px',
                color: '#10b981',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                📈 Projected Return Profit: +${successModal.estimatedReturn.toFixed(2)} USD
              </div>
              <div style={{
                marginTop: '6px',
                fontSize: '11.5px',
                color: '#f59e0b',
                fontWeight: 700,
              }}>
                💡 Tip: Check your balance regularly to monitor profits made!
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessModal(null)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981 0%, #00b0ff 100%)',
                color: '#030916',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              }}
            >
              Got It, Check Active Traders!
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
