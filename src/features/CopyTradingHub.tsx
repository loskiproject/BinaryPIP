import React, { useState } from 'react'
import { Users, Star, Search, CheckCircle2, X, Shield, Sparkles } from 'lucide-react'

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

export interface ActiveCopySubscription {
  traderId: string
  traderName: string
  amount: number
  profitShare: number
  startedAt: string
}

interface CopyTradingHubProps {
  userBalance: number
  userId?: string
  supabaseUrl?: string
  supabaseKey?: string
  onAllocateBalance: (amount: number) => void
  showNotice: (msg: string) => void
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
  // Handcrafted portraits
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

  // Next 180 use RandomUser male & female photo IDs (men/1.jpg to men/90.jpg, women/1.jpg to women/90.jpg)
  if (index <= 195) {
    const isMale = index % 2 === 0
    const photoNum = Math.floor((index - 15) / 2) % 90 + 1
    return `https://randomuser.me/api/portraits/${isMale ? 'men' : 'women'}/${photoNum}.jpg`
  }

  // Next 200 use UI-Avatars with unique initials & custom neon backgrounds
  if (index <= 395) {
    const bgColors = ['071326', '00e676', '00b0ff', 'ff1744', 'ffb300', '7c4dff', '00e5ff', '29b6f6', 'ab47bc', '26a69a', 'ef5350', '66bb6a']
    const bg = bgColors[index % bgColors.length]
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&size=150&bold=true&font-size=0.42`
  }

  // Remaining 145 use DiceBear custom avataaars API seed
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

    // Ensure 100% unique trader name
    if (usedNames.has(name.toLowerCase())) {
      name = `${fn} ${ln} ${idx}`
    }
    usedNames.add(name.toLowerCase())

    const risk: 'Low' | 'Medium' | 'High' = idx % 5 === 0 ? 'High' : (idx % 2 === 0 ? 'Low' : 'Medium')
    const bio = BIOS[(idx * 4 + (idx % 9)) % BIOS.length]
    const winRate = Number((82.0 + ((idx * 19) % 170) / 10).toFixed(1)) // 82.0% to 99.0%
    const totalProfit = 11000 + ((idx * 2431) % 285000) // $11,000 to $296,000
    const copiers = 30 + ((idx * 47) % 1500) // 30 to 1,530 copiers
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

  // Sort alphabetically A to Z by trader name
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

const MASTER_TRADERS_540: MasterTrader[] = generateAllTraders540()

export default function CopyTradingHub({ userBalance, userId, supabaseUrl, supabaseKey, onAllocateBalance, showNotice }: CopyTradingHubProps) {
  const [selectedTrader, setSelectedTrader] = useState<MasterTrader | null>(null)
  const [allocationAmount, setAllocationAmount] = useState('100')
  const [profitShare, setProfitShare] = useState('10')
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All')

  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveCopySubscription[]>([])
  const [successModal, setSuccessModal] = useState<{ traderName: string; amount: number } | null>(null)

  // 1. Fetch persistent copy trading subscriptions from Supabase PostgreSQL database
  React.useEffect(() => {
    const fetchDbSubscriptions = async () => {
      if (!supabaseUrl || !supabaseKey || !userId) {
        try {
          const localStr = localStorage.getItem(`binarypip_copy_subs_${userId || 'guest'}`)
          if (localStr) setActiveSubscriptions(JSON.parse(localStr))
        } catch {
          // silent
        }
        return
      }

      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/user_copy_subscriptions?user_id=eq.${userId}&status=eq.active&select=*`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
        })
        if (res.ok) {
          const rows = await res.json()
          if (Array.isArray(rows)) {
            const dbSubs: ActiveCopySubscription[] = rows.map((r: any) => ({
              traderId: String(r.trader_id),
              traderName: String(r.trader_name),
              amount: Number(r.amount),
              profitShare: Number(r.profit_share || 10),
              startedAt: new Date(r.started_at || r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }))
            setActiveSubscriptions(dbSubs)
            try {
              localStorage.setItem(`binarypip_copy_subs_${userId}`, JSON.stringify(dbSubs))
            } catch {
              // silent
            }
          }
        }
      } catch {
        // silent
      }
    }

    void fetchDbSubscriptions()
  }, [userId, supabaseUrl, supabaseKey])

  const filteredTraders = MASTER_TRADERS_540.filter(trader => {
    const matchesSearch = trader.name.toLowerCase().includes(search.toLowerCase()) ||
                          trader.bio.toLowerCase().includes(search.toLowerCase()) ||
                          trader.specialty.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = riskFilter === 'All' || trader.risk === riskFilter
    return matchesSearch && matchesRisk
  })

  const handleStartCopying = () => {
    if (!selectedTrader) return
    const amt = parseFloat(allocationAmount)
    if (!amt || isNaN(amt) || amt < 10) {
      showNotice('Minimum capital allocation to copy trade is $10.00 USD.')
      return
    }
    if (amt > userBalance) {
      showNotice(`Insufficient total balance ($${userBalance.toFixed(2)} USD available). Lower your allocation amount or deposit funds.`)
      return
    }

    // Deduct allocation from user total balance
    onAllocateBalance(amt)

    // Record subscription locally & in Supabase PostgreSQL
    const newSub: ActiveCopySubscription = {
      traderId: selectedTrader.id,
      traderName: selectedTrader.name,
      amount: amt,
      profitShare: parseFloat(profitShare) || 10,
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updated = [newSub, ...activeSubscriptions.filter(s => s.traderId !== newSub.traderId)]
    setActiveSubscriptions(updated)

    try {
      localStorage.setItem(`binarypip_copy_subs_${userId || 'guest'}`, JSON.stringify(updated))
    } catch {
      // silent
    }

    // Save permanently to Supabase Database
    if (supabaseUrl && supabaseKey && userId) {
      try {
        void fetch(`${supabaseUrl}/rest/v1/user_copy_subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: userId,
            trader_id: selectedTrader.id,
            trader_name: selectedTrader.name,
            amount: amt,
            profit_share: parseFloat(profitShare) || 10,
            status: 'active',
            started_at: new Date().toISOString(),
          }),
        })
      } catch {
        // silent
      }
    }

    const traderName = selectedTrader.name
    setSelectedTrader(null)

    // Show Confirmation Pop-Up Banner
    setSuccessModal({
      traderName,
      amount: amt,
    })
  }

  const handleStopCopying = (sub: ActiveCopySubscription) => {
    // Refund allocated balance back to main balance
    onAllocateBalance(-sub.amount)
    const updated = activeSubscriptions.filter(s => s.traderId !== sub.traderId)
    setActiveSubscriptions(updated)

    try {
      localStorage.setItem(`binarypip_copy_subs_${userId || 'guest'}`, JSON.stringify(updated))
    } catch {
      // silent
    }

    // Update status to 'stopped' in Supabase PostgreSQL Database
    if (supabaseUrl && supabaseKey && userId) {
      try {
        void fetch(`${supabaseUrl}/rest/v1/user_copy_subscriptions?user_id=eq.${userId}&trader_id=eq.${sub.traderId}&status=eq.active`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            status: 'stopped',
            stopped_at: new Date().toISOString(),
          }),
        })
      } catch {
        // silent
      }
    }

    showNotice(`Stopped copying ${sub.traderName}. $${sub.amount.toFixed(2)} capital returned to your balance.`)
  }

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(7, 19, 38, 0.95) 0%, rgba(3, 9, 22, 0.98) 100%)',
        border: '1px solid rgba(0, 230, 118, 0.25)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 230, 118, 0.1)',
        borderRadius: '20px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={26} color="#00e676" />
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
            Copy Trading Hub
          </h1>
        </div>
        <p style={{ fontSize: '13.5px', color: '#a0aec0', margin: 0, lineHeight: 1.5 }}>
          Automatically mirror trades from top-performing professional master traders into your account in real time.
        </p>
      </div>

      {/* ── ACTIVE COPY SUBSCRIPTIONS BANNER (IF ANY) ────────────────────── */}
      {activeSubscriptions.length > 0 && (
        <div style={{
          background: 'rgba(0, 230, 118, 0.08)',
          border: '1px solid rgba(0, 230, 118, 0.35)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00e676', fontWeight: 800, fontSize: '14px' }}>
              <Sparkles size={18} />
              <span>Active Copying Mirror ({activeSubscriptions.length})</span>
            </div>
            <span style={{ fontSize: '12px', color: '#a0aec0' }}>Checking balance for real-time profits made</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {activeSubscriptions.map(sub => (
              <div key={sub.traderId} style={{
                background: '#071326',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '14px', display: 'block' }}>{sub.traderName}</strong>
                  <span style={{ fontSize: '12px', color: '#00e676', fontWeight: 700 }}>Allocated: ${sub.amount.toFixed(2)} USD</span>
                  <span style={{ fontSize: '11px', color: '#a0aec0', display: 'block', marginTop: '2px' }}>Started at {sub.startedAt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStopCopying(sub)}
                  style={{
                    background: 'rgba(255, 23, 68, 0.15)',
                    border: '1px solid rgba(255, 23, 68, 0.4)',
                    color: '#ff1744',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Stop &amp; Release
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH & RISK FILTER ROW ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={20} color="#ffd700" fill="#ffd700" />
          <span>Top Master Traders ({MASTER_TRADERS_540.length} Available · A to Z)</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '220px',
          }}>
            <Search size={15} color="#a0aec0" />
            <input
              type="text"
              placeholder="Search trader or strategy..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {/* Risk Filters */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '3px' }}>
            {(['All', 'Low', 'Medium', 'High'] as const).map(rf => (
              <button
                key={rf}
                type="button"
                onClick={() => setRiskFilter(rf)}
                style={{
                  background: riskFilter === rf ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
                  color: riskFilter === rf ? '#00e676' : '#a0aec0',
                  border: riskFilter === rf ? '1px solid rgba(0, 230, 118, 0.4)' : 'none',
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
          const isCopied = activeSubscriptions.some(s => s.traderId === trader.id)
          const riskColor = trader.risk === 'Low' ? '#00e676' : trader.risk === 'Medium' ? '#ffb300' : '#ff1744'

          return (
            <div
              key={trader.id}
              style={{
                background: '#071326',
                border: isCopied ? '1.5px solid #00e676' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isCopied ? '0 0 20px rgba(0, 230, 118, 0.25)' : '0 10px 25px rgba(0, 0, 0, 0.5)',
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
                  <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.2px' }}>
                    {trader.name}
                  </h3>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: riskColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={12} color={riskColor} />
                    Risk: {trader.risk}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p style={{ fontSize: '12.5px', color: '#a0aec0', lineHeight: 1.45, margin: 0, minHeight: '36px' }}>
                {trader.bio}
              </p>

              {/* Stats Box */}
              <div style={{
                background: 'rgba(3, 20, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                textAlign: 'center',
                gap: '4px',
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#718096', textTransform: 'uppercase' }}>WIN RATE</span>
                  <strong style={{ fontSize: '15px', fontWeight: 900, color: '#00e676', display: 'block', marginTop: '2px' }}>
                    {trader.winRate}%
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#718096', textTransform: 'uppercase' }}>TOTAL PROFIT</span>
                  <strong style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '2px' }}>
                    ${trader.totalProfit.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#718096', textTransform: 'uppercase' }}>COPIERS</span>
                  <strong style={{ fontSize: '15px', fontWeight: 900, color: '#00e676', display: 'block', marginTop: '2px' }}>
                    {trader.copiers}
                  </strong>
                </div>
              </div>

              {/* Red-to-Yellow Gradient Copy Trader Button (Matches User Screenshot) */}
              <button
                type="button"
                onClick={() => setSelectedTrader(trader)}
                style={{
                  width: '100%',
                  background: isCopied
                    ? 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)'
                    : 'linear-gradient(135deg, #ff1744 0%, #ffea00 100%)',
                  color: '#030916',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: isCopied
                    ? '0 6px 20px rgba(0, 230, 118, 0.4)'
                    : '0 6px 20px rgba(255, 23, 68, 0.4)',
                  transition: 'transform 0.15s ease, boxShadow 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 size={16} color="#030916" />
                    <span>Copying ({trader.name})</span>
                  </>
                ) : (
                  <span>Copy Trader</span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── ALLOCATION MODAL (MATCHES USER SCREENSHOT 2) ────────────────── */}
      {selectedTrader && (
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
        }} onClick={() => setSelectedTrader(null)}>
          <div style={{
            background: '#071326',
            border: '1px solid rgba(0, 230, 118, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 230, 118, 0.2)',
            borderRadius: '20px',
            padding: '32px 26px 24px',
            maxWidth: '410px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedTrader(null)}
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

            {/* Modal Title */}
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                Copy {selectedTrader.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#a0aec0', margin: '6px 0 0', lineHeight: 1.4 }}>
                Set your capital allocation and profit share to start copying trades automatically.
              </p>
            </div>

            {/* Form Fields */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                  ALLOCATION AMOUNT ($) [MIN $10.00]
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={allocationAmount}
                    onChange={e => setAllocationAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(3, 20, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '13px 14px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#00e676', marginTop: '4px', display: 'block' }}>
                  Available Balance: ${userBalance.toFixed(2)} USD
                </span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                  PROFIT SHARE PERCENTAGE (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={profitShare}
                  onChange={e => setProfitShare(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(3, 20, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '13px 14px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Modal Buttons */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleStartCopying}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #ff1744 0%, #ffea00 100%)',
                  color: '#030916',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 8px 22px rgba(255, 23, 68, 0.4)',
                }}
              >
                Confirm &amp; Start Copying
              </button>

              <button
                type="button"
                onClick={() => setSelectedTrader(null)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION POP-UP BANNER MODAL ─────────────────────────────── */}
      {successModal && (
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
        }} onClick={() => setSuccessModal(null)}>
          <div style={{
            background: '#071326',
            border: '1px solid rgba(0, 230, 118, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 230, 118, 0.25)',
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
                COPY TRADING ACTIVATED
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: '6px 0 0' }}>
                Copy Trading Started!
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
                📈 Live Trade Mirroring Active ({successModal.traderName})
              </div>
              <p style={{
                fontSize: '12.5px',
                color: '#e2e8f0',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Your capital allocation of <strong style={{ color: '#00e676' }}>${successModal.amount.toFixed(2)} USD</strong> has been reserved to automatically mirror trades executed by <strong>{successModal.traderName}</strong>.
              </p>
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '12px',
                color: '#ffd700',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                💡 Tip: Check your balance regularly to monitor profits made!
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessModal(null)}
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
              Got It, Check Balance!
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
