import { useState, useEffect, useCallback, useRef } from 'react'

export interface MasterTraderSnapshot {
  id: string
  name: string
  avatar: string
  risk_level: 'Low' | 'Medium' | 'High' | string
  win_rate: number
  specialty?: string
}

export interface CopySubscription {
  id: string
  follower_id: string
  master_trader_id: string
  master_trader_snapshot: MasterTraderSnapshot
  account_type: 'real' | 'demo'
  allocated_amount: number
  copy_ratio: number
  stop_loss_limit?: number | null
  status: 'active' | 'paused' | 'stopped'
  total_copied_profit: number
  created_at: string
  updated_at?: string
}

interface UseCopyTradingOptions {
  userId?: string
  supabaseUrl?: string
  supabaseKey?: string
  accountType?: 'none' | 'real' | 'demo' | 'live'
  onAllocateBalance?: (amount: number) => void
  showNotice?: (msg: string) => void
}

export function useCopyTrading({
  userId,
  supabaseUrl,
  supabaseKey,
  accountType = 'demo',
  onAllocateBalance,
  showNotice,
}: UseCopyTradingOptions) {
  // Normalize account type to 'real' or 'demo'
  const normAccountType: 'real' | 'demo' = accountType === 'live' || accountType === 'real' ? 'real' : 'demo'

  const [subscriptions, setSubscriptions] = useState<CopySubscription[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const isMounted = useRef(true)

  // Fetch active subscriptions from Supabase REST or LocalStorage fallback
  const fetchSubscriptions = useCallback(async () => {
    if (!userId) {
      setSubscriptions([])
      setLoading(false)
      return
    }

    const storageKey = `binarypip_copy_subs_${userId}_${normAccountType}`

    const cacheKey = `binarypip_cache_copy_subs_${userId}_${normAccountType}`
    const cacheTtlMs = 5 * 60 * 1000 // 5 minutes cache

    // Client-side Caching check
    try {
      const cachedStr = localStorage.getItem(cacheKey)
      if (cachedStr) {
        const { timestamp, data } = JSON.parse(cachedStr)
        if (Date.now() - timestamp < cacheTtlMs && Array.isArray(data)) {
          setSubscriptions(data)
          setLoading(false)
          return
        }
      }
    } catch {
      // silent
    }

    if (!supabaseUrl || !supabaseKey) {
      try {
        const local = localStorage.getItem(storageKey)
        if (local) {
          const parsed: CopySubscription[] = JSON.parse(local)
          setSubscriptions(parsed.filter(s => s.status !== 'stopped'))
        } else {
          setSubscriptions([])
        }
      } catch {
        setSubscriptions([])
      }
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const accFilter = normAccountType === 'real' ? 'in.(real,live)' : 'eq.demo'
      // 1. Target Specific Columns + 2. Pagination Limit
      const selectCols = 'id,follower_id,master_trader_id,master_trader_snapshot,account_type,allocated_amount,copy_ratio,stop_loss_limit,status,total_copied_profit,created_at'
      const url = `${supabaseUrl}/rest/v1/copy_subscriptions?follower_id=eq.${userId}&account_type=${accFilter}&status=neq.stopped&select=${selectCols}&order=created_at.desc&limit=30`

      const res = await fetch(url, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })

      if (res.ok) {
        const rows = await res.json()
        if (Array.isArray(rows) && isMounted.current) {
          const formatted: CopySubscription[] = rows.map((r: any) => ({
            id: String(r.id),
            follower_id: String(r.follower_id),
            master_trader_id: String(r.master_trader_id),
            master_trader_snapshot: typeof r.master_trader_snapshot === 'object' && r.master_trader_snapshot ? r.master_trader_snapshot : {
              id: String(r.master_trader_id),
              name: r.master_trader_name || 'Master Trader',
              avatar: r.master_trader_avatar || '',
              risk_level: r.master_trader_risk || 'Low',
              win_rate: Number(r.master_trader_win_rate || 95),
            },
            account_type: r.account_type === 'live' ? 'real' : r.account_type,
            allocated_amount: Number(r.allocated_amount || r.amount || 0),
            copy_ratio: Number(r.copy_ratio || 1.0),
            stop_loss_limit: r.stop_loss_limit ? Number(r.stop_loss_limit) : null,
            status: r.status as 'active' | 'paused' | 'stopped',
            total_copied_profit: Number(r.total_copied_profit || 0.00),
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || new Date().toISOString(),
          }))

          setSubscriptions(formatted)
          try {
            localStorage.setItem(storageKey, JSON.stringify(formatted))
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: formatted }))
          } catch {
            // silent
          }
        }
      } else {
        // Fallback to local storage
        try {
          const local = localStorage.getItem(storageKey)
          if (local && isMounted.current) {
            setSubscriptions(JSON.parse(local).filter((s: CopySubscription) => s.status !== 'stopped'))
          }
        } catch {
          // silent
        }
      }
    } catch {
      // Fallback
      try {
        const local = localStorage.getItem(storageKey)
        if (local && isMounted.current) {
          setSubscriptions(JSON.parse(local).filter((s: CopySubscription) => s.status !== 'stopped'))
        }
      } catch {
        // silent
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [userId, normAccountType, supabaseUrl, supabaseKey])

  useEffect(() => {
    isMounted.current = true
    void fetchSubscriptions()

    return () => {
      isMounted.current = false
    }
  }, [fetchSubscriptions])

  // Real-time Supabase Event Listener + Simulated Profit Ticker for Active Subscriptions
  useEffect(() => {
    if (!userId) return

    // 1. Simulated Live Profit Ticker for active subscriptions
    const tickerInterval = setInterval(() => {
      setSubscriptions(prevSubs => {
        let updated = false
        const next = prevSubs.map(sub => {
          if (sub.status !== 'active') return sub

          // Random profit tick between +$0.15 and +$1.85 per interval based on win rate
          const isGain = Math.random() < (sub.master_trader_snapshot.win_rate / 100)
          const delta = isGain
            ? Number((Math.random() * 0.85 * sub.copy_ratio).toFixed(2))
            : -Number((Math.random() * 0.35 * sub.copy_ratio).toFixed(2))

          if (delta !== 0) {
            updated = true
            const newProfit = Math.max(-sub.allocated_amount * 0.5, Number((sub.total_copied_profit + delta).toFixed(2)))
            return {
              ...sub,
              total_copied_profit: newProfit,
            }
          }
          return sub
        })

        if (updated) {
          try {
            localStorage.setItem(`binarypip_copy_subs_${userId}_${normAccountType}`, JSON.stringify(next))
          } catch {
            // silent
          }
        }

        return next
      })
    }, 4000)

    return () => {
      clearInterval(tickerInterval)
    }
  }, [userId, normAccountType])

  // Start Copying a Master Trader
  const startCopySubscription = async (
    trader: MasterTraderSnapshot,
    allocatedAmount: number,
    copyRatio: number = 1.0,
    stopLossLimit: number | null = null
  ) => {
    if (!userId) {
      showNotice?.('Please sign in to start copy trading.')
      return false
    }

    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const newSub: CopySubscription = {
      id: subId,
      follower_id: userId,
      master_trader_id: trader.id,
      master_trader_snapshot: trader,
      account_type: normAccountType,
      allocated_amount: allocatedAmount,
      copy_ratio: copyRatio,
      stop_loss_limit: stopLossLimit,
      status: 'active',
      total_copied_profit: 0.00,
      created_at: new Date().toISOString(),
    }

    // Update local state immediately
    const nextSubs = [newSub, ...subscriptions.filter(s => s.master_trader_id !== trader.id)]
    setSubscriptions(nextSubs)

    try {
      localStorage.setItem(`binarypip_copy_subs_${userId}_${normAccountType}`, JSON.stringify(nextSubs))
    } catch {
      // silent
    }

    // Deduct capital from user's active balance
    onAllocateBalance?.(allocatedAmount)

    // Save to Supabase DB if available
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/copy_subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            follower_id: userId,
            master_trader_id: trader.id,
            master_trader_snapshot: trader,
            account_type: normAccountType,
            allocated_amount: allocatedAmount,
            copy_ratio: copyRatio,
            stop_loss_limit: stopLossLimit,
            status: 'active',
            total_copied_profit: 0.00,
          }),
        })
      } catch {
        // silent
      }
    }

    showNotice?.(`🚀 Started copying ${trader.name}! $${allocatedAmount.toFixed(2)} allocated from ${normAccountType === 'real' ? 'Real' : 'Demo'} Account.`)
    return true
  }

  // Pause Subscription
  const pauseSubscription = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId)
    if (!sub) return

    const updated = subscriptions.map(s => s.id === subscriptionId ? { ...s, status: 'paused' as const } : s)
    setSubscriptions(updated)

    try {
      localStorage.setItem(`binarypip_copy_subs_${userId}_${normAccountType}`, JSON.stringify(updated))
    } catch {
      // silent
    }

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/copy_subscriptions?id=eq.${subscriptionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ status: 'paused' }),
        })
      } catch {
        // silent
      }
    }

    showNotice?.(`⏸️ Paused copying ${sub.master_trader_snapshot.name}.`)
  }

  // Resume Subscription
  const resumeSubscription = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId)
    if (!sub) return

    const updated = subscriptions.map(s => s.id === subscriptionId ? { ...s, status: 'active' as const } : s)
    setSubscriptions(updated)

    try {
      localStorage.setItem(`binarypip_copy_subs_${userId}_${normAccountType}`, JSON.stringify(updated))
    } catch {
      // silent
    }

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/copy_subscriptions?id=eq.${subscriptionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ status: 'active' }),
        })
      } catch {
        // silent
      }
    }

    showNotice?.(`▶️ Resumed copying ${sub.master_trader_snapshot.name}!`)
  }

  // Stop Subscription (Releases allocated capital + accumulated profit back to user balance)
  const stopSubscription = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId)
    if (!sub) return

    // Calculate total return: allocated amount + accrued profit
    const totalReturn = sub.allocated_amount + sub.total_copied_profit

    // Remove from active UI list
    const updated = subscriptions.filter(s => s.id !== subscriptionId)
    setSubscriptions(updated)

    try {
      localStorage.setItem(`binarypip_copy_subs_${userId}_${normAccountType}`, JSON.stringify(updated))
    } catch {
      // silent
    }

    // Return allocated capital + accrued profit back to user balance (negative allocation = credit)
    onAllocateBalance?.(-totalReturn)

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/copy_subscriptions?id=eq.${subscriptionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ status: 'stopped', updated_at: new Date().toISOString() }),
        })
      } catch {
        // silent
      }
    }

    const profitStr = sub.total_copied_profit >= 0
      ? `+$${sub.total_copied_profit.toFixed(2)}`
      : `-$${Math.abs(sub.total_copied_profit).toFixed(2)}`

    showNotice?.(`⏹️ Stopped copying ${sub.master_trader_snapshot.name}. $${totalReturn.toFixed(2)} USD (Capital + P&L: ${profitStr}) returned to your balance.`)
  }

  return {
    subscriptions,
    loading,
    normAccountType,
    startCopySubscription,
    pauseSubscription,
    resumeSubscription,
    stopSubscription,
    refreshSubscriptions: fetchSubscriptions,
  }
}
