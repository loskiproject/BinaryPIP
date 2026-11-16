import React, { useState } from 'react'
import { Sparkles, Pause, Play, Square, Users, X, AlertTriangle, ArrowRight, Wallet } from 'lucide-react'
import type { CopySubscription } from './useCopyTrading'

interface MyActiveTradersProps {
  subscriptions: CopySubscription[]
  accountType: 'none' | 'real' | 'demo' | 'live'
  userBalance: number
  onPause: (subscriptionId: string) => void
  onResume: (subscriptionId: string) => void
  onStop: (subscriptionId: string) => void
  loading?: boolean
}

export default function MyActiveTraders({
  subscriptions,
  accountType,
  userBalance,
  onPause,
  onResume,
  onStop,
  loading = false,
}: MyActiveTradersProps) {
  const normAccountType = accountType === 'live' || accountType === 'real' ? 'real' : 'demo'
  const isDemo = normAccountType === 'demo'

  const [confirmStopSub, setConfirmStopSub] = useState<CopySubscription | null>(null)

  // Filter subscriptions for current account type
  const activeSubs = subscriptions.filter(s => {
    const sType = s.account_type
    return sType === normAccountType && s.status !== 'stopped'
  })

  // Total allocated & total P&L across all active subscriptions
  const totalAllocated = activeSubs.reduce((acc, curr) => acc + curr.allocated_amount, 0)
  const totalCopiedPnL = activeSubs.reduce((acc, curr) => acc + curr.total_copied_profit, 0)

  const handleConfirmStop = () => {
    if (confirmStopSub) {
      onStop(confirmStopSub.id)
      setConfirmStopSub(null)
    }
  }

  return (
    <div
      className="cth-active-traders-box"
      style={{
        width: '100%',
        borderRadius: '20px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Dashboard Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} color="#10b981" />
          </div>
          <div>
            <h2 className="cth-title" style={{ fontSize: '18px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
              My Active Traders
            </h2>
            <span className="cth-sub" style={{ fontSize: '12px' }}>
              Active Mirroring on <strong style={{ color: isDemo ? '#f59e0b' : '#10b981' }}>{isDemo ? 'Demo Account' : 'Real Account'}</strong>
            </span>
          </div>
        </div>

        {/* Summary Stats Pill */}
        {activeSubs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>ALLOCATED CAPITAL</span>
              <div className="cth-stat-value" style={{ fontSize: '14px', fontWeight: 900 }}>
                ${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL COPIED P&amp;L</span>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: totalCopiedPnL >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {totalCopiedPnL >= 0 ? `+$${totalCopiedPnL.toFixed(2)}` : `-$${Math.abs(totalCopiedPnL).toFixed(2)}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State Banner */}
      {activeSubs.length === 0 ? (
        <div
          className="cth-empty-state"
          style={{
            borderRadius: '16px',
            padding: '28px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={32} color="#64748b" style={{ opacity: 0.7 }} />
          <strong className="cth-empty-title" style={{ fontSize: '15px' }}>No Active Copy Trading Subscriptions</strong>
          <p className="cth-empty-text" style={{ fontSize: '13px', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
            You are currently not copying any traders on your <strong>{isDemo ? 'Demo' : 'Real'} Account</strong>. Browse the Master Traders list below and click <strong>"Copy Trader"</strong> to start mirroring trades automatically.
          </p>
        </div>
      ) : (
        /* Active Subscriptions Grid / Cards */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {activeSubs.map(sub => {
            const isPaused = sub.status === 'paused'
            const trader = sub.master_trader_snapshot
            const riskColor = trader.risk_level === 'Low' ? '#10b981' : trader.risk_level === 'Medium' ? '#f59e0b' : '#ef4444'

            return (
              <div
                key={sub.id}
                className="cth-active-sub-card"
                style={{
                  border: isPaused ? '1px solid rgba(245, 158, 11, 0.35)' : undefined,
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header Row: Trader Avatar & Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={trader.avatar}
                      alt={trader.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `2px solid ${riskColor}`,
                      }}
                    />
                    <div>
                      <h4 className="cth-trader-name" style={{ fontSize: '15px', fontWeight: 900, margin: 0 }}>
                        {trader.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: riskColor }}>
                          {trader.risk_level} Risk
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>·</span>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
                          {trader.win_rate}% Win
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsing Status Pill */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      border: `1px solid ${isPaused ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                      borderRadius: '20px',
                      padding: '4px 10px',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isPaused ? '#f59e0b' : '#10b981',
                        boxShadow: isPaused ? 'none' : '0 0 8px #10b981',
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isPaused ? '#f59e0b' : '#10b981' }}>
                      {isPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown Box */}
                <div
                  className="cth-metrics-box"
                  style={{
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '6px',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>CAPITAL</span>
                    <strong className="cth-stat-value" style={{ fontSize: '13px', fontWeight: 900, display: 'block', marginTop: '2px' }}>
                      ${sub.allocated_amount.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>RATIO</span>
                    <strong className="cth-sub" style={{ fontSize: '13px', fontWeight: 900, display: 'block', marginTop: '2px' }}>
                      {sub.copy_ratio}x
                    </strong>
                  </div>
                  <div>
                    <span className="cth-stat-label" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>COPIED P&amp;L</span>
                    <strong
                      style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        color: sub.total_copied_profit >= 0 ? '#10b981' : '#ef4444',
                        display: 'block',
                        marginTop: '2px',
                      }}
                    >
                      {sub.total_copied_profit >= 0 ? `+$${sub.total_copied_profit.toFixed(2)}` : `-$${Math.abs(sub.total_copied_profit).toFixed(2)}`}
                    </strong>
                  </div>
                </div>

                {/* Action Buttons: Pause/Resume & Stop */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={() => onResume(sub.id)}
                      style={{
                        flex: 1,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        borderRadius: '10px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <Play size={14} /> Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPause(sub.id)}
                      style={{
                        flex: 1,
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#f59e0b',
                        borderRadius: '10px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <Pause size={14} /> Pause
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmStopSub(sub)}
                    style={{
                      flex: 1,
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#ef4444',
                      borderRadius: '10px',
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Square size={14} /> Stop Copying
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* STOP COPYING CONFIRMATION & PNL SETTLEMENT POPUP MODAL */}
      {confirmStopSub && (() => {
        const trader = confirmStopSub.master_trader_snapshot
        const allocated = confirmStopSub.allocated_amount
        const pnl = confirmStopSub.total_copied_profit
        const totalRefund = allocated + pnl
        const isProfit = pnl >= 0

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
            onClick={() => setConfirmStopSub(null)}
          >
            <div
              className="cth-modal-container"
              style={{
                borderRadius: '24px',
                padding: '28px 24px 24px',
                maxWidth: '440px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                position: 'relative',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setConfirmStopSub(null)}
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
                <img
                  src={trader.avatar}
                  alt={trader.name}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #ef4444',
                    boxShadow: '0 0 14px rgba(239, 68, 68, 0.35)',
                  }}
                />
                <div>
                  <h3 className="cth-modal-title" style={{ fontSize: '19px', fontWeight: 900, margin: 0 }}>
                    Stop Copying {trader.name}?
                  </h3>
                  <span className="cth-sub" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <AlertTriangle size={13} color="#f59e0b" /> P&amp;L Settlement &amp; Capital Refund
                  </span>
                </div>
              </div>

              {/* Settlement P&L Breakdown Card */}
              <div
                className="cth-metrics-box"
                style={{
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800 }}>ALLOCATED CAPITAL</span>
                  <span className="cth-stat-value" style={{ fontSize: '14px', fontWeight: 900 }}>
                    ${allocated.toFixed(2)} USD
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="cth-stat-label" style={{ fontSize: '11px', fontWeight: 800 }}>REALIZED COPIED P&amp;L</span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: isProfit ? '#10b981' : '#ef4444',
                    }}
                  >
                    {isProfit ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`} USD
                  </span>
                </div>

                <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.15)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wallet size={15} color="#10b981" />
                    <span className="cth-modal-title" style={{ fontSize: '12px', fontWeight: 900 }}>NET CAPITAL REFUND</span>
                  </div>
                  <strong style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>
                    ${totalRefund.toFixed(2)} USD
                  </strong>
                </div>
              </div>

              {/* Information Notice */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  lineHeight: 1.5,
                }}
              >
                Stopping copy trading will unmount all live mirrored positions for <strong>{trader.name}</strong> and immediately credit <strong>${totalRefund.toFixed(2)} USD</strong> directly back to your <strong>{isDemo ? 'Demo' : 'Real'} Account balance</strong>.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleConfirmStop}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #ef4444, #f97316)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  Confirm Stop &amp; Refund ${totalRefund.toFixed(2)} USD <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmStopSub(null)}
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
                  Cancel &amp; Keep Copying
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
