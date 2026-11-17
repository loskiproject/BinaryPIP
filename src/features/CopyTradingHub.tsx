import React, { useState, useEffect } from 'react'
import { Users, Star, Search, CheckCircle2, Shield, Award, AlertCircle, AlertTriangle, X, Wallet, Sparkles } from 'lucide-react'
import { useCopyTrading } from './useCopyTrading'
import MyActiveTraders from './MyActiveTraders'
import CopyTraderModal from './CopyTraderModal'
import { supabase } from '../lib/supabase'

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
  isVerified: boolean
}

interface CopyTradingHubProps {
  userBalance: number
  userId?: string
  supabaseUrl?: string
  supabaseKey?: string
  accountType?: 'none' | 'real' | 'demo' | 'live'
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

// Handcrafted Top Featured Master Traders (PipMaster is verified)
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
    specialty: 'Kenya FX & Synthetic Indices',
    isVerified: true,
  },
  { id: 'mt-1', name: 'Sylvia FX', risk: 'Low', bio: 'Professional forex trader with 8+ years experience specializing in EUR/USD and GBP/USD scalping.', winRate: 98.4, totalProfit: 90450, copiers: 590, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', specialty: 'EUR/USD & Scalping', isVerified: true },
  { id: 'mt-2', name: 'Elena Rostova', risk: 'Medium', bio: 'Gold & Commodities specialist. Consistent daily returns with strict risk management.', winRate: 88.7, totalProfit: 24101, copiers: 86, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', specialty: 'Gold & Commodities', isVerified: true },
  { id: 'mt-3', name: 'Marcus Chen', risk: 'Low', bio: 'Cryptocurrency and Global Index momentum trader. Low drawdown and high profitability.', winRate: 95.1, totalProfit: 52900, copiers: 220, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialty: 'Crypto & Indices', isVerified: true },
  { id: 'mt-4', name: 'Victor Sterling', risk: 'Low', bio: 'Institutional swing trader focusing on High-Yield Synthetic Indices and Volatility 100.', winRate: 96.2, totalProfit: 142000, copiers: 840, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'Volatility Indices', isVerified: true },
  { id: 'mt-5', name: 'Amina Al-Mansoor', risk: 'Medium', bio: 'FX Trend Follower & Volatility Specialist. 6+ years of verified high-win-rate algorithm trading.', winRate: 92.5, totalProfit: 68400, copiers: 310, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'FX Trends & Algos', isVerified: true },
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

// Generate Exactly 540 Master Traders (Exacting 70 Traders Verified, including PipMaster)
const generateAllTraders540 = (): MasterTrader[] => {
  const list: MasterTrader[] = [...INITIAL_HANDCRAFTED]
  const usedNames = new Set<string>(INITIAL_HANDCRAFTED.map(t => t.name.toLowerCase()))

  // 6 initial handcrafted verified traders + 64 generated verified traders = EXACTLY 70 VERIFIED TRADERS
  let verifiedCounter = INITIAL_HANDCRAFTED.filter(t => t.isVerified).length // 6

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

    // Set exactly 70 verified traders across the 540 list
    let isVerified = false
    if (verifiedCounter < 70 && (idx % 8 === 0 || list.length + (70 - verifiedCounter) >= 540)) {
      isVerified = true
      verifiedCounter++
    }

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
      isVerified,
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
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Verified' | 'Unverified'>('All')

  // Master Trader Application Modal State
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyName, setApplyName] = useState('')
  const [applyRisk, setApplyRisk] = useState<'Low' | 'Medium' | 'High'>('Low')
  const [applySpecialty, setApplySpecialty] = useState('Vol 100 & Gold Scalping')
  const [applyBio, setApplyBio] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [applySuccessModal, setApplySuccessModal] = useState<boolean>(false)

  const [dbTraders, setDbTraders] = useState<MasterTrader[]>([])
  const [userAppStatus, setUserAppStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')

  // Fetch real Master Traders & user application status from Supabase
  useEffect(() => {
    let mounted = true

    const fetchDbTraders = async () => {
      try {
        if (!supabase) return
        const { data } = await supabase
          .from('master_traders')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (mounted && Array.isArray(data) && data.length > 0) {
          const mapped: MasterTrader[] = data.map(r => ({
            id: String(r.id),
            name: String(r.display_name),
            risk: (r.risk_level || 'Low') as 'Low' | 'Medium' | 'High',
            bio: String(r.bio || 'Verified Professional Master Trader'),
            winRate: Number(r.win_rate || 92.5),
            totalProfit: Number(r.total_profit || 15000),
            copiers: Number(r.copiers_count || 12),
            avatar: String(r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
            specialty: String(r.strategy_tag || 'Vol 100 & Gold Scalping'),
            isVerified: r.is_verified !== false,
          }))
          setDbTraders(mapped)
        }
      } catch {
        // silent
      }
    }

    const fetchUserApplication = async () => {
      if (!userId || !supabase) return
      try {
        const { data } = await supabase
          .from('master_trader_applications')
          .select('status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (mounted && data) {
          setUserAppStatus(data.status as any)
        }
      } catch {
        // silent
      }
    }

    void fetchDbTraders()
    void fetchUserApplication()

    if (!supabase) return

    // Realtime subscription on master_traders & master_trader_applications
    const channel = supabase.channel('realtime_master_traders_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_traders' }, () => {
        void fetchDbTraders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_trader_applications' }, () => {
        void fetchDbTraders()
        void fetchUserApplication()
      })
      .subscribe()

    return () => {
      mounted = false
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [userId])

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

  const normAccountType = accountType === 'live' || accountType === 'real' ? 'real' : 'demo'
  const isDemo = normAccountType === 'demo'

  const allCombinedTraders = [...dbTraders, ...MASTER_TRADERS_540.filter(gt => !dbTraders.some(dt => dt.id === gt.id))]

  const filteredTraders = allCombinedTraders.filter(trader => {
    const matchesSearch = trader.name.toLowerCase().includes(search.toLowerCase()) ||
                          trader.bio.toLowerCase().includes(search.toLowerCase()) ||
                          trader.specialty.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = riskFilter === 'All' || trader.risk === riskFilter
    const matchesVerification = verificationFilter === 'All' ||
      (verificationFilter === 'Verified' && trader.isVerified) ||
      (verificationFilter === 'Unverified' && !trader.isVerified)

    return matchesSearch && matchesRisk && matchesVerification
  })

  const verifiedCount = allCombinedTraders.filter(t => t.isVerified).length

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

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isDemo) {
      showNotice('Master Trader Application ($500 fee) requires an active Real Account balance. Please switch to your Real Account.')
      return
    }

    if (userBalance < 500) {
      showNotice('Insufficient Real Account Balance. Minimum $500.00 USD required to apply as a Master Trader.')
      return
    }

    if (!applyName.trim()) {
      showNotice('Please enter your Trader Display Name.')
      return
    }

    if (!applyBio.trim()) {
      showNotice('Please enter your Trading Strategy Bio.')
      return
    }

    try {
      setIsApplying(true)

      const isValidUuid = (str?: string): boolean =>
        typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

      let targetUserId = userId
      if (!targetUserId || !isValidUuid(targetUserId)) {
        targetUserId = localStorage.getItem('binarypip_persistent_client_uuid') || undefined
      }
      if (!targetUserId || !isValidUuid(targetUserId)) {
        const part1 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
        const part2 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
        const part3 = '4' + Math.floor(Math.random() * 0x0fff).toString(16).padStart(3, '0')
        const part4 = ((Math.floor(Math.random() * 0x3fff) | 0x8000)).toString(16)
        const part5 = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')
        targetUserId = `${part1}-${part2}-${part3}-${part4}-${part5}`
        localStorage.setItem('binarypip_persistent_client_uuid', targetUserId)
      }

      const p1 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
      const p2 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
      const p3 = '4' + Math.floor(Math.random() * 0x0fff).toString(16).padStart(3, '0')
      const p4 = ((Math.floor(Math.random() * 0x3fff) | 0x8000)).toString(16)
      const p5 = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')
      const appId = `${p1}-${p2}-${p3}-${p4}-${p5}`

      const newApp = {
        id: appId,
        user_id: targetUserId,
        display_name: applyName.trim(),
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        risk_level: applyRisk,
        strategy_tag: applySpecialty.trim() || 'Vol 100 & Gold Scalping',
        bio: applyBio.trim(),
        application_fee: 500.00,
        status: 'pending',
      }

      // 1. Insert into Supabase master_trader_applications table
      if (supabase) {
        try {
          await supabase.from('master_trader_applications').insert(newApp)
        } catch {
          // silent
        }
      }

      // 2. Save into local pending applications storage for instant cross-tab sync
      try {
        const localStr = localStorage.getItem('binarypip_master_trader_apps')
        const localQueue = localStr ? JSON.parse(localStr) : []
        localQueue.unshift({
          id: appId,
          userId: targetUserId,
          userName: applyName.trim(),
          userEmail: 'client@binarypip.com',
          displayName: applyName.trim(),
          avatarUrl: newApp.avatar_url,
          riskLevel: applyRisk,
          strategyTag: newApp.strategy_tag,
          bio: applyBio.trim(),
          fee: 500.00,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        localStorage.setItem('binarypip_master_trader_apps', JSON.stringify(localQueue.slice(0, 50)))
      } catch {
        // silent
      }

      // 3. Broadcast real-time message events for instant admin UI update
      window.dispatchEvent(new Event('storage'))
      window.postMessage({ type: 'EXSTRADE_TRANSACTION_SUBMITTED' }, '*')

      onAllocateBalance(500) // Deduct $500 USD application fee
      setUserAppStatus('pending')
      setIsApplying(false)
      setShowApplyModal(false)
      setApplySuccessModal(true)
      setApplyName('')
      setApplyBio('')
    } catch {
      showNotice('An error occurred submitting your Master Trader Application.')
      setIsApplying(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── HEADER BANNER WITH APPLY AS COPY TRADER ($500) CTA ────────────── */}
      <div className="cth-header-banner" style={{
        borderRadius: '20px',
        padding: '28px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '620px' }}>
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

        {/* Apply as Copy Trader ($500) CTA Button */}
        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #00e5ff 100%)',
            color: '#030916',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.15s ease, boxShadow 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Award size={18} color="#030916" />
          <span>Apply as Master Trader ($500)</span>
        </button>
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

      {/* ── SEARCH & VERIFICATION FILTER CONTROLS ROW ───────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="cth-section-heading" style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={20} color="#f59e0b" fill="#f59e0b" />
          <span>Top Master Traders ({filteredTraders.length} Shown · {verifiedCount} Verified)</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="cth-search-box" style={{
            borderRadius: '12px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '200px',
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

          {/* Verification Status Filter Group */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '3px' }}>
            {(['All', 'Verified', 'Unverified'] as const).map(vf => (
              <button
                key={vf}
                type="button"
                onClick={() => setVerificationFilter(vf)}
                className={verificationFilter === vf ? 'cth-filter-btn-active' : 'cth-filter-btn'}
                style={{
                  borderRadius: '9px',
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  color: verificationFilter === vf ? (vf === 'Verified' ? '#10b981' : undefined) : undefined,
                }}
              >
                {vf === 'Verified' && '✓ '}
                {vf}
              </button>
            ))}
          </div>

          {/* Risk Level Filter Group */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '3px' }}>
            {(['All', 'Low', 'Medium', 'High'] as const).map(rf => (
              <button
                key={rf}
                type="button"
                onClick={() => setRiskFilter(rf)}
                className={riskFilter === rf ? 'cth-filter-btn-active' : 'cth-filter-btn'}
                style={{
                  borderRadius: '9px',
                  padding: '6px 10px',
                  fontSize: '11.5px',
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

      {/* ── MASTER TRADERS GRID (CARDS WITH VERIFICATION BADGES) ────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
        {filteredTraders.map(trader => {
          const isCopied = subscriptions.some(s => {
            const sType = s.account_type
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
                    border: `2px solid ${trader.isVerified ? '#10b981' : riskColor}`,
                    boxShadow: trader.isVerified ? '0 0 14px rgba(16, 185, 129, 0.45)' : `0 0 12px ${riskColor}40`,
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 className="cth-trader-name" style={{ fontSize: '17px', fontWeight: 900, margin: 0, letterSpacing: '-0.2px' }}>
                      {trader.name}
                    </h3>

                    {/* Verification Badge */}
                    {trader.isVerified ? (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          padding: '2px 7px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Verified Master Trader"
                      >
                        <Shield size={10} color="#10b981" /> Verified
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: '#94a3b8',
                          background: 'rgba(148, 163, 184, 0.1)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          padding: '2px 7px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Unverified Trader"
                      >
                        <AlertCircle size={10} color="#94a3b8" /> Unverified
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 800, color: riskColor, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={12} color={riskColor} />
                    Risk: {trader.risk} · <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{trader.specialty}</span>
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

      {/* ── APPLY AS MASTER TRADER ($500) MODAL DIALOG ──────────────────── */}
      {showApplyModal && (
        <div
          className="cth-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onClick={() => setShowApplyModal(false)}
        >
          <div
            className="cth-modal-container"
            style={{
              borderRadius: '24px',
              padding: '28px 24px 24px',
              maxWidth: '480px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
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

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingRight: '36px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={28} color="#10b981" />
              </div>
              <div>
                <h2 className="cth-modal-title" style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.2px' }}>
                  Apply as Master Trader ($500)
                </h2>
                <span className="cth-sub" style={{ fontSize: '12px', marginTop: '2px', display: 'block' }}>
                  Publish your trading strategy &amp; earn copy fees
                </span>
              </div>
            </div>

            {/* Required Application Fee Box */}
            <div
              className="cth-metrics-box"
              style={{
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>APPLICATION &amp; VERIFICATION FEE</span>
                <strong style={{ fontSize: '16px', fontWeight: 900, color: '#10b981' }}>$500.00 USD</strong>
              </div>
              <p className="cth-modal-text" style={{ fontSize: '11.5px', margin: 0, lineHeight: 1.4 }}>
                Fee is deducted from your active <strong>Real Account balance</strong> upon submission.
              </p>
            </div>

            {/* Active Real Account Balance Display */}
            <div
              style={{
                background: isDemo ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${isDemo ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={16} color={isDemo ? '#f59e0b' : '#10b981'} />
                <span className="cth-modal-title" style={{ fontSize: '12px', fontWeight: 800 }}>
                  Active Account: <strong style={{ color: isDemo ? '#f59e0b' : '#10b981' }}>{isDemo ? 'Demo Account' : 'Real Account'}</strong>
                </span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 900, color: isDemo ? '#f59e0b' : '#10b981' }}>
                ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>

            {/* Balance Validation Alert */}
            {(isDemo || userBalance < 500) && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#ef4444', display: 'block' }}>
                      {isDemo ? 'Real Account Required' : 'Insufficient Real Balance ($' + userBalance.toFixed(2) + ' USD)'}
                    </strong>
                    <p className="cth-modal-text" style={{ fontSize: '12px', margin: '3px 0 0', lineHeight: 1.4 }}>
                      {isDemo
                        ? 'Master Trader Application requires a Real Account with at least $500.00 USD balance.'
                        : 'You need at least $500.00 USD in your Real Account to pay the application and verification fee.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  {onOpenDeposit && (
                    <button
                      type="button"
                      onClick={() => { setShowApplyModal(false); onOpenDeposit() }}
                      style={{
                        flex: 1,
                        background: '#10b981',
                        color: '#0b0e14',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Deposit Funds 💳
                    </button>
                  )}
                  {isDemo && onSwitchAccount && (
                    <button
                      type="button"
                      onClick={() => { setShowApplyModal(false); onSwitchAccount() }}
                      style={{
                        flex: 1,
                        background: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid #f59e0b',
                        color: '#f59e0b',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Switch to Real Account ⚡
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Trader Name */}
              <div>
                <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Trader Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trader Pro FX"
                  value={applyName}
                  onChange={e => setApplyName(e.target.value)}
                  disabled={isDemo || userBalance < 500}
                  className="cth-input"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    fontSize: '14px',
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Risk Level Selector */}
              <div>
                <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Risk Profile Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {(['Low', 'Medium', 'High'] as const).map(rk => (
                    <button
                      key={rk}
                      type="button"
                      disabled={isDemo || userBalance < 500}
                      onClick={() => setApplyRisk(rk)}
                      className={applyRisk === rk ? 'cth-filter-btn-active' : 'cth-pill-btn'}
                      style={{
                        borderRadius: '8px',
                        padding: '8px 4px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: (isDemo || userBalance < 500) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {rk} Risk
                    </button>
                  ))}
                </div>
              </div>

              {/* Trading Specialty */}
              <div>
                <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Trading Specialty Focus
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kenya FX & Volatility 100"
                  value={applySpecialty}
                  onChange={e => setApplySpecialty(e.target.value)}
                  disabled={isDemo || userBalance < 500}
                  className="cth-input"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Strategy Bio */}
              <div>
                <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Trading Strategy Bio &amp; Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your trading strategy, risk management, and experience..."
                  value={applyBio}
                  onChange={e => setApplyBio(e.target.value)}
                  disabled={isDemo || userBalance < 500}
                  className="cth-input"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none',
                    lineHeight: 1.4,
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={isDemo || userBalance < 500 || isApplying}
                  style={{
                    width: '100%',
                    background: (isDemo || userBalance < 500)
                      ? 'rgba(148, 163, 184, 0.2)'
                      : 'linear-gradient(90deg, #10b981, #00e5ff)',
                    color: (isDemo || userBalance < 500) ? '#64748b' : '#030916',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: 900,
                    cursor: (isDemo || userBalance < 500 || isApplying) ? 'not-allowed' : 'pointer',
                    boxShadow: (isDemo || userBalance < 500) ? 'none' : '0 8px 24px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isApplying ? 'Submitting Application...' : 'Submit Application & Pay $500 Fee'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="cth-cancel-btn"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '11px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── APPLICATION SUCCESS CONFIRMATION MODAL ─────────────────────── */}
      {applySuccessModal && (
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
        }} onClick={() => setApplySuccessModal(false)}>
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
              <Award size={36} color="#10b981" />
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                APPLICATION RECEIVED
              </span>
              <h2 className="cth-modal-title" style={{ fontSize: '22px', fontWeight: 900, margin: '6px 0 0' }}>
                Master Trader Application Submitted!
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
                🎉 Verification Under Review ($500 Fee Settled)
              </div>
              <p className="cth-modal-text" style={{
                fontSize: '12.5px',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Your application fee of <strong style={{ color: '#10b981' }}>$500.00 USD</strong> has been received and processed. Our compliance team is verifying your strategy metrics.
              </p>
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '12px',
                color: '#00e5ff',
                fontWeight: 700,
              }}>
                💡 Status: PENDING VERIFICATION · Estimated Review: 24 Hours
              </div>
            </div>

            <button
              type="button"
              onClick={() => setApplySuccessModal(false)}
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
              Done, Return to Hub
            </button>
          </div>
        </div>
      )}

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
