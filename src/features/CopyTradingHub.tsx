import React, { useState } from 'react'
import { Users, Star, Search, CheckCircle2, X, Shield, ArrowUpRight, Sparkles, Filter } from 'lucide-react'

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
  onAllocateBalance: (amount: number) => void
  showNotice: (msg: string) => void
}

// 50 Master Traders Dataset
const MASTER_TRADERS: MasterTrader[] = [
  { id: 'mt-1', name: 'Sylvia FX', risk: 'Low', bio: 'Professional forex trader with 8+ years experience specializing in EUR/USD and GBP/USD scalping.', winRate: 98.4, totalProfit: 90450, copiers: 590, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', specialty: 'EUR/USD & Scalping' },
  { id: 'mt-2', name: 'Elena Rostova', risk: 'Medium', bio: 'Gold & Commodities specialist. Consistent daily returns with strict risk management.', winRate: 88.7, totalProfit: 24101, copiers: 86, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', specialty: 'Gold & Commodities' },
  { id: 'mt-3', name: 'Marcus Chen', risk: 'Low', bio: 'Cryptocurrency and Global Index momentum trader. Low drawdown and high profitability.', winRate: 95.1, totalProfit: 52900, copiers: 220, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialty: 'Crypto & Indices' },
  { id: 'mt-4', name: 'Victor Sterling', risk: 'Low', bio: 'Institutional swing trader focusing on High-Yield Synthetic Indices and Volatility 100.', winRate: 96.2, totalProfit: 142000, copiers: 840, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'Volatility Indices' },
  { id: 'mt-5', name: 'Amina Al-Mansoor', risk: 'Medium', bio: 'FX Trend Follower & Volatility Specialist. 6+ years of verified high-win-rate algorithm trading.', winRate: 92.5, totalProfit: 68400, copiers: 310, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'FX Trends & Algos' },
  { id: 'mt-6', name: 'Dmitri Volkov', risk: 'High', bio: 'High-frequency breakout trader on NASDAQ & Crash/Boom Synthetic Index markets.', winRate: 89.1, totalProfit: 185000, copiers: 920, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', specialty: 'NASDAQ Breakouts' },
  { id: 'mt-7', name: 'Sarah Jenkins', risk: 'Low', bio: 'Conservatively managed portfolio with strict 1% risk per trade rule. Ideal for passive income.', winRate: 97.8, totalProfit: 78900, copiers: 450, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', specialty: 'Low Drawdown' },
  { id: 'mt-8', name: 'Kenji Takahashi', risk: 'Low', bio: 'Asian Session specialist trading JPY crosses and Asian Indices with 94%+ win accuracy.', winRate: 94.6, totalProfit: 61200, copiers: 280, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', specialty: 'JPY Crosses' },
  { id: 'mt-9', name: 'Carlos Mendez', risk: 'Medium', bio: 'Commodities and Oil Futures scalper. High-volume intraday profits with tight stop losses.', winRate: 91.3, totalProfit: 43800, copiers: 195, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', specialty: 'Crude Oil & Metals' },
  { id: 'mt-10', name: 'Hannah Schmidt', risk: 'Low', bio: 'European Central Bank news trader and EUR/GBP Range trader.', winRate: 96.9, totalProfit: 89000, copiers: 512, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', specialty: 'Euro Crosses' },
  { id: 'mt-11', name: 'Lucas Rossi', risk: 'Medium', bio: 'Smart Money Concepts (SMC) institutional order block trader on XAU/USD and Volatility 75.', winRate: 93.4, totalProfit: 112000, copiers: 630, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', specialty: 'SMC Order Blocks' },
  { id: 'mt-12', name: 'Priya Sharma', risk: 'Low', bio: 'Quantitative trader utilizing statistical arbitrage across Major Forex pairs.', winRate: 98.1, totalProfit: 95400, copiers: 480, avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', specialty: 'Quant Arbitrage' },
  { id: 'mt-13', name: 'Alexander Novak', risk: 'High', bio: 'Aggressive growth strategy targeting high risk-reward setups on Crypto & Volatility 25 (1s).', winRate: 87.9, totalProfit: 210000, copiers: 1100, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'High Leverage Growth' },
  { id: 'mt-14', name: 'Isabella Silva', risk: 'Low', bio: 'Price Action & Market Structure specialist. Zero martingale, pure risk management.', winRate: 96.5, totalProfit: 54100, copiers: 320, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'Pure Price Action' },
  { id: 'mt-15', name: 'David O\'Connor', risk: 'Medium', bio: 'London Session breakout trading on GBP pairs and FTSE 100.', winRate: 90.8, totalProfit: 38900, copiers: 175, avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', specialty: 'London Breakouts' },
  { id: 'mt-16', name: 'Zoe Kravitz', risk: 'Low', bio: 'Macroeconomic news trader and Interest Rate Differential specialist.', winRate: 95.8, totalProfit: 81200, copiers: 410, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', specialty: 'Macro Fundamentals' },
  { id: 'mt-17', name: 'Tariq Hassan', risk: 'Medium', bio: 'Middle East & Gulf Market Specialist trading Crude Oil and Gold spot markets.', winRate: 92.1, totalProfit: 73500, copiers: 295, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', specialty: 'Oil & Spot Gold' },
  { id: 'mt-18', name: 'Chloë Laurent', risk: 'Low', bio: 'Paris-based institutional trader focusing on EUR/USD micro-scalps.', winRate: 97.2, totalProfit: 66800, copiers: 360, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', specialty: 'Micro Scalping' },
  { id: 'mt-19', name: 'Gideon Mutua', risk: 'Low', bio: 'Top African Master Trader specializing in M-Pesa automated synthetic indices mirror trading.', winRate: 98.9, totalProfit: 156000, copiers: 980, avatar: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80', specialty: 'Synthetic Multipliers' },
  { id: 'mt-20', name: 'Arthur Pendelton', risk: 'Medium', bio: 'Wall Street veteran applying algorithmic VWAP strategies to S&P 500 and Dow Jones.', winRate: 93.9, totalProfit: 189000, copiers: 870, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', specialty: 'US Equity Indices' },
  { id: 'mt-21', name: 'Mei-Ling Zhou', risk: 'Low', bio: 'Hong Kong FX quantitative analyst trading AUD/USD and NZD/USD currency correlations.', winRate: 96.1, totalProfit: 58400, copiers: 260, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', specialty: 'FX Correlations' },
  { id: 'mt-22', name: 'Mateo Garcia', risk: 'High', bio: 'Crypto momentum scalper targeting BTC & ETH 100x setups.', winRate: 88.4, totalProfit: 165000, copiers: 790, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialty: 'Crypto Scalper' },
  { id: 'mt-23', name: 'Nadia Petrov', risk: 'Low', bio: 'Low volatility swing trader focusing on USD/CHF and EUR/CHF stability.', winRate: 97.5, totalProfit: 47800, copiers: 210, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', specialty: 'CHF Safe Haven' },
  { id: 'mt-24', name: 'Liam Gallagher', risk: 'Medium', bio: 'UK High Beta Forex pairs and GBP/JPY Volatility specialist.', winRate: 91.8, totalProfit: 83200, copiers: 420, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'GBP/JPY Dragon' },
  { id: 'mt-25', name: 'Yuki Tanaka', risk: 'Low', bio: 'Tokyo session FX robot developer with 12 months verified positive growth.', winRate: 96.7, totalProfit: 71900, copiers: 390, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', specialty: 'Automated Bot' },
  { id: 'mt-26', name: 'Fatima Al-Zahra', risk: 'Low', bio: 'Islamic Sharia-compliant swap-free Master Trader specializing in Gold & Silver.', winRate: 98.2, totalProfit: 104000, copiers: 610, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'Halal Swap-Free' },
  { id: 'mt-27', name: 'Sven Lindqvist', risk: 'Medium', bio: 'Nordic Markets and EUR/SEK trend reversal specialist.', winRate: 92.8, totalProfit: 39500, copiers: 160, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', specialty: 'Exotic FX Pairs' },
  { id: 'mt-28', name: 'Olumide Adebayo', risk: 'Low', bio: 'Leading African Synthetic Index trader with emphasis on Volatility 50 and Jump Indices.', winRate: 97.1, totalProfit: 128000, copiers: 750, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', specialty: 'Volatility 50' },
  { id: 'mt-29', name: 'Camila Rodriguez', risk: 'Medium', bio: 'Latin American Forex & Commodities trend trader.', winRate: 91.0, totalProfit: 46200, copiers: 230, avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', specialty: 'Emerging FX' },
  { id: 'mt-30', name: 'Viktor Krum', risk: 'High', bio: 'High leverage scalping on Crash 500 and Boom 1000 spike detection.', winRate: 89.6, totalProfit: 198000, copiers: 1050, avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', specialty: 'Crash/Boom Spikes' },
  { id: 'mt-31', name: 'Elena Gomez', risk: 'Low', bio: 'Daily pivot points and Fibonacci Retracement master trader.', winRate: 96.4, totalProfit: 62500, copiers: 340, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', specialty: 'Fibo Retracements' },
  { id: 'mt-32', name: 'Benjamin Hayes', risk: 'Low', bio: 'US Dollar Index (DXY) correlation trader covering EUR, GBP, and Gold.', winRate: 95.3, totalProfit: 87400, copiers: 460, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialty: 'DXY Correlations' },
  { id: 'mt-33', name: 'Aarav Patel', risk: 'Medium', bio: 'Nifty & Global Indices momentum trader with strict capital reservation rules.', winRate: 93.1, totalProfit: 51200, copiers: 280, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', specialty: 'Global Indices' },
  { id: 'mt-34', name: 'Freja Nielsen', risk: 'Low', bio: 'Copenhagen-based risk-free hedging specialist across major currencies.', winRate: 98.6, totalProfit: 74100, copiers: 380, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', specialty: 'Hedging Strategies' },
  { id: 'mt-35', name: 'Jackson Miller', risk: 'Medium', bio: 'US Session NFP and FOMC news event scalper.', winRate: 91.5, totalProfit: 93800, copiers: 520, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'FOMC News FX' },
  { id: 'mt-36', name: 'Kwang-Sun Park', risk: 'Low', bio: 'Seoul Tech Algos & Automated Grid trading on Volatility 10 (1s).', winRate: 97.4, totalProfit: 108000, copiers: 670, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', specialty: 'Vol 10 Grid Bot' },
  { id: 'mt-37', name: 'Amara Okafor', risk: 'Low', bio: 'Multi-Asset Master Trader with 500+ satisfied copiers across Africa and Europe.', winRate: 96.8, totalProfit: 119000, copiers: 710, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'Multi-Asset Focus' },
  { id: 'mt-38', name: 'Dante Moretti', risk: 'High', bio: 'Aggressive crypto altcoin breakouts and leverage trading.', winRate: 88.9, totalProfit: 172000, copiers: 830, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', specialty: 'Crypto Breakouts' },
  { id: 'mt-39', name: 'Sophie Martin', risk: 'Low', bio: 'Swiss private bank trained portfolio manager targeting steady 15% monthly growth.', winRate: 98.3, totalProfit: 135000, copiers: 890, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', specialty: 'Steady Growth' },
  { id: 'mt-40', name: 'Gabriel Santos', risk: 'Medium', bio: 'Brazilian FX scalper focusing on USD/BRL and EUR/USD volatility.', winRate: 92.3, totalProfit: 48900, copiers: 240, avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', specialty: 'Intraday FX' },
  { id: 'mt-41', name: 'Astrid Eriksen', risk: 'Low', bio: 'Algorithmic trend trader on German DAX 40 and European equities.', winRate: 96.3, totalProfit: 82100, copiers: 430, avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', specialty: 'DAX 40 Trends' },
  { id: 'mt-42', name: 'Hassan Mahmoud', risk: 'Low', bio: 'Dubai Gold Exchange specialist with verified 97%+ win rate on XAU/USD.', winRate: 97.9, totalProfit: 145000, copiers: 910, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', specialty: 'Spot Gold Masters' },
  { id: 'mt-43', name: 'Chloe Zhang', risk: 'Medium', bio: 'Singapore Asian session momentum trader on Nikkei 225 & Hang Seng.', winRate: 93.6, totalProfit: 67300, copiers: 350, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', specialty: 'Asian Indices' },
  { id: 'mt-44', name: 'Rohan Gupta', risk: 'Low', bio: 'Algorithmic risk manager trading Range Breakout Indices.', winRate: 97.6, totalProfit: 88900, copiers: 490, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', specialty: 'Range Breakouts' },
  { id: 'mt-45', name: 'Katarina Kovac', risk: 'Medium', bio: 'Central European FX and Crude Oil swing trader.', winRate: 92.0, totalProfit: 53400, copiers: 270, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', specialty: 'Crude Oil Swings' },
  { id: 'mt-46', name: 'Dominic Wright', risk: 'Low', bio: 'Sydney FX session specialist trading AUD/USD & AUD/JPY.', winRate: 96.6, totalProfit: 76200, copiers: 370, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', specialty: 'Sydney FX Session' },
  { id: 'mt-47', name: 'Zeynep Yilmaz', risk: 'Medium', bio: 'Emerging market currency trader with strict risk limits.', winRate: 91.7, totalProfit: 41800, copiers: 190, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', specialty: 'Emerging FX' },
  { id: 'mt-48', name: 'Nathanael Dubois', risk: 'Low', bio: 'Geneva wealth manager offering low-risk automated portfolio mirroring.', winRate: 98.7, totalProfit: 168000, copiers: 960, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', specialty: 'Wealth Management' },
  { id: 'mt-49', name: 'Keiko Sato', risk: 'Low', bio: 'Ichimoku Kinko Hyo cloud strategy specialist on JPY pairs.', winRate: 96.0, totalProfit: 63900, copiers: 330, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', specialty: 'Ichimoku Cloud' },
  { id: 'mt-50', name: 'Mikhail Romanov', risk: 'High', bio: 'High yield algorithmic scalper for Jump 100 Index.', winRate: 89.9, totalProfit: 205000, copiers: 1150, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', specialty: 'Jump Indices Algo' },
]

export default function CopyTradingHub({ userBalance, onAllocateBalance, showNotice }: CopyTradingHubProps) {
  const [selectedTrader, setSelectedTrader] = useState<MasterTrader | null>(null)
  const [allocationAmount, setAllocationAmount] = useState('100')
  const [profitShare, setProfitShare] = useState('10')
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All')

  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveCopySubscription[]>([])
  const [successModal, setSuccessModal] = useState<{ traderName: string; amount: number } | null>(null)

  const filteredTraders = MASTER_TRADERS.filter(trader => {
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

    // Record subscription
    const newSub: ActiveCopySubscription = {
      traderId: selectedTrader.id,
      traderName: selectedTrader.name,
      amount: amt,
      profitShare: parseFloat(profitShare) || 10,
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setActiveSubscriptions(prev => [newSub, ...prev.filter(s => s.traderId !== newSub.traderId)])

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
    setActiveSubscriptions(prev => prev.filter(s => s.traderId !== sub.traderId))
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
          <span>Top Master Traders (50 Available)</span>
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
