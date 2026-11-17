import React, { useState, useEffect, useCallback } from 'react'
import {
  ListOrdered, Search, Download, RefreshCw,
  CheckCircle2, AlertTriangle, Info, AlertCircle, Sparkles, Filter, Lock, Users, Wallet
} from 'lucide-react'
import { supabase, supabaseUrl as SUPABASE_URL, supabaseKey as SUPABASE_ANON_KEY } from '../lib/supabase'

export interface UserLogRecord {
  id: string
  userEmail: string
  action: string
  details: string
  severity: string
  ipAddress: string
  createdAt: string
}

interface UserLogsProps {
  showNotice?: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

export default function UserLogs({ showNotice }: UserLogsProps) {
  const [logs, setLogs] = useState<UserLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_logs?select=*&order=created_at.desc&limit=100`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })
      if (res.ok) {
        const rows = await res.json() as any[]
        if (Array.isArray(rows)) {
          setLogs(rows.map(r => ({
            id: String(r.id),
            userEmail: String(r.user_email || 'anonymous@binarypip.com'),
            action: String(r.action || 'ACTIVITY'),
            details: String(r.details || '—'),
            severity: String(r.severity || 'Info'),
            ipAddress: String(r.ip_address || '—'),
            createdAt: String(r.created_at || new Date().toISOString()),
          })))
        }
      }
    } catch (err) {
      console.error('Error fetching user_logs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLogs()

    if (!supabase) return

    // Real-time subscription to user_logs INSERT events
    const channel = supabase.channel('realtime_user_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_logs' }, (payload) => {
        const r = payload.new as any
        if (r) {
          const newLog: UserLogRecord = {
            id: String(r.id),
            userEmail: String(r.user_email || 'anonymous@binarypip.com'),
            action: String(r.action || 'ACTIVITY'),
            details: String(r.details || '—'),
            severity: String(r.severity || 'Info'),
            ipAddress: String(r.ip_address || '—'),
            createdAt: String(r.created_at || new Date().toISOString()),
          }
          setLogs(prev => [newLog, ...prev.filter(x => x.id !== newLog.id)].slice(0, 100))
        }
      })
      .subscribe()

    return () => {
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [fetchLogs])

  const exportCsv = () => {
    try {
      const headers = ['ID', 'User Email', 'Action', 'Details', 'Severity', 'IP Address', 'Timestamp']
      const rowsCsv = logs.map(l => [
        `"${l.id}"`,
        `"${l.userEmail.replace(/"/g, '""')}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.details.replace(/"/g, '""')}"`,
        `"${l.severity.replace(/"/g, '""')}"`,
        `"${l.ipAddress}"`,
        `"${new Date(l.createdAt).toLocaleString()}"`,
      ])

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rowsCsv.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `binarypip-user-logs-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      if (showNotice) showNotice('Exported User Logs to CSV file!')
    } catch {
      if (showNotice) showNotice('Failed to export CSV', 'err')
    }
  }

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.userEmail.toLowerCase().includes(search.toLowerCase()) ||
                          l.action.toLowerCase().includes(search.toLowerCase()) ||
                          l.details.toLowerCase().includes(search.toLowerCase()) ||
                          l.ipAddress.includes(search)
    const matchesAction = actionFilter === 'all' || l.action === actionFilter
    return matchesSearch && matchesAction
  })

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
        return <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>🔑 USER LOGIN</span>
      case 'AUTH_FAILED':
        return <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>⚠️ AUTH FAILED</span>
      case 'PROFILE_UPDATE':
        return <span style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>👤 PROFILE UPDATE</span>
      case 'DEPOSIT_INIT':
        return <span style={{ background: 'rgba(32,235,90,0.15)', color: '#20eb5a', border: '1px solid rgba(32,235,90,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>💳 DEPOSIT INIT</span>
      case 'MASTER_TRADER_APPLY':
        return <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>🏆 MASTER TRADER APPLY</span>
      default:
        return <span style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>{action}</span>
    }
  }

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase()
    if (s === 'warning' || s === 'warn') {
      return <span style={{ color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Warning</span>
    }
    if (s === 'critical' || s === 'error') {
      return <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> Critical</span>
    }
    if (s === 'success' || s === 'ok') {
      return <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Success</span>
    }
    return <span style={{ color: '#00e5ff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> Info</span>
  }

  return (
    <div style={{ background: '#0B0F19', minHeight: '100vh', padding: '24px', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top Header Card */}
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ListOrdered size={26} color="#00e5ff" />
            <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.3px' }}>
              User Logs &amp; Activity Stream
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
            Real-time audit stream of client logins, IP locations, deposit requests, and security events.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={exportCsv}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #00b0ff 100%)',
              color: '#030916',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            onClick={fetchLogs}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Search */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '280px',
        }}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search email, IP, or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '13px',
              width: '100%',
            }}
          />
        </div>

        {/* Action Pills Filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Actions' },
            { id: 'USER_LOGIN', label: 'Logins' },
            { id: 'AUTH_FAILED', label: 'Auth Failed' },
            { id: 'DEPOSIT_INIT', label: 'Deposits' },
            { id: 'MASTER_TRADER_APPLY', label: 'Master Trader Apps' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActionFilter(f.id)}
              style={{
                background: actionFilter === f.id ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                color: actionFilter === f.id ? '#00e5ff' : '#94a3b8',
                border: `1px solid ${actionFilter === f.id ? 'rgba(0,229,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Data Table */}
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>USER EMAIL</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>ACTION</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>DETAILS &amp; LOCATION</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>SEVERITY</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>IP ADDRESS</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <RefreshCw size={20} style={{ animation: 'sa-spin 1s linear infinite', marginBottom: '8px' }} />
                    <div>Loading user activity logs from database...</div>
                  </td>
                </tr>
              )}

              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <ListOrdered size={28} style={{ marginBottom: '8px', opacity: 0.4 }} />
                    <div>No user logs matching filter criteria.</div>
                  </td>
                </tr>
              )}

              {filteredLogs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ color: '#ffffff', fontSize: '13px' }}>{l.userEmail}</strong>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getActionBadge(l.action)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#e2e8f0', maxWidth: '380px', lineHeight: 1.4 }}>
                    {l.details}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getSeverityBadge(l.severity)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{ fontFamily: 'monospace', fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px', color: '#00e5ff' }}>
                      {l.ipAddress}
                    </code>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
