import React, { useState } from 'react'
import { X, Shield, TrendingUp, AlertTriangle, Wallet } from 'lucide-react'
import type { MasterTrader } from './CopyTradingHub'

interface CopyTraderModalProps {
  trader: MasterTrader
  userBalance: number
  accountType: 'none' | 'real' | 'demo' | 'live'
  onClose: () => void
  onConfirm: (allocatedAmount: number, copyRatio: number, stopLossLimit: number | null) => Promise<boolean> | boolean
  showNotice: (msg: string) => void
  onOpenDeposit?: () => void
  onSwitchAccount?: () => void
}

export default function CopyTraderModal({
  trader,
  userBalance,
  accountType,
  onClose,
  onConfirm,
  showNotice,
  onOpenDeposit,
  onSwitchAccount,
}: CopyTraderModalProps) {
  const normAccountType = accountType === 'live' || accountType === 'real' ? 'real' : 'demo'
  const isDemo = normAccountType === 'demo'

  const [allocationAmount, setAllocationAmount] = useState<string>(
    userBalance > 0 ? Math.min(100, Math.max(10, Math.floor(userBalance * 0.25))).toString() : '50'
  )
  const [copyRatio, setCopyRatio] = useState<number>(1.0)
  const [stopLoss, setStopLoss] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const numAmount = parseFloat(allocationAmount) || 0
  const numStopLoss = stopLoss ? parseFloat(stopLoss) : null

  // Quick percentage calculation
  const handlePillClick = (percentage: number) => {
    if (userBalance <= 0) return
    const calc = Math.max(10, Math.floor(userBalance * (percentage / 100)))
    setAllocationAmount(calc.toString())
  }

  // Dynamic estimated return profit calculation
  const winRateFactor = trader.winRate / 100
  const riskMultiplier = trader.risk === 'Low' ? 1.85 : trader.risk === 'Medium' ? 2.10 : 2.45
  const estimatedReturn = (numAmount * winRateFactor * riskMultiplier * copyRatio).toFixed(2)

  // Validation
  const isValidAmount = numAmount >= 10 && numAmount <= userBalance
  const isUnfunded = userBalance <= 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isUnfunded) {
      showNotice(`Your ${isDemo ? 'Demo' : 'Real'} Account balance is $0.00. Please deposit funds or switch accounts.`)
      return
    }

    if (numAmount < 10) {
      showNotice('Minimum capital allocation for copy trading is $10.00 USD.')
      return
    }

    if (numAmount > userBalance) {
      showNotice(`Insufficient balance. You have $${userBalance.toFixed(2)} USD available.`)
      return
    }

    try {
      setIsSubmitting(true)
      const success = await onConfirm(numAmount, copyRatio, numStopLoss)
      if (success !== false) {
        onClose()
      }
    } catch {
      showNotice('An error occurred while starting copy trading.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const riskColor = trader.risk === 'Low' ? '#10b981' : trader.risk === 'Medium' ? '#f59e0b' : '#ef4444'

  return (
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
      onClick={onClose}
    >
      <div
        className="cth-modal-container"
        style={{
          borderRadius: '24px',
          padding: '28px 24px 24px',
          maxWidth: '450px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
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
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingRight: '36px' }}>
          <img
            src={trader.avatar}
            alt={trader.name}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${riskColor}`,
              boxShadow: `0 0 14px ${riskColor}50`,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="cth-modal-title" style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.2px' }}>
                Copy {trader.name}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: riskColor,
                  background: `${riskColor}18`,
                  border: `1px solid ${riskColor}40`,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Shield size={11} /> {trader.risk} Risk
              </span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 800 }}>
                {trader.winRate}% Win Rate
              </span>
            </div>
          </div>
        </div>

        {/* Account Context Badge */}
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

        {/* Unfunded Alert Prompt */}
        {isUnfunded && (
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
                  Insufficient {isDemo ? 'Demo' : 'Real'} Account Balance ($0.00)
                </strong>
                <p className="cth-modal-text" style={{ fontSize: '12px', margin: '3px 0 0', lineHeight: 1.4 }}>
                  You need available funds in your active account to allocate capital to copy traders.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              {!isDemo && onOpenDeposit && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenDeposit() }}
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
              {onSwitchAccount && (
                <button
                  type="button"
                  onClick={() => { onClose(); onSwitchAccount() }}
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
                  {isDemo ? 'Fund Demo' : 'Switch to Demo ⚡'}
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Allocation Amount Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Investment Allocation ($ USD)
              </label>
              <span className="cth-sub" style={{ fontSize: '11px' }}>Min $10.00</span>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 900, fontSize: '16px' }}>
                $
              </span>
              <input
                type="number"
                min="10"
                max={userBalance > 0 ? userBalance : undefined}
                step="1"
                value={allocationAmount}
                onChange={e => setAllocationAmount(e.target.value)}
                placeholder="100"
                disabled={isUnfunded}
                className="cth-input"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 32px',
                  fontSize: '16px',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Quick Percentage Pills */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {[10, 25, 50, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  disabled={isUnfunded}
                  onClick={() => handlePillClick(pct)}
                  className="cth-pill-btn"
                  style={{
                    flex: 1,
                    borderRadius: '8px',
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: isUnfunded ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pct === 100 ? 'Max' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Ratio Selection */}
          <div>
            <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>
              Copy Ratio / Proportion
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
              {[
                { label: '0.5x', val: 0.5 },
                { label: '1.0x', val: 1.0 },
                { label: '2.0x', val: 2.0 },
                { label: 'Prop.', val: 1.5 },
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={isUnfunded}
                  onClick={() => setCopyRatio(opt.val)}
                  className={copyRatio === opt.val ? 'cth-filter-btn-active' : 'cth-pill-btn'}
                  style={{
                    borderRadius: '8px',
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: isUnfunded ? 'not-allowed' : 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Stop-Loss Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Stop-Loss / Max Drawdown Limit ($)
              </label>
              <span className="cth-sub" style={{ fontSize: '11px' }}>Optional</span>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 50 (Auto-stop on loss)"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              disabled={isUnfunded}
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

          {/* Dynamic Estimated Return Banner */}
          <div
            className="cth-metrics-box"
            style={{
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} color="#10b981" /> ESTIMATED RETURN PROFIT
              </span>
              <strong style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', display: 'block', marginTop: '2px' }}>
                +${estimatedReturn} USD
              </strong>
            </div>
            <span className="cth-sub" style={{ fontSize: '11px', textAlign: 'right', maxWidth: '140px' }}>
              Ratio: {copyRatio}x · Win Rate: {trader.winRate}%
            </span>
          </div>

          {/* Submit Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={!isValidAmount || isSubmitting || isUnfunded}
              style={{
                width: '100%',
                background: (!isValidAmount || isUnfunded)
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'linear-gradient(90deg, #ff512f, #f09819)',
                color: (!isValidAmount || isUnfunded) ? '#64748b' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 900,
                cursor: (!isValidAmount || isUnfunded || isSubmitting) ? 'not-allowed' : 'pointer',
                boxShadow: (!isValidAmount || isUnfunded) ? 'none' : '0 8px 24px rgba(255, 81, 47, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? 'Activating Subscription...' : 'Confirm & Start Copying'}
            </button>

            <button
              type="button"
              onClick={onClose}
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
  )
}
