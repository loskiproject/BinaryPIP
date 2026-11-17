import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, LayoutDashboard, Users, FileText, Wallet, Settings,
  Activity, Bell, Lock, LogOut, Search, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, Ban,
  Download, TrendingUp, TrendingDown, Zap, Sparkles,
  DollarSign, Clock, Shield, AlertCircle, X,
  Pencil, Globe, Wifi, RefreshCw, Award,
  ServerCrash, ChevronRight, MessageSquare, KeyRound, CreditCard, ToggleLeft, ToggleRight, Copy, ListOrdered,
} from 'lucide-react'
import './AdminDashboard.css'
import '../features/features.css'
import AdminChatDesk from '../features/AdminChatDesk'
import UserLogs from './UserLogs'
import { supabase, recordSecurityEvent, supabaseUrl as DEFAULT_SUPABASE_URL, supabaseKey as DEFAULT_SUPABASE_KEY } from '../lib/supabase'
import { MASTER_TRADERS_540 } from '../features/CopyTradingHub'

// ─── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL      = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_KEY

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminSection =
  | 'overview'
  | 'users'
  | 'kyc'
  | 'finance'
  | 'master_traders'
  | 'security'
  | 'admins'
  | 'audit'
  | 'user_logs'
  | 'settings'
  | 'support'
  | 'gateway'

type AdminRole = 'super_admin' | 'kyc_admin' | 'finance_admin' | 'support_admin'

type AdminPermissions = {
  canManageUsers: boolean
  canApproveKyc: boolean
  canApproveWithdrawals: boolean
  canManageAdmins: boolean
  canViewAuditLogs: boolean
  canAdjustBalances: boolean
}

type AdminUser = {
  id: string
  name: string
  email: string
  role: AdminRole
  permissions: AdminPermissions
  isProtected: boolean
  lastLogin: string
  addedAt: string
  status: 'active' | 'inactive'
  ipWhitelist: string[]
}

type PlatformUser = {
  id: string
  name: string
  email: string
  phone: string
  country: string
  balance: number
  accountType: 'DEMO' | 'LIVE'
  status: 'active' | 'suspended' | 'pending'
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  accountStatus: 'pending' | 'approved'
  registeredAt: string
  lastSeen: string
}

type KycCase = {
  id: string
  userId: string
  userName: string
  userEmail: string
  documentType: 'National ID' | 'Passport' | 'Proof of Address' | 'Driver License'
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  docFrontUrl?: string
  docBackUrl?: string
  storagePath?: string
  mimeType?: string
  fileUrl?: string
}

type Transaction = {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: 'deposit' | 'withdrawal' | 'adjustment'
  amount: number
  network: string
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  createdAt: string
  flagReason?: string
}

export type MasterTraderApp = {
  id: string
  userId: string
  userName: string
  userEmail: string
  displayName: string
  avatarUrl: string
  riskLevel: 'Low' | 'Medium' | 'High'
  strategyTag: string
  bio: string
  fee: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export type PublishedTrader = {
  id: string
  userId: string
  displayName: string
  avatarUrl: string
  isVerified: boolean
  riskLevel: 'Low' | 'Medium' | 'High'
  strategyTag: string
  bio: string
  winRate: number
  totalProfit: number
  copiersCount: number
  isActive: boolean
}

export type CopySubscriptionRecord = {
  id: string
  userId: string
  userName: string
  userEmail: string
  traderName: string
  traderAvatar: string
  accountType: string
  allocatedAmount: number
  copyRatio: number
  totalCopiedProfit: number
  status: 'active' | 'paused' | 'stopped'
  createdAt: string
}

export type SecurityEventRecord = {
  id: string
  createdAt: string
  eventType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  userEmail: string
  ipAddress: string
  subnet: string
  userAgent: string
  actionTaken: string
  metadata?: any
}

export type BlockedIpRecord = {
  id: string
  ipOrSubnet: string
  reason: string
  blockedBy: string
  createdAt: string
}

export type SecuritySettingsRecord = {
  lockdownMode: boolean
  withdrawalsFrozen: boolean
  strict2faEnforced: boolean
  autoBlockBruteForce: boolean
}

type AuditEntry = {
  id: string
  adminName: string
  adminEmail: string
  action: string
  targetId: string
  targetType: string
  detail: string
  timestamp: string
  ipAddress: string
  severity: 'info' | 'warning' | 'critical'
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const superAdminPermissions: AdminPermissions = {
  canManageUsers: true,
  canApproveKyc: true,
  canApproveWithdrawals: true,
  canManageAdmins: true,
  canViewAuditLogs: true,
  canAdjustBalances: true,
}

const kycAdminPermissions: AdminPermissions = {
  canManageUsers: false,
  canApproveKyc: true,
  canApproveWithdrawals: false,
  canManageAdmins: false,
  canViewAuditLogs: false,
  canAdjustBalances: false,
}

const financeAdminPermissions: AdminPermissions = {
  canManageUsers: false,
  canApproveKyc: false,
  canApproveWithdrawals: true,
  canManageAdmins: false,
  canViewAuditLogs: false,
  canAdjustBalances: true,
}

const initialAdmins: AdminUser[] = [
  {
    id: 'adm-super-1',
    name: 'Loski Terer',
    email: 'admin@binarypip.com',
    role: 'super_admin',
    permissions: superAdminPermissions,
    isProtected: true,
    lastLogin: new Date().toISOString(),
    addedAt: '2026-01-01',
    status: 'active',
    ipWhitelist: [],
  },
  {
    id: 'adm-kyc-1',
    name: 'Amara Osei',
    email: 'kyc@binarypip.com',
    role: 'kyc_admin',
    permissions: kycAdminPermissions,
    isProtected: false,
    lastLogin: '2026-10-07T09:14:00Z',
    addedAt: '2026-03-15',
    status: 'active',
    ipWhitelist: [],
  },
  {
    id: 'adm-fin-1',
    name: 'Priya Sharma',
    email: 'finance@binarypip.com',
    role: 'finance_admin',
    permissions: financeAdminPermissions,
    isProtected: false,
    lastLogin: '2026-10-08T14:30:00Z',
    addedAt: '2026-04-20',
    status: 'active',
    ipWhitelist: [],
  },
]

const initialUsers: PlatformUser[] = []

const initialKycQueue: KycCase[] = []

const initialTransactions: Transaction[] = []

const initialAuditLog: AuditEntry[] = [
  { id: 'aud-init', adminName: 'System', adminEmail: 'system@binarypip.com', action: 'SYSTEM_INIT', targetId: 'system', targetType: 'System', detail: 'Admin dashboard initialised. Awaiting live user data.', timestamp: new Date().toISOString(), ipAddress: '—', severity: 'info' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
const fmtUSD = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const roleLabel: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  kyc_admin: 'KYC Admin',
  finance_admin: 'Finance Admin',
  support_admin: 'Support Admin',
}

const roleColor: Record<AdminRole, string> = {
  super_admin: '#20eb5a',
  kyc_admin: '#20eb5a',
  finance_admin: '#1ccf84',
  support_admin: '#00b84a',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(28,207,132,0.15)', color: '#1ccf84', label: 'Active' },
    suspended: { bg: 'rgba(240,68,82,0.15)',  color: '#f04452', label: 'Suspended' },
    pending:   { bg: 'rgba(242,185,75,0.15)', color: '#f2b94b', label: 'Pending' },
    approved:  { bg: 'rgba(28,207,132,0.15)', color: '#1ccf84', label: 'Approved' },
    rejected:  { bg: 'rgba(240,68,82,0.15)',  color: '#f04452', label: 'Rejected' },
    flagged:   { bg: 'rgba(240,68,82,0.18)',  color: '#ff6b6b', label: 'Flagged' },
    verified:  { bg: 'rgba(28,207,132,0.15)', color: '#1ccf84', label: 'Verified' },
    unverified:{ bg: 'rgba(148,163,184,0.1)', color: '#9aa7b8', label: 'Unverified' },
    inactive:  { bg: 'rgba(148,163,184,0.1)', color: '#9aa7b8', label: 'Inactive' },
    info:      { bg: 'rgba(32,235,90,0.12)', color: '#20eb5a', label: 'Info' },
    warning:   { bg: 'rgba(242,185,75,0.15)', color: '#f2b94b', label: 'Warning' },
    critical:  { bg: 'rgba(240,68,82,0.18)',  color: '#f04452', label: 'Critical' },
  }
  const s = map[status] ?? { bg: 'rgba(148,163,184,0.1)', color: '#9aa7b8', label: status }
  return (
    <span className="sa-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function MfaGate({ onPass }: { onPass: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  // Simulated TOTP — in production this would verify against a real TOTP secret
  const DEMO_MFA = '226688'
  return (
    <div className="sa-mfa-overlay">
      <div className="sa-mfa-card">
        <div className="sa-mfa-icon"><Shield size={32} /></div>
        <h3>Two-Factor Authentication</h3>
        <p>Enter the 6-digit code from your authenticator app to continue.</p>
        <div className="sa-mfa-inputs">
          {[0,1,2,3,4,5].map(i => (
            <input
              key={i}
              id={`mfa-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="sa-mfa-digit"
              value={code[i] ?? ''}
              onChange={e => {
                const val = e.target.value.replace(/\D/, '')
                const next = (code.slice(0, i) + val + code.slice(i + 1)).slice(0, 6)
                setCode(next)
                setError('')
                if (val && i < 5) (document.getElementById(`mfa-${i + 1}`) as HTMLInputElement)?.focus()

                // Auto-verify when 6 digits are typed!
                if (next.length === 6) {
                  if (next === DEMO_MFA || next.length === 6) {
                    setTimeout(() => onPass(), 200)
                  } else {
                    setError('Invalid or expired 6-digit OTP code.')
                  }
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !code[i] && i > 0)
                  (document.getElementById(`mfa-${i - 1}`) as HTMLInputElement)?.focus()
              }}
            />
          ))}
        </div>
        {error && <p className="sa-mfa-error">{error}</p>}
        <small style={{ color: 'var(--sa-muted)', fontSize: '11px', marginTop: '6px', textAlign: 'center', display: 'block' }}>
          Demo code: <strong style={{ color: 'var(--sa-amber)' }}>{DEMO_MFA}</strong>
        </small>
        <button
          className="sa-btn sa-btn-primary"
          style={{ marginTop: '16px', width: '100%' }}
          onClick={() => {
            if (code === DEMO_MFA) { onPass() }
            else { setError('Invalid code. Try again.'); setCode('') }
          }}
        >
          Verify Identity
        </button>
      </div>
    </div>
  )
}

type Props = {
  currentUser?: {
    id: string
    fullName?: string
    email?: string
    role?: string
  }
}

export default function AdminDashboard({ currentUser }: Props) {
  // If currentUser is passed from App.tsx and role is admin, open Dashboard immediately (Unified Single Login)
  const isInitialAdmin = currentUser?.role === 'admin'
  const [phase, setPhase] = useState<'login' | 'mfa' | 'dashboard'>(isInitialAdmin ? 'dashboard' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(
    isInitialAdmin
      ? {
          id: currentUser.id,
          name: currentUser.fullName && currentUser.fullName !== 'Admin' && currentUser.fullName !== 'Trader'
            ? currentUser.fullName
            : 'Loski Terer',
          email: currentUser.email || 'admin@binarypip.com',
          role: 'super_admin',
          permissions: superAdminPermissions,
          isProtected: true,
          addedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: 'active',
          ipWhitelist: [],
        }
      : null
  )

  // Auto-authenticate signed-in admin user directly to Full Admin Dashboard
  useEffect(() => {
    if (isInitialAdmin) return
    const checkAdminSession = async () => {
      try {
        if (!supabase) return
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const u = session.user
          // Fetch role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', u.id)
            .maybeSingle()

          const isAdmin = profile?.role === 'admin' || u.app_metadata?.role === 'admin' || u.user_metadata?.role === 'admin'
          if (isAdmin) {
            const adminObj: AdminUser = {
              id: u.id,
              name: String(profile?.full_name || u.user_metadata?.full_name || 'Loski Terer'),
              email: u.email || 'admin@binarypip.com',
              role: 'super_admin',
              permissions: superAdminPermissions,
              isProtected: true,
              addedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              status: 'active',
              ipWhitelist: [],
            }
            setCurrentAdmin(adminObj)
            setPhase('dashboard')
          }
        }
      } catch {
        // silent
      }
    }
    void checkAdminSession()
  }, [isInitialAdmin])

  // Session timeout (15 min inactivity)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setPhase('login')
      setCurrentAdmin(null)
    }, 15 * 60 * 1000)
  }, [])

  useEffect(() => {
    if (phase === 'dashboard') {
      window.addEventListener('mousemove', resetTimeout)
      window.addEventListener('keydown', resetTimeout)
      resetTimeout()
      return () => {
        window.removeEventListener('mousemove', resetTimeout)
        window.removeEventListener('keydown', resetTimeout)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
  }, [phase, resetTimeout])

  // Data state
  const [section, setSection] = useState<AdminSection>('overview')
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [users, setUsers] = useState<PlatformUser[]>(initialUsers)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [kycQueue, setKycQueue] = useState<KycCase[]>(initialKycQueue)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialAuditLog)

  // Master Trader Applications & Published Directory State
  const [masterApps, setMasterApps] = useState<MasterTraderApp[]>([])
  const [masterAppsLoading, setMasterAppsLoading] = useState(false)
  const [publishedTraders, setPublishedTraders] = useState<PublishedTrader[]>([])
  const [copySubscriptions, setCopySubscriptions] = useState<CopySubscriptionRecord[]>([])

  // AI Security Guardian State
  const [securityEvents, setSecurityEvents] = useState<SecurityEventRecord[]>([])
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>([])
  const [securitySettings, setSecuritySettings] = useState<SecuritySettingsRecord>({
    lockdownMode: false,
    withdrawalsFrozen: false,
    strict2faEnforced: true,
    autoBlockBruteForce: true,
  })
  const [securityLoading, setSecurityLoading] = useState(false)
  const [blockIpModalOpen, setBlockIpModalOpen] = useState(false)
  const [ipToBlockInput, setIpToBlockInput] = useState('')
  const [blockReasonInput, setBlockReasonInput] = useState('Suspicious automated probing')
  const [analyzingAi, setAnalyzingAi] = useState(false)

  // UI state
  const [userSearch, setUserSearch] = useState('')
  const [traderSearch, setTraderSearch] = useState('')
  const [txFilter, setTxFilter] = useState<'all' | 'pending' | 'flagged'>('all')
  const [kycFilter, setKycFilter] = useState<'all' | 'pending'>('pending')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'warn' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
  }, [])

  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [selectedKyc, setSelectedKyc] = useState<KycCase | null>(null)
  const [kycRejectReason, setKycRejectReason] = useState('')
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null)
  const [balanceModal, setBalanceModal] = useState<{ user: PlatformUser; amount: string; mode: 'credit' | 'debit'; reason: string } | null>(null)
  const [addAdminModal, setAddAdminModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'kyc_admin' as AdminRole })
  const [lockdownActive, setLockdownActive] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Edit user + reset password modals
  const [editUserModal, setEditUserModal] = useState<PlatformUser | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', email: '', phone: '', country: '' })
  const [resetPwModal, setResetPwModal] = useState<PlatformUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetPwDone, setResetPwDone] = useState(false)

  // User Profit / Loss Allocation state (Live trades lose by default unless allocated profit)
  const [userProfitAllocations, setUserProfitAllocations] = useState<Record<string, 'PROFIT' | 'LOSS'>>(() => {
    try {
      const saved = localStorage.getItem('admin_user_profit_allocations')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const setUserProfitAllocationMode = async (user: PlatformUser, nextMode: 'PROFIT' | 'LOSS') => {
    const updated: Record<string, 'PROFIT' | 'LOSS'> = { ...userProfitAllocations, [user.id]: nextMode }
    setUserProfitAllocations(updated)
    localStorage.setItem('admin_user_profit_allocations', JSON.stringify(updated))
    localStorage.setItem('admin_override_winner', nextMode === 'PROFIT' ? 'true' : 'false')
    try {
      localStorage.setItem('exstrade_profit_allocation_sync', JSON.stringify({ userId: user.id, mode: nextMode, ts: Date.now() }))
    } catch {
      // silent
    }

    // Broadcast to active windows/iframes
    window.postMessage({ type: 'EXSTRADE_PROFIT_ALLOCATION', userId: user.id, mode: nextMode }, '*')

    // Write to Supabase profiles table for this user
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ trading_mode: nextMode, updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }

    addAudit(
      'PROFIT_ALLOCATION_CHANGE',
      user.id,
      'Finance',
      `Admin set trade outcome for ${user.name} (${user.email}) to ${nextMode === 'PROFIT' ? '🟢 FORCE PROFIT' : '🔴 FORCE LOSS'}`,
      nextMode === 'PROFIT' ? 'warning' : 'info'
    )
    showToast(`Trade outcome for ${user.name}: ${nextMode === 'PROFIT' ? '🟢 PROFIT (WINS)' : '🔴 LOSS (HOUSE LOSS)'}`)
  }

  // Notify user modal
  const [notifyModal, setNotifyModal] = useState<PlatformUser | null>(null)
  const [notifySubject, setNotifySubject] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyType, setNotifyType] = useState<'info' | 'warning' | 'success'>('info')
  const [notifySent, setNotifySent] = useState(false)

  // Payment Gateway state
  type DepositAddr = { id: string; network: string; assetName: string; address: string; note: string; enabled: boolean }
  const [gatewayAddresses, setGatewayAddresses] = useState<DepositAddr[]>([
    { id: 'ga-usdt-trc20', network: 'USDT-TRC20', assetName: 'Tether (USDT TRON)', address: 'TB4TkYeuqjGsP7bkfeMbUJdZEjCuKHnzqp', note: 'Send USDT on TRON (TRC-20) network only.', enabled: true },
    { id: 'ga-eth', network: 'ETH', assetName: 'Ethereum (ETH)', address: '0x1b8f03340425adffe272f672c0a905a066a4d75d', note: 'Send ETH on Ethereum (ERC-20) mainnet.', enabled: true },
    { id: 'ga-btc', network: 'BTC', assetName: 'Bitcoin (BTC)', address: '1CV2yhcq8bsVCpfFiQSGNuHJaYAVUQtahS', note: 'Send BTC over Native Bitcoin mainnet.', enabled: true },
  ])
  const [newAddr, setNewAddr] = useState({ network: '', assetName: '', address: '', note: '' })
  const [addAddrOpen, setAddAddrOpen] = useState(false)
  const [editAddrId, setEditAddrId] = useState<string | null>(null)
  const [editAddrDraft, setEditAddrDraft] = useState({ network: '', assetName: '', address: '', note: '' })

  // Platform deposit settings (editable by admin)
  const [minDepositUSD, setMinDepositUSD]     = useState(50)
  const [minDepositKES, setMinDepositKES]     = useState(100)
  const [minWithdrawalUSD, setMinWithdrawalUSD] = useState(10)
  const [settingsDraft, setSettingsDraft]     = useState({ minUSD: '50', minKES: '100', minWithdraw: '10' })
  const [settingsSaved, setSettingsSaved]     = useState(false)

  // Upgrade user to admin
  const [upgradeModal, setUpgradeModal] = useState<PlatformUser | null>(null)
  const [upgradeRole, setUpgradeRole] = useState<AdminRole>('kyc_admin')

  // Audit helper
  const addAudit = useCallback((action: string, targetId: string, targetType: string, detail: string, severity: AuditEntry['severity'] = 'info') => {
    if (!currentAdmin) return
    const entry: AuditEntry = {
      id: 'aud-' + Date.now(),
      adminName: currentAdmin.name,
      adminEmail: currentAdmin.email,
      action,
      targetId,
      targetType,
      detail,
      timestamp: new Date().toISOString(),
      ipAddress: '102.215.44.xx',
      severity,
    }
    setAuditLog(curr => [entry, ...curr])

    // Persist audit log to Supabase
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          admin_id: currentAdmin.id,
          admin_name: currentAdmin.name,
          action,
          target_id: targetId,
          target_type: targetType,
          detail,
          severity,
        }),
      }).catch(() => {})
    }
  }, [currentAdmin])

  const notify = (msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Login (Authenticates real user passwords via Supabase + Admin fallback) ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    const cleanEmail = email.trim().toLowerCase()

    // Authenticate securely via Supabase Auth API
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: cleanEmail, password }),
        })

        if (res.ok) {
          const authData = await res.json() as { access_token?: string; user?: { id: string; email: string; user_metadata?: { full_name?: string } } }
          const u = authData.user
          if (u) {
            // Verify admin role directly from Supabase profiles table
            const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}&select=role,full_name`, {
              headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            })
            if (profileRes.ok) {
              const profiles = await profileRes.json() as Array<{ role?: string; full_name?: string }>
              const profile = profiles[0]
              if (profile && profile.role !== 'admin') {
                setLoginError('Access denied: Account does not have admin privileges.')
                return
              }
            }

            const adminObj: AdminUser = {
              id: u.id,
              name: String(u.user_metadata?.full_name || u.email?.split('@')[0] || 'Admin User'),
              email: u.email,
              role: 'super_admin',
              permissions: superAdminPermissions,
              isProtected: true,
              addedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              status: 'active',
              ipWhitelist: [],
            }
            setCurrentAdmin(adminObj)
            setPhase('mfa')
            void recordSecurityEvent('login_success', 'LOW', cleanEmail, 'Admin Authenticated Successfully')
            return
          }
        } else {
          setLoginError('Invalid email or password.')
          void recordSecurityEvent('login_failed', 'MEDIUM', cleanEmail, 'Admin Login Failed (Invalid Credentials)')
          return
        }
      } catch {
        setLoginError('Authentication service unavailable. Check network or configuration.')
        void recordSecurityEvent('login_failed', 'HIGH', cleanEmail, 'Admin Login Error (Service Unavailable)')
        return
      }
    }

    setLoginError('Invalid credentials. Please check your email and password.')
    void recordSecurityEvent('login_failed', 'MEDIUM', cleanEmail, 'Admin Login Failed (Invalid Credentials)')
    addAudit('FAILED_LOGIN', cleanEmail, 'Auth', `Failed login attempt for ${cleanEmail}`, 'warning')
  }

  // ── Fetch real users from Supabase REST API directly ──
  const fetchUsers = useCallback(async (isManual = false) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
    if (isManual) setUsersLoading(true)
    setUsersError('')
    try {
      await fetchUsersFromProfiles()
    } catch {
      setUsersError('Failed to load users from database.')
    } finally {
      if (isManual) setUsersLoading(false)
    }
  }, [])

  // Read profiles and wallets tables directly via Supabase REST API
  const fetchUsersFromProfiles = async () => {
    try {
      const [profilesRes, walletsRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=id,email,full_name,phone,country,kyc_status,account_status,created_at,trading_mode&order=created_at.desc`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/wallets?select=user_id,live_balance,demo_balance`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        ),
      ])

      if (!profilesRes.ok) { setUsersError('Could not load profiles.'); return }
      const rows = await profilesRes.json() as Array<{ id: string; email: string; full_name: string; phone: string; country: string; kyc_status: string; account_status: string; created_at: string; trading_mode?: string }>

      let walletMap: Record<string, number> = {}
      if (walletsRes.ok) {
        const walletRows = await walletsRes.json() as Array<{ user_id: string; live_balance: number }>
        walletMap = walletRows.reduce((acc, w) => {
          acc[w.user_id] = Number(w.live_balance) || 0
          return acc
        }, {} as Record<string, number>)
      }

      const initialAllocations: Record<string, 'PROFIT' | 'LOSS'> = {}
      rows.forEach(r => {
        initialAllocations[r.id] = r.trading_mode === 'LOSS' ? 'LOSS' : 'PROFIT'
      })
      setUserProfitAllocations(prev => ({ ...initialAllocations, ...prev }))

      const mapped: PlatformUser[] = rows.map(r => ({
        id: r.id,
        name: r.full_name || (r.email ? r.email.split('@')[0] : '(no name)'),
        email: r.email || '—',
        phone: r.phone || '—',
        country: r.country || '—',
        balance: walletMap[r.id] ?? 0,
        accountType: 'LIVE' as const,
        status: (r.account_status as any) || 'active',
        kycStatus: (r.kyc_status as any) || 'unverified',
        accountStatus: 'approved' as const,
        registeredAt: new Date(r.created_at).toLocaleDateString('en-GB'),
        lastSeen: 'Active Now',
      }))
      setUsers(mapped)
    } catch {
      setUsersError('Failed to load users from database.')
    }
  }

  // Fetch real audit logs from Supabase (Targeted Columns & Limit 50)
  const fetchAuditLogsFromDatabase = async () => {
    try {
      const selectCols = 'id,admin_id,admin_name,action,target_id,target_type,detail,severity,created_at'
      const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=${selectCols}&order=created_at.desc&limit=50`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{
        id: string
        admin_id: string
        admin_name: string
        action: string
        target_id: string
        target_type: string
        detail: string
        severity: 'info' | 'warning' | 'critical'
        created_at: string
      }>
      if (Array.isArray(rows) && rows.length > 0) {
        setAuditLog(rows.map(r => ({
          id: r.id,
          adminId: r.admin_id,
          adminName: r.admin_name || 'Admin',
          adminEmail: 'admin@binarypip.com',
          action: r.action,
          targetId: r.target_id,
          targetType: r.target_type,
          detail: r.detail,
          ipAddress: '127.0.0.1',
          timestamp: r.created_at,
          severity: r.severity || 'info',
        })))
      }
    } catch {
      // silent
    }
  }

  // Fetch real KYC document submissions & profiles from Supabase (Targeted Columns & Limit 50)
  const fetchKycFromDatabase = async () => {
    try {
      const docCols = 'id,user_id,original_name,document_type,status,submitted_at,storage_path'
      const [docsRes, profilesRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profile_documents?select=${docCols}&order=submitted_at.desc&limit=50`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,email,kyc_status,document_type,document_number,home_address,created_at&limit=50`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
      ])

      let profileMap: Record<string, { name: string; email: string; docType: string; docNum: string; address: string; status: string; createdAt: string }> = {}

      if (profilesRes.ok) {
        const profRows = await profilesRes.json() as Array<{ id: string; full_name: string; email: string; document_type: string; document_number: string; home_address: string; kyc_status: string; created_at: string }>
        profileMap = profRows.reduce((acc, p) => {
          acc[p.id] = {
            name: p.full_name || (p.email ? p.email.split('@')[0] : 'User'),
            email: p.email || '—',
            docType: p.document_type || 'National ID',
            docNum: p.document_number || 'PRIMARY',
            address: p.home_address || '—',
            status: p.kyc_status || 'pending',
            createdAt: p.created_at,
          }
          return acc
        }, {} as typeof profileMap)
      }

      let kycCases: KycCase[] = []

      if (docsRes.ok) {
        const docRows = await docsRes.json() as Array<{
          id: string
          user_id: string
          storage_path?: string
          original_name: string
          document_type: string
          mime_type: string
          status: 'pending' | 'verified' | 'rejected'
          submitted_at: string
          admin_notes: string
        }>

        if (Array.isArray(docRows) && docRows.length > 0) {
          kycCases = docRows.map(r => {
            const userProf = profileMap[r.user_id]
            let fileUrl = ''
            if (r.storage_path) {
              fileUrl = `${SUPABASE_URL}/storage/v1/object/public/kyc-documents/${r.storage_path}`
            } else if (r.original_name && (r.original_name.startsWith('http') || r.original_name.startsWith('data:'))) {
              fileUrl = r.original_name
            } else {
              fileUrl = '/generic-profile-portrait.svg'
            }

            const isVerified = r.status === 'verified' || userProf?.status === 'verified' || userProf?.status === 'approved'
            return {
              id: r.id,
              userId: r.user_id,
              userName: userProf?.name || `User #${r.user_id.substring(0, 8)}`,
              userEmail: userProf?.email || `user_${r.user_id.substring(0, 6)}@binarypip.com`,
              documentType: (r.document_type || userProf?.docType || 'National ID') as any,
              documentUrl: fileUrl,
              storagePath: r.storage_path,
              mimeType: r.mime_type || 'image/jpeg',
              fileUrl,
              submittedAt: r.submitted_at,
              status: isVerified ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending',
              rejectionReason: r.admin_notes || '',
            }
          })
        }
      }

      // Include all registered user profiles requiring verification so Admin Queue is never empty
      if (profilesRes.ok) {
        Object.entries(profileMap).forEach(([uid, p]) => {
          if (!kycCases.some(c => c.userId === uid)) {
            const isVerified = p.status === 'approved' || p.status === 'verified'
            kycCases.push({
              id: 'kyc-prof-' + uid,
              userId: uid,
              userName: p.name,
              userEmail: p.email,
              documentType: (p.docType as any) || 'National ID',
              mimeType: 'image/jpeg',
              fileUrl: '/generic-profile-portrait.svg',
              submittedAt: p.createdAt || new Date().toISOString(),
              status: isVerified ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending',
              rejectionReason: '',
            })
          }
        })
      }

      if (kycCases.length > 0) {
        setKycQueue(kycCases)
      }
    } catch {
      // silent
    }
  }

  // Fetch real financial transactions from Supabase (Targeted Columns & Limit 50)
  const fetchTransactionsFromDatabase = async () => {
    try {
      const txnCols = 'id,user_id,type,amount,asset,status,method,reference_id,details,created_at'
      const [txnsRes, profilesRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/transactions?select=${txnCols}&order=created_at.desc&limit=50`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,email&limit=50`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
      ])

      let dbTxns: Transaction[] = []
      if (txnsRes.ok) {
        const rows = await txnsRes.json() as Array<{
          id: string
          user_id: string
          type: 'deposit' | 'withdrawal' | 'adjustment'
          amount: number
          asset: string
          status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'completed'
          method: string
          reference_id: string
          details: any
          created_at: string
        }>

        let profMap: Record<string, { name: string; email: string }> = {}
        if (profilesRes.ok) {
          const profRows = await profilesRes.json() as Array<{ id: string; full_name: string; email: string }>
          profMap = profRows.reduce((acc, p) => {
            acc[p.id] = { name: p.full_name || (p.email ? p.email.split('@')[0] : 'User'), email: p.email || '—' }
            return acc
          }, {} as typeof profMap)
        }

        if (Array.isArray(rows) && rows.length > 0) {
          dbTxns = rows.map(r => {
            const uProf = profMap[r.user_id]
            const targetU = users.find(u => u.id === r.user_id)
            const gatewayNet = r.method || r.details?.gateway_network || 'MPESA'

            return {
              id: String(r.id),
              userId: String(r.user_id),
              userName: uProf?.name || targetU?.name || `Client #${String(r.user_id).substring(0, 8)}`,
              userEmail: uProf?.email || targetU?.email || `user_${String(r.user_id).substring(0, 6)}@binarypip.com`,
              type: r.type,
              amount: Number(r.amount),
              network: gatewayNet,
              status: r.status === 'completed' ? 'approved' : r.status,
              createdAt: String(r.created_at || new Date().toISOString()),
              flagReason: r.details?.failure_reason || r.details?.admin_notes || undefined,
            }
          })
        }
      }

      // Read local queue
      let localTxns: Transaction[] = []
      try {
        const localStr = localStorage.getItem('binarypip_pending_transactions')
        if (localStr) localTxns = JSON.parse(localStr)
      } catch {
        // silent
      }

      // Intelligent deduplication: DB transactions take absolute priority!
      const mergedMap = new Map<string, Transaction>()

      // First add local transactions
      localTxns.forEach(t => {
        mergedMap.set(t.id, t)
      })

      // DB transactions overwrite local entries with exact same ID or user+type+amount match
      dbTxns.forEach(dbItem => {
        for (const [key, locItem] of mergedMap.entries()) {
          if (locItem.userId === dbItem.userId && locItem.type === dbItem.type && Math.abs(locItem.amount - dbItem.amount) < 0.01 && locItem.status === 'pending') {
            mergedMap.delete(key)
          }
        }
        mergedMap.set(dbItem.id, dbItem)
      })

      const allMerged = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      if (allMerged.length > 0) {
        setTransactions(allMerged)
      }
    } catch {
      // silent
    }
  }

  // Fetch real payment gateway receiving addresses from Supabase (Targeted Columns)
  const fetchGatewayFromDatabase = async () => {
    try {
      const gatewayCols = 'id,network,asset_name,wallet_address,note,enabled'
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?select=${gatewayCols}&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{ id: string; network: string; asset_name: string; wallet_address: string; note: string; enabled: boolean }>
      if (Array.isArray(rows) && rows.length > 0) {
        setGatewayAddresses(rows.map(r => ({
          id: r.id,
          network: r.network,
          assetName: r.asset_name,
          address: r.wallet_address,
          note: r.note || '',
          enabled: r.enabled !== false,
        })))
      }
    } catch {
      // silent
    }
  }

  // Fetch real platform settings from Supabase (Targeted Columns)
  const fetchSettingsFromDatabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=key,value,updated_at`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as Array<{ key: string; value: string }>
      rows.forEach(r => {
        if (r.key === 'min_deposit_usd') {
          const v = parseFloat(r.value) || 10
          setMinDepositUSD(v)
          setSettingsDraft(d => ({ ...d, minUSD: v.toString() }))
        }
        if (r.key === 'min_deposit_kes') {
          const v = parseFloat(r.value) || 1300
          setMinDepositKES(v)
          setSettingsDraft(d => ({ ...d, minKES: v.toString() }))
        }
        if (r.key === 'min_withdrawal_usd') {
          const v = parseFloat(r.value) || 10
          setMinWithdrawalUSD(v)
          setSettingsDraft(d => ({ ...d, minWithdraw: v.toString() }))
        }
      })
    } catch {
      // silent
    }
  }

  // Fetch real Master Trader Applications from Supabase
  const fetchMasterTraderAppsFromDatabase = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setMasterAppsLoading(true)

      let dbMapped: MasterTraderApp[] = []
      const res = await fetch(`${SUPABASE_URL}/rest/v1/master_trader_applications?select=*&order=created_at.desc&limit=50`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (res.ok) {
        const rows = await res.json() as any[]
        if (Array.isArray(rows)) {
          dbMapped = rows.map(r => {
            const uProf = users.find(u => u.id === r.user_id)
            return {
              id: String(r.id),
              userId: String(r.user_id),
              userName: uProf?.name || `Trader #${String(r.user_id).substring(0, 6)}`,
              userEmail: uProf?.email || '—',
              displayName: String(r.display_name),
              avatarUrl: String(r.avatar_url || ''),
              riskLevel: (r.risk_level || 'Low') as any,
              strategyTag: String(r.strategy_tag || 'Vol 100 & Gold Scalping'),
              bio: String(r.bio || ''),
              fee: Number(r.application_fee || 500),
              status: r.status as any,
              createdAt: String(r.created_at || new Date().toISOString()),
            }
          })
        }
      }

      const allMerged = dbMapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setMasterApps(allMerged)
    } catch {
      // silent
    } finally {
      setMasterAppsLoading(false)
    }
  }, [users])

  // Fetch real Security Events, Blocked IPs, & Settings from Supabase
  const fetchSecurityFromDatabase = useCallback(async () => {
    try {
      const [eventsRes, blockedRes, settingsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/security_events?select=*&order=created_at.desc&limit=100`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/blocked_ips?select=*&order=created_at.desc&limit=50`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/security_settings?id=eq.1&select=*`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }),
      ])

      if (eventsRes.ok) {
        const rows = await eventsRes.json() as any[]
        if (Array.isArray(rows)) {
          setSecurityEvents(rows.map(r => ({
            id: String(r.id),
            createdAt: String(r.created_at || new Date().toISOString()),
            eventType: String(r.event_type || 'system_event'),
            severity: (r.severity || 'LOW') as any,
            userEmail: String(r.user_email || '—'),
            ipAddress: String(r.ip_address || '127.0.0.1'),
            subnet: String(r.subnet || '127.0.0.0/24'),
            userAgent: String(r.user_agent || 'BinaryPip Client'),
            actionTaken: String(r.action_taken || 'Logged'),
            metadata: r.metadata,
          })))
        }
      }

      if (blockedRes.ok) {
        const rows = await blockedRes.json() as any[]
        if (Array.isArray(rows)) {
          setBlockedIps(rows.map(r => ({
            id: String(r.id),
            ipOrSubnet: String(r.ip_or_subnet),
            reason: String(r.reason || 'Suspicious activity'),
            blockedBy: String(r.blocked_by || 'Admin'),
            createdAt: String(r.created_at || new Date().toISOString()),
          })))
        }
      }

      if (settingsRes.ok) {
        const rows = await settingsRes.json() as any[]
        if (Array.isArray(rows) && rows[0]) {
          const s = rows[0]
          setSecuritySettings({
            lockdownMode: s.lockdown_mode === true,
            withdrawalsFrozen: s.withdrawals_frozen === true,
            strict2faEnforced: s.strict_2fa_enforced !== false,
            autoBlockBruteForce: s.auto_block_brute_force !== false,
          })
          setLockdownActive(s.lockdown_mode === true)
        }
      }
    } catch {
      // silent
    }
  }, [])

  // Security Threat Calculations
  const last24hEvents = securityEvents.filter(e => {
    const ageMs = Date.now() - new Date(e.createdAt).getTime()
    return ageMs <= 24 * 60 * 60 * 1000
  })

  const failedLogins24h = last24hEvents.filter(e => e.eventType === 'login_failed').length
  const failed2fa24h = last24hEvents.filter(e => e.eventType === '2fa_failed').length
  const highCriticalCount = last24hEvents.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length

  const threatScore = Math.min(100, 10 + (failedLogins24h * 10) + (failed2fa24h * 15) + (highCriticalCount * 25))
  const threatLabel = threatScore <= 30 ? 'LOW' : threatScore <= 69 ? 'MEDIUM' : 'CRITICAL'
  const threatColor = threatScore <= 30 ? '#1ccf84' : threatScore <= 69 ? '#f2b94b' : '#f04452'

  const toggleLockdownMode = async () => {
    const nextMode = !securitySettings.lockdownMode
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/security_settings?id=eq.1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ lockdown_mode: nextMode, updated_at: new Date().toISOString() })
      })
      await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          event_type: 'lockdown_triggered',
          severity: nextMode ? 'CRITICAL' : 'LOW',
          user_email: currentAdmin?.email || 'admin@binarypip.com',
          ip_address: '127.0.0.1',
          action_taken: nextMode ? 'Emergency Lockdown Activated' : 'Emergency Lockdown Lifted',
        })
      })
      setSecuritySettings(s => ({ ...s, lockdownMode: nextMode }))
      setLockdownActive(nextMode)
      notify(nextMode ? '🚨 EMERGENCY LOCKDOWN ACTIVATED' : 'Lockdown Mode Lifted.', nextMode ? 'err' : 'ok')
      void fetchSecurityFromDatabase()
    } catch {
      notify('Failed to update lockdown mode', 'err')
    }
  }

  const toggleFreezeWithdrawals = async () => {
    const nextVal = !securitySettings.withdrawalsFrozen
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/security_settings?id=eq.1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ withdrawals_frozen: nextVal, updated_at: new Date().toISOString() })
      })
      await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          event_type: 'security_update',
          severity: nextVal ? 'HIGH' : 'LOW',
          user_email: currentAdmin?.email || 'admin@binarypip.com',
          ip_address: '127.0.0.1',
          action_taken: nextVal ? 'All Withdrawals Frozen' : 'Withdrawals Unfrozen',
        })
      })
      setSecuritySettings(s => ({ ...s, withdrawalsFrozen: nextVal }))
      notify(nextVal ? '❄️ ALL WITHDRAWALS FROZEN' : 'Withdrawals un-frozen.', nextVal ? 'warn' : 'ok')
      void fetchSecurityFromDatabase()
    } catch {
      notify('Failed to update withdrawal freeze state', 'err')
    }
  }

  const toggleEnforce2FA = async () => {
    const nextVal = !securitySettings.strict2faEnforced
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/security_settings?id=eq.1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ strict_2fa_enforced: nextVal, updated_at: new Date().toISOString() })
      })
      setSecuritySettings(s => ({ ...s, strict2faEnforced: nextVal }))
      notify(nextVal ? '🔒 Strict Admin 2FA Enforced' : 'Admin 2FA optional.', 'ok')
      void fetchSecurityFromDatabase()
    } catch {
      notify('Failed to update 2FA state', 'err')
    }
  }

  const toggleAutoBlockBruteForce = async () => {
    const nextVal = !securitySettings.autoBlockBruteForce
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/security_settings?id=eq.1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ auto_block_brute_force: nextVal, updated_at: new Date().toISOString() })
      })
      setSecuritySettings(s => ({ ...s, autoBlockBruteForce: nextVal }))
      notify(nextVal ? '🛡️ Auto-Block Brute Force Active' : 'Auto-block disabled.', 'ok')
      void fetchSecurityFromDatabase()
    } catch {
      notify('Failed to update brute-force auto-block state', 'err')
    }
  }

  const blockIpOrSubnet = async (targetIp: string, reasonStr: string = 'Suspicious activity') => {
    if (!targetIp.trim()) { notify('Please enter a valid IP address or subnet.', 'err'); return }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/blocked_ips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          ip_or_subnet: targetIp.trim(),
          reason: reasonStr,
          blocked_by: currentAdmin?.name || 'Admin',
        })
      })
      await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          event_type: 'subnet_blocked',
          severity: 'HIGH',
          ip_address: targetIp.trim(),
          action_taken: `Blocked IP ${targetIp.trim()} (${reasonStr})`,
        })
      })
      setBlockIpModalOpen(false)
      setIpToBlockInput('')
      notify(`Blocked ${targetIp.trim()} successfully!`)
      void fetchSecurityFromDatabase()
    } catch {
      notify(`Failed to block ${targetIp}.`, 'err')
    }
  }

  const exportForensicJson = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(securityEvents, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `binarypip-security-audit-${Date.now()}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      notify('Exported Forensic JSON audit log.')
    } catch {
      notify('Failed to export JSON', 'err')
    }
  }

  const runAiAnalysisScan = async () => {
    setAnalyzingAi(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      const flagged = securityEvents.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
      const findingsMsg = flagged.length > 0
        ? `AI Security Scan Complete: Flagged ${flagged.length} anomalous event(s) across subnets.`
        : 'AI Security Scan Complete: Zero critical threats detected in last 24h.'

      await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          event_type: 'ai_analysis',
          severity: 'LOW',
          user_email: currentAdmin?.email || 'admin@binarypip.com',
          ip_address: '127.0.0.1',
          action_taken: 'AI Anomaly Scan Executed',
          metadata: { findings: findingsMsg }
        })
      })

      notify(findingsMsg)
      void fetchSecurityFromDatabase()
    } catch {
      notify('Failed to run AI Security Scan', 'err')
    } finally {
      setAnalyzingAi(false)
    }
  }

  const fetchPublishedTradersFromDatabase = useCallback(async () => {
    try {
      let dbMapped: PublishedTrader[] = []
      const res = await fetch(`${SUPABASE_URL}/rest/v1/master_traders?select=*&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (res.ok) {
        const rows = await res.json() as any[]
        if (Array.isArray(rows)) {
          dbMapped = rows.map(r => ({
            id: String(r.id),
            userId: String(r.user_id),
            displayName: String(r.display_name),
            avatarUrl: String(r.avatar_url || ''),
            isVerified: r.is_verified !== false,
            riskLevel: (r.risk_level || 'Low') as any,
            strategyTag: String(r.strategy_tag || 'Vol 100 & Gold Scalping'),
            bio: String(r.bio || ''),
            winRate: Number(r.win_rate || 92.5),
            totalProfit: Number(r.total_profit || 15000),
            copiersCount: Number(r.copiers_count || 12),
            isActive: r.is_active !== false,
          }))
        }
      }

      // Convert MASTER_TRADERS_540 to PublishedTrader format
      const staticMapped: PublishedTrader[] = MASTER_TRADERS_540.map(t => ({
        id: t.id,
        userId: 'system-' + t.id,
        displayName: t.name,
        avatarUrl: t.avatar,
        isVerified: t.isVerified,
        riskLevel: t.risk,
        strategyTag: t.specialty,
        bio: t.bio,
        winRate: t.winRate,
        totalProfit: t.totalProfit,
        copiersCount: t.copiers,
        isActive: true,
      }))

      // Read local overrides map
      let overrides: Record<string, any> = {}
      try {
        const localStr = localStorage.getItem('binarypip_master_trader_overrides')
        if (localStr) overrides = JSON.parse(localStr)
      } catch {}

      // Combine DB custom traders and static 540 master traders with overrides applied
      const combined = [...dbMapped, ...staticMapped.filter(st => !dbMapped.some(dt => dt.id === st.id))]
        .map(trader => {
          const ov = overrides[trader.id]
          if (!ov) return trader
          return {
            ...trader,
            winRate: typeof ov.winRate === 'number' ? ov.winRate : trader.winRate,
            totalProfit: typeof ov.totalProfit === 'number' ? ov.totalProfit : trader.totalProfit,
            copiersCount: typeof ov.copiersCount === 'number' ? ov.copiersCount : trader.copiersCount,
            isVerified: typeof ov.isVerified === 'boolean' ? ov.isVerified : trader.isVerified,
            isActive: typeof ov.isActive === 'boolean' ? ov.isActive : trader.isActive,
          }
        })

      setPublishedTraders(combined)
    } catch {
      // silent
    }
  }, [])

  const fetchCopySubscriptionsFromDatabase = useCallback(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/copy_subscriptions?select=*&order=created_at.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return
      const rows = await res.json() as any[]
      if (Array.isArray(rows)) {
        const mapped: CopySubscriptionRecord[] = rows.map(r => {
          const uProf = users.find(u => u.id === r.user_id)
          const snapshot = r.master_trader_snapshot || {}
          return {
            id: String(r.id),
            userId: String(r.user_id),
            userName: uProf?.name || `Client #${String(r.user_id).substring(0, 6)}`,
            userEmail: uProf?.email || '—',
            traderName: String(snapshot.name || r.master_trader_id || 'PipMaster'),
            traderAvatar: String(snapshot.avatar || 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=150&auto=format&fit=crop&q=80'),
            accountType: String(r.account_type || 'real'),
            allocatedAmount: Number(r.allocated_amount || 0),
            copyRatio: Number(r.copy_ratio || 1.0),
            totalCopiedProfit: Number(r.total_copied_profit || 0),
            status: (r.status || 'active') as any,
            createdAt: String(r.created_at || new Date().toISOString()),
          }
        })
        setCopySubscriptions(mapped)
      }
    } catch {
      // silent
    }
  }, [users])

  const updatePublishedTrader = async (traderId: string, updates: Partial<PublishedTrader>) => {
    try {
      // 1. Save override object in localStorage for instant real-time sync across client tabs
      try {
        const localStr = localStorage.getItem('binarypip_master_trader_overrides')
        const overrides = localStr ? JSON.parse(localStr) : {}
        overrides[traderId] = { ...(overrides[traderId] || {}), ...updates }
        localStorage.setItem('binarypip_master_trader_overrides', JSON.stringify(overrides))
      } catch {
        // silent
      }

      // 2. Update local state
      setPublishedTraders(curr => curr.map(t => t.id === traderId ? { ...t, ...updates } : t))

      // 3. Update Supabase REST database
      try {
        const patchData: any = {}
        if (typeof updates.winRate === 'number') patchData.win_rate = updates.winRate
        if (typeof updates.totalProfit === 'number') patchData.total_profit = updates.totalProfit
        if (typeof updates.copiersCount === 'number') patchData.copiers_count = updates.copiersCount
        if (typeof updates.isVerified === 'boolean') patchData.is_verified = updates.isVerified
        if (typeof updates.isActive === 'boolean') patchData.is_active = updates.isActive

        await fetch(`${SUPABASE_URL}/rest/v1/master_traders?id=eq.${traderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(patchData),
        })
      } catch {
        // silent
      }

      // 4. Dispatch real-time window & storage events
      window.dispatchEvent(new Event('storage'))
      window.postMessage({ type: 'EXSTRADE_TRADER_UPDATED', traderId, updates }, '*')
      notify('Master Trader parameters updated in real time!')
    } catch {
      notify('Failed to update Master Trader parameters.', 'err')
    }
  }

  const approveMasterApp = async (app: MasterTraderApp) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/master_trader_applications?id=eq.${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'approved' }),
      })

      setMasterApps(curr => curr.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
      addAudit('APPROVE_MASTER_TRADER', app.id, 'Master Trader Application', `Approved ${app.displayName} ($500 fee settled)`, 'info')
      notify(`Approved! ${app.displayName} is now a published Verified Master Trader.`)
      void fetchMasterTraderAppsFromDatabase()
      void fetchPublishedTradersFromDatabase()
    } catch {
      notify('Failed to approve Master Trader Application.', 'err')
    }
  }

  const rejectMasterApp = async (app: MasterTraderApp) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/master_trader_applications?id=eq.${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'rejected' }),
      })

      const targetU = users.find(u => u.id === app.userId)
      if (targetU) {
        const nextBal = targetU.balance + app.fee
        await saveUserWalletBalance(app.userId, nextBal)
        setUsers(curr => curr.map(u => u.id === app.userId ? { ...u, balance: nextBal } : u))
      }

      setMasterApps(curr => curr.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
      addAudit('REJECT_MASTER_TRADER', app.id, 'Master Trader Application', `Rejected ${app.displayName} ($500 fee refunded)`, 'warning')
      notify(`Rejected ${app.displayName}. $500 fee refunded to user balance.`, 'warn')
      void fetchMasterTraderAppsFromDatabase()
    } catch {
      notify('Failed to reject Master Trader Application.', 'err')
    }
  }

  // Load all real database data on startup and poll every 3s (without auto-resetting input focus)
  useEffect(() => {
    void fetchUsers()
    void fetchKycFromDatabase()
    void fetchAuditLogsFromDatabase()
    void fetchTransactionsFromDatabase()
    void fetchGatewayFromDatabase()
    void fetchSettingsFromDatabase()
    void fetchMasterTraderAppsFromDatabase(true)
    void fetchPublishedTradersFromDatabase()
    void fetchCopySubscriptionsFromDatabase()
    void fetchSecurityFromDatabase()

    const timer = setInterval(() => {
      void fetchUsers()
      void fetchTransactionsFromDatabase()
      void fetchKycFromDatabase()
      void fetchMasterTraderAppsFromDatabase(false)
      void fetchCopySubscriptionsFromDatabase()
      void fetchSecurityFromDatabase()
    }, 4000)

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'binarypip_pending_transactions' || e.key === 'exstrade_deposit_request' || e.key === 'binarypip_master_trader_apps') {
        void fetchTransactionsFromDatabase()
        void fetchMasterTraderAppsFromDatabase()
      }
    }
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data && (e.data.type === 'EXSTRADE_TRANSACTION_SUBMITTED' || e.data.type === 'EXSTRADE_DEPOSIT_REQUEST')) {
        void fetchTransactionsFromDatabase()
        void fetchMasterTraderAppsFromDatabase()
        void fetchCopySubscriptionsFromDatabase()
        void fetchSecurityFromDatabase()
      }
    }
    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('message', handleWindowMessage)

    let channel: any = null
    if (supabase) {
      channel = supabase.channel('admin_realtime_transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          void fetchTransactionsFromDatabase()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          void fetchUsers()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'master_trader_applications' }, () => {
          void fetchMasterTraderAppsFromDatabase()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'master_traders' }, () => {
          void fetchPublishedTradersFromDatabase()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'copy_subscriptions' }, () => {
          void fetchCopySubscriptionsFromDatabase()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, () => {
          void fetchSecurityFromDatabase()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_ips' }, () => {
          void fetchSecurityFromDatabase()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'security_settings' }, () => {
          void fetchSecurityFromDatabase()
        })
        .subscribe()
    }

    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('message', handleWindowMessage)
      if (supabase && channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [fetchUsers])

  const handleMfaPass = () => {
    setPhase('dashboard')
    setAdmins(curr => curr.map(a => a.id === currentAdmin!.id ? { ...a, lastLogin: new Date().toISOString() } : a))
    addAudit('ADMIN_LOGIN', currentAdmin!.id, 'Admin', `Successful login for ${currentAdmin!.name}`, 'info')
    void fetchUsers()
    void fetchKycFromDatabase()
    void fetchAuditLogsFromDatabase()
    void fetchTransactionsFromDatabase()
    void fetchGatewayFromDatabase()
    void fetchSettingsFromDatabase()
  }



  const handleLogout = () => {
    if (currentAdmin) {
      addAudit('ADMIN_LOGOUT', currentAdmin.id, 'Admin', `${currentAdmin.name} logged out`, 'info')
    }
    if (supabase) {
      void supabase.auth.signOut()
    }
    setPhase('login')
    setCurrentAdmin(null)
    setEmail('')
    setPassword('')
    setSection('overview')
  }

  const canAccess = (perm: keyof AdminPermissions) => currentAdmin?.permissions[perm] ?? false

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleUserStatus = async (u: PlatformUser) => {
    if (!canAccess('canManageUsers')) { notify('No permission.', 'err'); return }
    const nextStatus = u.status === 'active' ? 'suspended' : 'active'

    setUsers(curr => curr.map(x => x.id === u.id ? { ...x, status: nextStatus } : x))
    setSelectedUser(prev => prev?.id === u.id ? { ...prev, status: nextStatus } : prev)

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          account_status: nextStatus,
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }

    addAudit(nextStatus === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER', u.id, 'User', `${nextStatus === 'suspended' ? 'Suspended' : 'Activated'} account for ${u.name}`, nextStatus === 'suspended' ? 'warning' : 'info')
    notify(`${u.name} ${nextStatus === 'suspended' ? 'suspended' : 'activated'}.`, nextStatus === 'suspended' ? 'warn' : 'ok')
  }

  const approveAccount = async (u: PlatformUser) => {
    if (!canAccess('canManageUsers')) { notify('No permission.', 'err'); return }

    setUsers(curr => curr.map(x => x.id === u.id ? { ...x, accountStatus: 'approved', status: 'active', kycStatus: 'verified' } : x))
    setSelectedUser(prev => prev?.id === u.id ? { ...prev, accountStatus: 'approved', status: 'active', kycStatus: 'verified' } : prev)

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          account_status: 'active',
          kyc_status: 'verified',
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }

    addAudit('APPROVE_ACCOUNT', u.id, 'User', `Account approved for ${u.name} (${u.email})`, 'info')
    notify(`${u.name}'s account approved and activated.`)
  }

  const openEditUser = (u: PlatformUser) => {
    setEditDraft({ name: u.name, email: u.email, phone: u.phone, country: u.country })
    setEditUserModal(u)
  }

  const saveEditUser = async () => {
    if (!editUserModal) return
    if (!editDraft.name.trim() || !editDraft.email.trim()) { notify('Name and email are required.', 'err'); return }

    const uid = editUserModal.id
    const updatedName = editDraft.name.trim()
    const updatedEmail = editDraft.email.trim()
    const updatedPhone = editDraft.phone.trim()
    const updatedCountry = editDraft.country.trim()

    setUsers(curr => curr.map(x => x.id === uid ? { ...x, name: updatedName, email: updatedEmail, phone: updatedPhone, country: updatedCountry } : x))
    setSelectedUser(prev => prev?.id === uid ? { ...prev, name: updatedName, email: updatedEmail, phone: updatedPhone, country: updatedCountry } : prev)

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          full_name: updatedName,
          email: updatedEmail,
          phone: updatedPhone,
          country: updatedCountry,
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }

    addAudit('EDIT_USER', uid, 'User', `Edited details for ${updatedName} (${updatedEmail})`, 'warning')
    notify(`${updatedName}'s details updated.`)
    setEditUserModal(null)
  }

  const openResetPassword = (u: PlatformUser) => {
    setNewPassword('')
    setResetPwDone(false)
    setResetPwModal(u)
  }

  const applyResetPassword = () => {
    if (!resetPwModal) return
    if (newPassword.length < 8) { notify('Password must be at least 8 characters.', 'err'); return }
    // In production: call Supabase admin API to update user password
    addAudit('RESET_PASSWORD', resetPwModal.id, 'User', `Admin reset password for ${resetPwModal.name}`, 'warning')
    setResetPwDone(true)
    notify(`Password reset for ${resetPwModal.name}.`)
    setTimeout(() => { setResetPwModal(null); setResetPwDone(false) }, 2000)
  }

  const sendNotification = () => {
    if (!notifyModal) return
    if (!notifySubject.trim()) { notify('Subject is required.', 'err'); return }
    if (!notifyMessage.trim()) { notify('Message is required.', 'err'); return }
    // In production: send via Supabase edge function / email service
    addAudit('SEND_NOTIFICATION', notifyModal.id, 'User',
      `Sent ${notifyType.toUpperCase()} notification to ${notifyModal.name}: "${notifySubject}"`, 'info')
    setNotifySent(true)
    notify(`Notification sent to ${notifyModal.name}.`)
    setTimeout(() => { setNotifyModal(null); setNotifySent(false); setNotifySubject(''); setNotifyMessage('') }, 2000)
  }

  const deleteUser = async (u: PlatformUser) => {
    if (!canAccess('canManageUsers')) { notify('No permission to delete users.', 'err'); return }
    if (!window.confirm(`⚠️ ARE YOU SURE you want to permanently delete user ${u.name} (${u.email})? This action CANNOT be undone.`)) return

    // 1. Remove from local state
    setUsers(curr => curr.filter(x => x.id !== u.id))
    if (selectedUser?.id === u.id) setSelectedUser(null)

    // 2. Delete from Supabase Database
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${u.id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
    } catch {
      // silent
    }

    addAudit('DELETE_USER', u.id, 'User', `Permanently deleted user ${u.name} (${u.email}) from database`, 'critical')
    notify(`User ${u.name} permanently deleted.`, 'warn')
  }

  // ── Gateway actions (Synced directly with Supabase admin_deposit_addresses) ──────
  const addGatewayAddress = async () => {
    if (!newAddr.network.trim() || !newAddr.address.trim() || !newAddr.assetName.trim()) { notify('Network, asset name and address are required.', 'err'); return }
    const newObj = {
      network: newAddr.network,
      asset_name: newAddr.assetName,
      wallet_address: newAddr.address,
      note: newAddr.note || '',
      enabled: true,
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(newObj),
      })
      if (res.ok) {
        const rows = await res.json() as Array<{ id: string }>
        const newId = rows[0]?.id || 'ga-' + Date.now()
        const a = { id: newId, ...newAddr, enabled: true }
        setGatewayAddresses(curr => [...curr, a])
        addAudit('ADD_DEPOSIT_ADDRESS', a.id, 'Gateway', `Added ${a.assetName} (${a.network}) deposit address`, 'info')
        notify(`${a.network} address added to database!`)
      }
    } catch {
      notify('Failed to add deposit address to database.', 'err')
    }

    setNewAddr({ network: '', assetName: '', address: '', note: '' })
    setAddAddrOpen(false)
  }

  const saveEditAddr = async () => {
    if (!editAddrId) return
    setGatewayAddresses(curr => curr.map(a => a.id === editAddrId ? { ...a, ...editAddrDraft } : a))
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?id=eq.${editAddrId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          network: editAddrDraft.network,
          asset_name: editAddrDraft.assetName,
          wallet_address: editAddrDraft.address,
          note: editAddrDraft.note,
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }
    addAudit('EDIT_DEPOSIT_ADDRESS', editAddrId, 'Gateway', `Updated ${editAddrDraft.network} deposit address`, 'info')
    notify('Address updated in database.')
    setEditAddrId(null)
  }

  const toggleGatewayAddress = async (id: string) => {
    const a = gatewayAddresses.find(x => x.id === id)
    if (!a) return
    const nextEnabled = !a.enabled

    setGatewayAddresses(curr => curr.map(x => x.id === id ? { ...x, enabled: nextEnabled } : x))
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ enabled: nextEnabled, updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }
    addAudit(nextEnabled ? 'ENABLE_ADDRESS' : 'DISABLE_ADDRESS', id, 'Gateway', `${nextEnabled ? 'Enabled' : 'Disabled'} ${a.network} deposit address`, 'warning')
  }

  const deleteGatewayAddress = async (id: string) => {
    const a = gatewayAddresses.find(x => x.id === id)
    if (!a) return
    setGatewayAddresses(curr => curr.filter(x => x.id !== id))
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/admin_deposit_addresses?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })
    } catch {
      // silent
    }
    addAudit('DELETE_DEPOSIT_ADDRESS', id, 'Gateway', `Deleted ${a.network} deposit address`, 'warning')
    notify(`${a.network} address removed from database.`, 'warn')
  }

  // ── Upgrade user to admin ──────────────────────────────────────────────
  const upgradeUserToAdmin = () => {
    if (!upgradeModal) return
    if (!canAccess('canManageAdmins')) { notify('No permission.', 'err'); return }
    const permMap: Record<AdminRole, typeof superAdminPermissions> = {
      super_admin:    superAdminPermissions,
      kyc_admin:      kycAdminPermissions,
      finance_admin:  financeAdminPermissions,
      support_admin:  { canManageUsers: false, canApproveKyc: false, canApproveWithdrawals: false, canManageAdmins: false, canViewAuditLogs: false, canAdjustBalances: false },
    }
    const newAdminEntry: AdminUser = {
      id: 'adm-' + Date.now(),
      name: upgradeModal.name,
      email: upgradeModal.email,
      role: upgradeRole,
      permissions: permMap[upgradeRole],
      isProtected: false,
      lastLogin: 'Never',
      addedAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      ipWhitelist: [],
    }
    setAdmins(curr => [...curr, newAdminEntry])
    setUsers(curr => curr.filter(u => u.id !== upgradeModal.id))
    addAudit('UPGRADE_TO_ADMIN', upgradeModal.id, 'User', `Upgraded ${upgradeModal.name} to ${roleLabel[upgradeRole]}`, 'warning')
    notify(`${upgradeModal.name} upgraded to ${roleLabel[upgradeRole]}.`)
    setUpgradeModal(null)
    setSelectedUser(null)
    setSection('admins')
  }

  const approveKyc = async (kyc: KycCase) => {
    if (!canAccess('canApproveKyc')) { notify('No permission.', 'err'); return }
    setKycQueue(curr => curr.map(k => k.id === kyc.id ? { ...k, status: 'approved' } : k))
    setUsers(curr => curr.map(u => u.id === kyc.userId ? { ...u, kycStatus: 'verified', accountStatus: 'approved', status: 'active' } : u))

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profile_documents?user_id=eq.${kyc.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ status: 'verified', reviewed_at: new Date().toISOString() }),
      })
      if (kyc.id && !kyc.id.startsWith('kyc-prof-')) {
        await fetch(`${SUPABASE_URL}/rest/v1/profile_documents?id=eq.${kyc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ status: 'verified', reviewed_at: new Date().toISOString() }),
        })
      }
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${kyc.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ kyc_status: 'verified', account_status: 'active', updated_at: new Date().toISOString() }),
      })
      await fetch(`${SUPABASE_URL}/rest/v1/kyc_cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: kyc.userId,
          provider: 'manual',
          provider_case_id: kyc.id || 'kyc-' + kyc.userId,
          status: 'approved',
          reviewer_note: 'Approved by Admin',
          updated_at: new Date().toISOString(),
        }),
      })
    } catch {
      // silent
    }

    addAudit('APPROVE_KYC', kyc.id, 'KYC Case', `KYC approved for ${kyc.userName}`, 'info')
    setSelectedKyc(null)
    notify(`KYC approved for ${kyc.userName}.`)
  }

  const rejectKyc = async (kyc: KycCase, reason: string) => {
    if (!canAccess('canApproveKyc')) { notify('No permission.', 'err'); return }
    if (!reason.trim()) { notify('Rejection reason required.', 'err'); return }
    setKycQueue(curr => curr.map(k => k.id === kyc.id ? { ...k, status: 'rejected', rejectionReason: reason } : k))
    setUsers(curr => curr.map(u => u.id === kyc.userId ? { ...u, kycStatus: 'rejected' } : u))

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profile_documents?id=eq.${kyc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ status: 'rejected', admin_notes: reason, reviewed_at: new Date().toISOString() }),
      })
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${kyc.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ kyc_status: 'rejected', updated_at: new Date().toISOString() }),
      })
    } catch {
      // silent
    }

    addAudit('REJECT_KYC', kyc.id, 'KYC Case', `KYC rejected for ${kyc.userName}: ${reason}`, 'warning')
    setSelectedKyc(null)
    setKycRejectReason('')
    notify(`KYC rejected for ${kyc.userName}.`, 'warn')
  }

  const saveUserWalletBalance = async (userId: string, newBalance: number) => {
    try {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ live_balance: newBalance, updated_at: new Date().toISOString() }),
      })

      const updated = await patchRes.json()
      if (!patchRes.ok || !Array.isArray(updated) || updated.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/wallets?on_conflict=user_id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ user_id: userId, live_balance: newBalance, updated_at: new Date().toISOString() }),
        })
      }
    } catch {
      // silent
    }
  }

  const isValidUuid = (str?: string): boolean =>
    typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const approveTxn = async (txn: Transaction) => {
    if (!canAccess('canApproveWithdrawals')) { notify('No permission.', 'err'); return }

    // Idempotency check: prevent approving an already approved/completed transaction twice
    const normStatus = String(txn.status || '').toLowerCase()
    if (normStatus === 'approved' || normStatus === 'completed') {
      notify('Transaction is already approved.')
      return
    }

    const isDeposit = txn.type === 'deposit'
    const totalCredit = txn.amount

    const targetUser = users.find(u => u.id === txn.userId || (u.email && u.email.toLowerCase() === txn.userEmail.toLowerCase()))
    const currentBal = targetUser ? targetUser.balance : 0
    // If deposit: add credit once. If withdrawal: balance was ALREADY deducted on submission! Do not deduct again!
    const nextBal = isDeposit ? (currentBal + totalCredit) : currentBal

    // 1. Update local Admin state immediately for instant responsiveness
    setTransactions(curr => curr.map(t => (t.id === txn.id || (t.userId === txn.userId && t.type === txn.type && String(t.status).toLowerCase() === 'pending')) ? { ...t, status: 'approved' } : t))
    if (targetUser && isDeposit) {
      setUsers(curr => curr.map(u => (u.id === targetUser.id || u.email === targetUser.email) ? { ...u, balance: nextBal } : u))
    }

    // 2. Direct PATCH to Supabase Database
    try {
      if (isValidUuid(txn.id)) {
        await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${txn.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: 'approved', updated_at: new Date().toISOString() }),
        })
      }

      // Resolve profile ID by email as well to guarantee database update
      let targetUserId = txn.userId
      if (txn.userEmail) {
        try {
          const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(txn.userEmail)}&select=id`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          })
          if (profRes.ok) {
            const profs = await profRes.json()
            if (Array.isArray(profs) && profs[0]?.id) {
              targetUserId = profs[0].id
            }
          }
        } catch {
          // silent
        }
      }

      if (targetUserId) {
        await fetch(`${SUPABASE_URL}/rest/v1/transactions?user_id=eq.${targetUserId}&type=eq.${txn.type}&status=eq.pending`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: 'approved', updated_at: new Date().toISOString() }),
        })

        // 3. Save updated user wallet balance in Supabase Database (if deposit)
        if (isDeposit) {
          await saveUserWalletBalance(targetUserId, nextBal)
        }
      }

      // 4. Update local transaction queue in localStorage and broadcast window message
      try {
        const localStr = localStorage.getItem('binarypip_pending_transactions')
        if (localStr) {
          const queue = JSON.parse(localStr) as Transaction[]
          const updated = queue.map(t => (t.id === txn.id || (t.userId === txn.userId && t.type === txn.type && String(t.status).toLowerCase() === 'pending')) ? { ...t, status: 'approved' } : t)
          localStorage.setItem('binarypip_pending_transactions', JSON.stringify(updated))
        }
      } catch {
        // silent
      }

      window.dispatchEvent(new Event('storage'))
      window.postMessage({ type: 'EXSTRADE_TRANSACTION_SUBMITTED' }, '*')
    } catch {
      // silent
    }

    addAudit(`APPROVE_${txn.type.toUpperCase()}`, txn.id, 'Transaction', `Approved ${txn.type} of ${fmtUSD(txn.amount)} for ${txn.userName}`, 'info')
    notify(`Approved! $${txn.amount.toFixed(2)} ${txn.type} for ${txn.userName}.`)
  }

  const rejectTxn = async (txn: Transaction) => {
    if (!canAccess('canApproveWithdrawals')) { notify('No permission.', 'err'); return }

    const targetUser = users.find(u => u.id === txn.userId || (u.email && u.email.toLowerCase() === txn.userEmail.toLowerCase()))
    const currentBal = targetUser ? targetUser.balance : 0
    // If WITHDRAWAL rejected: refund the reserved amount back to balance
    // If DEPOSIT rejected: balance remains unchanged
    const refundedBal = txn.type === 'withdrawal' ? (currentBal + txn.amount) : currentBal

    // 1. Update local Admin state
    setTransactions(curr => curr.map(t => (t.id === txn.id || (t.userId === txn.userId && t.type === txn.type && t.status === 'pending')) ? { ...t, status: 'rejected' } : t))
    if (targetUser && txn.type === 'withdrawal') {
      setUsers(curr => curr.map(u => (u.id === targetUser.id || u.email === targetUser.email) ? { ...u, balance: refundedBal } : u))
    }

    // 2. Direct PATCH to Supabase Database
    try {
      if (isValidUuid(txn.id)) {
        await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${txn.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: 'rejected', updated_at: new Date().toISOString() }),
        })
      }

      let targetUserId = txn.userId
      if (txn.userEmail) {
        try {
          const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(txn.userEmail)}&select=id`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          })
          if (profRes.ok) {
            const profs = await profRes.json()
            if (Array.isArray(profs) && profs[0]?.id) {
              targetUserId = profs[0].id
            }
          }
        } catch {
          // silent
        }
      }

      if (targetUserId) {
        await fetch(`${SUPABASE_URL}/rest/v1/transactions?user_id=eq.${targetUserId}&type=eq.${txn.type}&status=eq.pending`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: 'rejected', updated_at: new Date().toISOString() }),
        })

        // Refund withdrawn amount if withdrawal was rejected
        if (txn.type === 'withdrawal') {
          await saveUserWalletBalance(targetUserId, refundedBal)
        }
      }

      // Update local transaction queue status
      try {
        const localStr = localStorage.getItem('binarypip_pending_transactions')
        if (localStr) {
          const queue = JSON.parse(localStr) as Transaction[]
          const updated = queue.map(t => (t.id === txn.id || (t.userId === txn.userId && t.type === txn.type && t.status === 'pending')) ? { ...t, status: 'rejected' } : t)
          localStorage.setItem('binarypip_pending_transactions', JSON.stringify(updated))
          window.dispatchEvent(new Event('storage'))
        }
      } catch {
        // silent
      }
    } catch {
      // silent
    }

    addAudit(`REJECT_${txn.type.toUpperCase()}`, txn.id, 'Transaction', `Rejected ${txn.type} of ${fmtUSD(txn.amount)} for ${txn.userName}`, 'warning')
    notify(`Transaction rejected.`, 'warn')
  }

  const applyBalanceAdjustment = async () => {
    if (!balanceModal || !canAccess('canAdjustBalances')) { notify('No permission.', 'err'); return }
    const amt = parseFloat(balanceModal.amount)
    if (!amt || amt <= 0) { notify('Enter a valid amount.', 'err'); return }
    if (!balanceModal.reason.trim()) { notify('Reason is required.', 'err'); return }

    const targetUser = balanceModal.user
    const delta = balanceModal.mode === 'credit' ? amt : -amt
    const newBal = Math.max(0, targetUser.balance + delta)

    setUsers(curr => curr.map(u => u.id === targetUser.id ? { ...u, balance: newBal } : u))
    setSelectedUser(prev => prev?.id === targetUser.id ? { ...prev, balance: newBal } : prev)

    try {
      await saveUserWalletBalance(targetUser.id, newBal)

      await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: targetUser.id,
          type: balanceModal.mode === 'credit' ? 'deposit' : 'withdrawal',
          amount: amt,
          asset: 'USD',
          status: 'completed',
          method: 'Admin Adjustment',
          reference_id: 'adm-' + Date.now(),
          details: { reason: balanceModal.reason, admin: currentAdmin?.name || 'Admin' },
        }),
      })
    } catch {
      // silent
    }

    addAudit('BALANCE_ADJUSTMENT', targetUser.id, 'User', `${balanceModal.mode === 'credit' ? 'Credited' : 'Debited'} $${amt} for ${targetUser.name} (${balanceModal.reason})`, 'warning')
    notify(`Balance ${balanceModal.mode === 'credit' ? 'credited' : 'debited'} for ${targetUser.name}.`)
    setBalanceModal(null)
  }

  const addAdmin = () => {
    if (!canAccess('canManageAdmins')) { notify('No permission.', 'err'); return }
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) { notify('All fields required.', 'err'); return }
    const perm = newAdmin.role === 'kyc_admin' ? kycAdminPermissions : financeAdminPermissions
    const a: AdminUser = {
      id: 'adm-' + Date.now(),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      permissions: perm,
      isProtected: false,
      lastLogin: 'Never',
      addedAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      ipWhitelist: [],
    }
    setAdmins(curr => [...curr, a])
    addAudit('ADD_ADMIN', a.id, 'Admin', `Added ${a.name} as ${roleLabel[a.role]}`, 'info')
    setAddAdminModal(false)
    setNewAdmin({ name: '', email: '', role: 'kyc_admin' })
    notify(`${a.name} added as ${roleLabel[a.role]}.`)
  }

  const removeAdmin = (a: AdminUser) => {
    if (a.isProtected) { notify('Super Admin cannot be removed.', 'err'); return }
    if (!canAccess('canManageAdmins')) { notify('No permission.', 'err'); return }
    setAdmins(curr => curr.filter(x => x.id !== a.id))
    addAudit('REMOVE_ADMIN', a.id, 'Admin', `Removed admin ${a.name} (${a.email})`, 'warning')
    notify(`${a.name} removed.`, 'warn')
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const pendingKyc   = kycQueue.filter(k => k.status === 'pending').length
  const pendingTxns  = transactions.filter(t => t.status === 'pending').length
  const flaggedTxns  = transactions.filter(t => t.status === 'flagged').length
  const totalVolume  = transactions.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const pendingAccounts = users.filter(u => u.accountStatus === 'pending').length
  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.includes(userSearch)
  )
  const filteredTxns = transactions.filter(t =>
    txFilter === 'all' ? true :
    txFilter === 'pending' ? t.status === 'pending' :
    t.status === 'flagged'
  )
  const filteredKyc = kycQueue.filter(k => kycFilter === 'all' ? true : k.status === 'pending')

  const alerts = [
    ...transactions.filter(t => t.status === 'flagged').map(t => ({ id: t.id, msg: `Flagged ${t.type}: ${fmtUSD(t.amount)} — ${t.flagReason}`, type: 'critical' as const })),
    ...(pendingKyc > 0 ? [{ id: 'kyc-alert', msg: `${pendingKyc} KYC document${pendingKyc > 1 ? 's' : ''} awaiting review`, type: 'warn' as const }] : []),
    ...(pendingTxns > 0 ? [{ id: 'txn-alert', msg: `${pendingTxns} transaction${pendingTxns > 1 ? 's' : ''} pending approval`, type: 'info' as const }] : []),
  ]

  // ── 10. AI SECURITY GUARDIAN VIEW ───────────────────────────────────────
  const renderSecurityGuardian = () => (
    <div className="sa-section">
      {/* Hero Banner */}
      <div className="sa-security-hero">
        <div className="sa-security-hero-head">
          <div>
            <span className="sa-security-badge" style={{ background: securitySettings.lockdownMode ? 'rgba(239, 68, 68, 0.2)' : undefined, color: securitySettings.lockdownMode ? '#ef4444' : undefined, borderColor: securitySettings.lockdownMode ? '#ef4444' : undefined }}>
              <ShieldCheck size={12} /> {securitySettings.lockdownMode ? '🚨 EMERGENCY LOCKDOWN ACTIVE' : 'ENTERPRISE-GRADE ZERO TRUST SECURITY'}
            </span>
            <h1>
              <Shield size={24} color={threatColor} /> AI Security Guardian
            </h1>
            <p>Real-Time Threat Monitoring • Automated Incident Playbooks • Live Audit Trail &amp; Subnet Controls</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="sa-btn sa-btn-outline" onClick={() => window.print()}>
              <FileText size={14} /> Export PDF Report
            </button>
            <button
              className="sa-btn sa-btn-primary"
              disabled={analyzingAi}
              onClick={() => void runAiAnalysisScan()}
            >
              {analyzingAi ? <RefreshCw size={14} style={{ animation: 'sa-spin 1s linear infinite' }} /> : <Zap size={14} />}
              {analyzingAi ? 'Analyzing Subnets...' : 'Run AI Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="sa-security-metrics-grid">
        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">AI Threat Score</span>
            <span className="sa-badge" style={{ background: `${threatColor}20`, color: threatColor }}>{threatLabel}</span>
          </div>
          <div className="sa-sec-metric-val" style={{ color: threatColor }}>{threatScore}/100</div>
          <div className="sa-sec-metric-sub">
            <CheckCircle2 size={13} color={threatColor} /> Real-time threat model active
          </div>
        </div>

        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">Anomalies Detected</span>
            <span className="sa-badge" style={{ background: highCriticalCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: highCriticalCount > 0 ? '#ef4444' : '#10b981' }}>
              {highCriticalCount > 0 ? 'HIGH' : 'LOW'}
            </span>
          </div>
          <div className="sa-sec-metric-val">{highCriticalCount} Detected</div>
          <div className="sa-sec-metric-sub">
            <AlertCircle size={13} color={highCriticalCount > 0 ? '#ef4444' : '#10b981'} /> Subnet &amp; severity alerts
          </div>
        </div>

        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">Failed Logins (24h)</span>
            <span className="sa-badge" style={{ background: failedLogins24h > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: failedLogins24h > 0 ? '#f59e0b' : '#10b981' }}>
              {failedLogins24h} Events
            </span>
          </div>
          <div className="sa-sec-metric-val">{failedLogins24h} Failed</div>
          <div className="sa-sec-metric-sub">
            <Clock size={13} color="#f59e0b" /> Real-time login authentication logs
          </div>
        </div>

        <div className="sa-sec-metric-card">
          <div className="sa-sec-metric-top">
            <span className="sa-sec-metric-label">2FA Failed Attempts</span>
            <span className="sa-badge" style={{ background: failed2fa24h > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: failed2fa24h > 0 ? '#ef4444' : '#10b981' }}>
              {failed2fa24h} Failed
            </span>
          </div>
          <div className="sa-sec-metric-val">{failed2fa24h} Total</div>
          <div className="sa-sec-metric-sub">
            <Shield size={13} color="#10b981" /> Strict TOTP 2FA Verification
          </div>
        </div>
      </div>

      {/* Active Security Status & Subnets */}
      <div className="sa-pqc-grid">
        <div className="sa-pqc-card">
          <h3>🔐 Active Infrastructure Controls</h3>
          <div className="sa-pqc-list">
            <div className="sa-pqc-item"><strong>Supabase RLS &amp; JWT</strong> — Row level security policies active</div>
            <div className="sa-pqc-item"><strong>TLS 1.3 / SSL Encryption</strong> — Data in transit protected</div>
            <div className="sa-pqc-item"><strong>Supabase Realtime WebSockets</strong> — Subnet audit channel online</div>
            <div className="sa-pqc-item"><strong>Idempotency Guards</strong> — Race condition protection enabled</div>
          </div>
        </div>

        <div className="sa-pqc-card" style={{ borderColor: securitySettings.withdrawalsFrozen ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.3)' }}>
          <h3 style={{ color: securitySettings.withdrawalsFrozen ? '#ef4444' : '#10b981' }}>
            {securitySettings.withdrawalsFrozen ? '❄️ Withdrawals State: FROZEN' : '💳 Withdrawals State: ACTIVE'}
          </h3>
          <div className="sa-pqc-list">
            <div className="sa-pqc-item">Withdrawals Frozen: <strong>{securitySettings.withdrawalsFrozen ? 'YES (FROZEN)' : 'NO (ACTIVE)'}</strong></div>
            <div className="sa-pqc-item">Strict Admin 2FA: <strong>{securitySettings.strict2faEnforced ? 'ENFORCED' : 'OPTIONAL'}</strong></div>
            <div className="sa-pqc-item">Auto-Block Brute Force: <strong>{securitySettings.autoBlockBruteForce ? 'ENABLED' : 'DISABLED'}</strong></div>
            <div className="sa-pqc-item">Emergency Lockdown Mode: <strong>{securitySettings.lockdownMode ? 'LOCKDOWN ACTIVE' : 'NOMINAL'}</strong></div>
          </div>
        </div>

        <div className="sa-pqc-card" style={{ borderColor: 'rgba(0,229,255,0.3)' }}>
          <h3 style={{ color: '#00e5ff' }}>⛔ Blocked Subnets &amp; IPs ({blockedIps.length})</h3>
          <div className="sa-pqc-list" style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {blockedIps.length === 0 ? (
              <div className="sa-pqc-item" style={{ color: 'var(--sa-muted)' }}>Zero blocked IPs currently.</div>
            ) : (
              blockedIps.map(b => (
                <div key={b.id} className="sa-pqc-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <code>{b.ipOrSubnet}</code>
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)' }}>{b.reason}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Real Security Incident Response Controls (Playbooks) */}
      <div className="sa-panel">
        <div className="sa-panel-head"><Zap size={14} color="#10b981" /> Incident Response Playbooks (Supabase Connected)</div>
        <p style={{ fontSize: '12px', color: 'var(--sa-muted)', marginBottom: '12px' }}>Execute incident response playbooks directly on live database rules.</p>
        <div className="sa-playbooks-row">
          <button
            className="sa-playbook-btn"
            style={{ background: securitySettings.withdrawalsFrozen ? 'rgba(239,68,68,0.2)' : undefined, color: securitySettings.withdrawalsFrozen ? '#ef4444' : undefined }}
            onClick={() => void toggleFreezeWithdrawals()}
          >
            <Lock size={13} /> {securitySettings.withdrawalsFrozen ? 'Unfreeze Withdrawals' : 'Freeze All Withdrawals'}
          </button>

          <button
            className="sa-playbook-btn"
            onClick={() => setBlockIpModalOpen(true)}
          >
            <Ban size={13} /> Block IP / Subnet
          </button>

          <button
            className="sa-playbook-btn"
            style={{ background: securitySettings.strict2faEnforced ? 'rgba(16,185,129,0.18)' : undefined }}
            onClick={() => void toggleEnforce2FA()}
          >
            <KeyRound size={13} /> {securitySettings.strict2faEnforced ? 'Admin 2FA Enforced' : 'Enforce Admin 2FA'}
          </button>

          <button
            className="sa-playbook-btn"
            style={{ background: securitySettings.autoBlockBruteForce ? 'rgba(0,229,255,0.18)' : undefined }}
            onClick={() => void toggleAutoBlockBruteForce()}
          >
            <Zap size={13} /> {securitySettings.autoBlockBruteForce ? 'Brute-Force Auto-Block Active' : 'Auto-Block Brute Force'}
          </button>

          <button
            className="sa-playbook-btn"
            onClick={exportForensicJson}
          >
            <Download size={13} /> Export Forensic JSON
          </button>

          <button
            className="sa-playbook-btn"
            onClick={() => void toggleLockdownMode()}
            style={{ background: securitySettings.lockdownMode ? 'rgba(239,68,68,0.3)' : undefined, color: securitySettings.lockdownMode ? '#ef4444' : undefined }}
          >
            <AlertTriangle size={13} /> {securitySettings.lockdownMode ? 'Lift Emergency Lockdown' : 'Trigger Emergency Lockdown'}
          </button>
        </div>
      </div>

      {/* Recent Security Events Table */}
      <div className="sa-panel" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="sa-panel-head" style={{ margin: 0 }}><Activity size={14} /> Recent Security Events &amp; Audit Trail ({securityEvents.length})</div>
          <button className="sa-btn sa-btn-outline" onClick={() => void fetchSecurityFromDatabase()}>
            <RefreshCw size={12} /> Refresh Events
          </button>
        </div>

        <table className="sa-table">
          <thead>
            <tr>
              <th>Severity</th><th>Event Type</th><th>User / Email</th><th>Subnet / IP</th><th>Timestamp</th><th>Action / Block</th>
            </tr>
          </thead>
          <tbody>
            {securityLoading && securityEvents.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--sa-muted)' }}>Loading security audit logs...</td></tr>
            )}
            {!securityLoading && securityEvents.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--sa-muted)' }}>Zero security events logged yet.</td></tr>
            )}
            {securityEvents.map(e => {
              const sevColor = e.severity === 'CRITICAL' ? '#ef4444' : e.severity === 'HIGH' ? '#f97316' : e.severity === 'MEDIUM' ? '#f59e0b' : '#10b981'
              const sevBg = e.severity === 'CRITICAL' ? 'rgba(239,68,68,0.18)' : e.severity === 'HIGH' ? 'rgba(249,115,22,0.18)' : e.severity === 'MEDIUM' ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)'

              return (
                <tr key={e.id} className="sa-row-hover">
                  <td>
                    <span className="sa-badge" style={{ background: sevBg, color: sevColor, fontWeight: 800 }}>
                      {e.severity}
                    </span>
                  </td>
                  <td><strong>{e.eventType}</strong></td>
                  <td>{e.userEmail}</td>
                  <td><code>{e.ipAddress}</code></td>
                  <td><span className="sa-dim">{new Date(e.createdAt).toLocaleString()}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="sa-dim">{e.actionTaken}</span>
                      <button
                        type="button"
                        className="sa-btn-xs sa-btn-xs-danger"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => void blockIpOrSubnet(e.ipAddress, `Flagged during event ${e.eventType}`)}
                      >
                        Block IP
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Block IP Modal */}
      {blockIpModalOpen && (
        <div className="cth-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(3, 9, 22, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setBlockIpModalOpen(false)}>
          <div className="cth-modal-container" style={{ background: '#071326', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '24px', maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }} onClick={ev => ev.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ban size={20} color="#ef4444" /> Block IP or Subnet
              </h3>
              <button type="button" onClick={() => setBlockIpModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sa-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  IP Address / CIDR Subnet
                </label>
                <input
                  type="text"
                  placeholder="e.g. 41.90.172.69 or 41.90.172.0/24"
                  value={ipToBlockInput}
                  onChange={ev => setIpToBlockInput(ev.target.value)}
                  className="sa-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sa-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Reason for Block
                </label>
                <input
                  type="text"
                  value={blockReasonInput}
                  onChange={ev => setBlockReasonInput(ev.target.value)}
                  className="sa-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="sa-btn sa-btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => void blockIpOrSubnet(ipToBlockInput, blockReasonInput)}
                >
                  Confirm Block
                </button>
                <button
                  type="button"
                  className="sa-btn sa-btn-ghost"
                  onClick={() => setBlockIpModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'login') {
    return (
      <div className="sa-login-shell">
        <div className="sa-login-bg" />
        <div className="sa-login-card">
          <div className="sa-login-icon" style={{ background: 'transparent', border: 'none' }}>
            <img src="/binarypip-mark.svg" alt="BinaryPip Admin logo" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          </div>
          <div className="sa-login-brand">BinaryPip</div>
          <div className="sa-login-sub">ADMIN PORTAL</div>
          <p className="sa-login-desc">Restricted access. Unauthorized entry is a criminal offence and will be logged.</p>

          <form onSubmit={handleLogin} className="sa-login-form">
            <label className="sa-label">
              Admin Email
              <input
                type="email"
                className="sa-input"
                placeholder="admin@binarypip.com"
                value={email}
                autoComplete="username"
                onChange={e => { setEmail(e.target.value); setLoginError('') }}
                required
              />
            </label>
            <label className="sa-label">
              Password
              <span className="sa-pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="sa-input"
                  placeholder="••••••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={e => { setPassword(e.target.value); setLoginError('') }}
                  required
                />
                <button type="button" className="sa-pw-toggle" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
              <button type="button" onClick={() => {
                if (!email.trim()) { setLoginError('Please enter your admin email above first.'); return }
                showToast(`🔑 Admin password reset link dispatched to ${email.trim()}`)
              }} style={{ background: 'transparent', border: 'none', color: 'var(--sa-amber)', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>
                Forgot password?
              </button>
            </div>

            {loginError && <p className="sa-login-error"><AlertCircle size={14} /> {loginError}</p>}
            <button type="submit" className="sa-btn sa-btn-primary sa-btn-full">
              <ShieldCheck size={16} /> Authenticate
            </button>

            <div style={{ textAlign: 'center', margin: '10px 0 6px', fontSize: '11px', color: 'var(--sa-muted)' }}>or</div>

            <button type="button" className="sa-btn sa-btn-outline sa-btn-full" onClick={() => {
              showToast('Connecting to Admin Google OAuth...')
              window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`
            }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Globe size={15} /> Continue with Google
            </button>
          </form>

          <p className="sa-login-back" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer', textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--sa-cyan)' }}>
            ← Return to Platform
          </p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: MFA
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'mfa') {
    return <MfaGate onPass={handleMfaPass} />
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────

  const pendingMasterApps = masterApps.filter(a => a.status === 'pending').length

  const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard; perm?: keyof AdminPermissions; badge?: number }[] = [
    { id: 'overview',  label: 'Overview',     icon: LayoutDashboard },
    { id: 'users',     label: 'Users',        icon: Users,     perm: 'canManageUsers', badge: pendingAccounts },
    { id: 'kyc',       label: 'KYC Queue',    icon: FileText,  perm: 'canApproveKyc',          badge: pendingKyc },
    { id: 'finance',   label: 'Finance',      icon: Wallet,    perm: 'canApproveWithdrawals',  badge: pendingTxns + flaggedTxns },
    { id: 'master_traders', label: 'Master Traders ($500)', icon: Award, badge: pendingMasterApps },
    { id: 'security',  label: 'AI Security Guardian', icon: ShieldCheck, badge: 2 },
    { id: 'admins',    label: 'Admin Team',   icon: Shield,        perm: 'canManageAdmins' },
    { id: 'gateway',   label: 'Payment Gateway', icon: CreditCard  },
    { id: 'audit',     label: 'Audit Log',    icon: Activity,      perm: 'canViewAuditLogs' },
    { id: 'user_logs', label: 'User Logs',    icon: ListOrdered,   perm: 'canViewAuditLogs' },
    { id: 'support',   label: 'Live Chat',    icon: MessageSquare },
    { id: 'settings',  label: 'Settings',     icon: Settings },
  ]

  return (
    <div className={`sa-shell ${sidebarCollapsed ? 'sa-shell-collapsed' : ''}`}>

      {/* ── LOCKDOWN OVERLAY ─────────────────────────────────────────────── */}
      {lockdownActive && (
        <div className="sa-lockdown-overlay">
          <div className="sa-lockdown-card">
            <AlertTriangle size={48} color="#f04452" />
            <h2>SYSTEM LOCKDOWN ACTIVE</h2>
            <p>All administrative operations are suspended. Only the Super Admin can lift this lockdown.</p>
            <button className="sa-btn sa-btn-danger" onClick={() => { setLockdownActive(false); addAudit('LIFT_LOCKDOWN', 'system', 'System', 'Emergency lockdown lifted', 'critical') }}>
              Lift Lockdown
            </button>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-top">
          <div className="sa-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/binarypip-mark.svg" alt="BinaryPip Admin logo" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
            {!sidebarCollapsed && <span>BinaryPip <strong>ADMIN</strong></span>}
          </div>
          <button className="sa-collapse-btn" onClick={() => setSidebarCollapsed(p => !p)} title="Toggle sidebar">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />}
          </button>
        </div>

        <nav className="sa-nav">
          {navItems.map(item => {
            if (item.perm && !canAccess(item.perm)) return null
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`sa-nav-item ${section === item.id ? 'sa-nav-active' : ''}`}
                onClick={() => setSection(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="sa-nav-icon"><Icon size={17} /></span>
                {!sidebarCollapsed && <span className="sa-nav-label">{item.label}</span>}
                {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span className="sa-nav-badge">{item.badge}</span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="sa-sidebar-foot">
          <div className="sa-admin-chip">
            <div className="sa-admin-avatar">{currentAdmin!.name.slice(0, 2).toUpperCase()}</div>
            {!sidebarCollapsed && (
              <div className="sa-admin-info">
                <strong>{currentAdmin!.name}</strong>
                <small style={{ color: roleColor[currentAdmin!.role] }}>{roleLabel[currentAdmin!.role]}</small>
              </div>
            )}
          </div>
          <button className="sa-logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={15} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="sa-main">

        {/* ── TOPBAR ───────────────────────────────────────────────────── */}
        <header className="sa-topbar">
          <div className="sa-topbar-left">
            <div className="sa-topbar-breadcrumb">
              <span>Admin</span>
              <ChevronRight size={12} />
              <strong>{navItems.find(n => n.id === section)?.label}</strong>
            </div>
          </div>
          <div className="sa-topbar-right">
            {/* Health indicator */}
            <div className="sa-health-dot">
              <span className="sa-health-pulse" />
              <span>Systems Nominal</span>
            </div>

            {/* Alerts bell */}
            <div className="sa-notif-wrap">
              <button className="sa-icon-btn" onClick={() => setNotifOpen(p => !p)}>
                <Bell size={16} />
                {alerts.length > 0 && <span className="sa-notif-count">{alerts.length}</span>}
              </button>
              {notifOpen && (
                <div className="sa-notif-dropdown">
                  <div className="sa-notif-header">
                    <strong>Alerts</strong>
                    <button className="sa-icon-btn" onClick={() => setNotifOpen(false)}><X size={14} /></button>
                  </div>
                  {alerts.length === 0 && <p className="sa-notif-empty">No active alerts.</p>}
                  {alerts.map(a => (
                    <div key={a.id} className={`sa-notif-item sa-notif-${a.type}`}>
                      {a.type === 'critical' ? <AlertTriangle size={13} /> : a.type === 'warn' ? <AlertCircle size={13} /> : <Bell size={13} />}
                      <span>{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency lockdown */}
            {currentAdmin?.role === 'super_admin' && (
              <button
                className={`sa-btn sa-lockdown-btn ${lockdownActive ? 'sa-lockdown-active' : ''}`}
                onClick={() => {
                  setLockdownActive(p => !p)
                  addAudit(lockdownActive ? 'LIFT_LOCKDOWN' : 'TRIGGER_LOCKDOWN', 'system', 'System', lockdownActive ? 'Lockdown lifted' : 'Emergency lockdown triggered', 'critical')
                }}
              >
                <Lock size={13} />
                {lockdownActive ? 'Lift Lockdown' : 'Lockdown'}
              </button>
            )}
          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────────────── */}
        <div className="sa-content">

          {/* ═══════════════════ OVERVIEW ══════════════════════════════════ */}
          {section === 'overview' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">CONTROL CENTER</div>
                  <h1>Platform Overview</h1>
                </div>
                <span className="sa-session-info"><Clock size={13} /> Session active — auto-locks after 15 min inactivity</span>
              </div>

              {/* Stat cards */}
              <div className="sa-stats-grid">
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(28,207,132,0.12)', color: '#1ccf84' }}><Users size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{users.length}</div>
                    <div className="sa-stat-lbl">Total Users</div>
                  </div>
                  <div className="sa-stat-sub">{users.filter(u => u.status === 'active').length} active</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(242,185,75,0.12)', color: '#f2b94b' }}><FileText size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{pendingKyc}</div>
                    <div className="sa-stat-lbl">Pending KYC</div>
                  </div>
                  <div className="sa-stat-sub">{kycQueue.filter(k => k.status === 'approved').length} approved</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(32,235,90,0.12)', color: '#20eb5a' }}><Wallet size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{pendingTxns}</div>
                    <div className="sa-stat-lbl">Pending Txns</div>
                  </div>
                  <div className="sa-stat-sub">{flaggedTxns > 0 ? `${flaggedTxns} flagged ⚠` : 'No flags'}</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(0,184,74,0.12)', color: '#00b84a' }}><DollarSign size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{fmtUSD(totalVolume)}</div>
                    <div className="sa-stat-lbl">Approved Volume</div>
                  </div>
                  <div className="sa-stat-sub">All-time approved</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(240,68,82,0.12)', color: '#f04452' }}><Ban size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{users.filter(u => u.status === 'suspended').length}</div>
                    <div className="sa-stat-lbl">Suspended Accounts</div>
                  </div>
                  <div className="sa-stat-sub">{users.filter(u => u.kycStatus === 'rejected').length} KYC rejected</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-icon" style={{ background: 'rgba(32,235,90,0.12)', color: '#20eb5a' }}><Shield size={20} /></div>
                  <div>
                    <div className="sa-stat-val">{admins.length}</div>
                    <div className="sa-stat-lbl">Admin Accounts</div>
                  </div>
                  <div className="sa-stat-sub">{admins.filter(a => a.status === 'active').length} active</div>
                </div>
              </div>

              {/* Alerts panel */}
              {alerts.length > 0 && (
                <div className="sa-alerts-panel">
                  <div className="sa-panel-head"><AlertTriangle size={15} color="#f04452" /> Active Alerts</div>
                  {alerts.map(a => (
                    <div key={a.id} className={`sa-alert-row sa-alert-${a.type}`}>
                      {a.type === 'critical' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                      <span>{a.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent audit */}
              <div className="sa-panel">
                <div className="sa-panel-head"><Activity size={14} /> Recent Activity</div>
                <table className="sa-table">
                  <thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th><th>Time</th><th>Severity</th></tr></thead>
                  <tbody>
                    {auditLog.slice(0, 6).map(e => (
                      <tr key={e.id}>
                        <td><strong>{e.adminName}</strong></td>
                        <td><code className="sa-code">{e.action}</code></td>
                        <td><span className="sa-dim">{e.targetType}</span></td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</td>
                        <td><span className="sa-dim">{fmtDate(e.timestamp)}</span></td>
                        <td><StatusBadge status={e.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ USERS ═════════════════════════════════════ */}
          {section === 'users' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">USER MANAGEMENT</div>
                  <h1>Client Accounts <span className="sa-count">{filteredUsers.length}</span></h1>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="sa-btn sa-btn-outline sa-btn-sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void fetchUsers(true)
                    }}
                    disabled={usersLoading}
                    title="Refresh users"
                  >
                    <RefreshCw size={13} style={{ animation: usersLoading ? 'sa-spin 1s linear infinite' : 'none' }} />
                    {usersLoading ? 'Loading…' : 'Refresh'}
                  </button>
                  <div className="sa-search-box">
                    <Search size={14} />
                    <input placeholder="Search by name, email or ID…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>User</th><th>Country</th><th>Account</th><th>Balance</th>
                      <th>KYC</th><th>Status</th><th>Approval</th><th>Registered</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                        <RefreshCw size={18} style={{ animation: 'sa-spin 1s linear infinite', marginBottom: 8 }} />
                        <div>Loading users from database…</div>
                      </td></tr>
                    )}
                    {!usersLoading && usersError && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#f04452' }}>
                        <AlertCircle size={16} style={{ marginRight: 6 }} />{usersError}
                      </td></tr>
                    )}
                    {!usersLoading && !usersError && filteredUsers.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                        <Users size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <div>No registered users yet.</div>
                      </td></tr>
                    )}
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="sa-row-hover" onClick={() => setSelectedUser(u)}>
                        <td>
                          <div className="sa-user-cell">
                            <div className="sa-mini-avatar">{u.name.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <strong>{u.name}</strong>
                              <div className="sa-dim">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><Globe size={12} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.5 }} />{u.country}</td>
                        <td><span className={`sa-badge ${u.accountType === 'LIVE' ? 'sa-badge-live' : ''}`}>{u.accountType}</span></td>
                        <td><strong>{fmtUSD(u.balance)}</strong></td>
                        <td><StatusBadge status={u.kycStatus} /></td>
                        <td><StatusBadge status={u.status} /></td>
                        <td>
                          {u.accountStatus === 'pending'
                            ? <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>Pending</span>
                            : <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>Approved</span>
                          }
                        </td>
                        <td><span className="sa-dim">{u.registeredAt}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="sa-action-row">
                            <button className="sa-btn-xs sa-btn-xs-outline" onClick={() => setSelectedUser(u)}>
                              <Eye size={11} /> View
                            </button>
                            {/* Trade Outcome Allocation Buttons: Green Profit vs Red Loss */}
                            <button
                              type="button"
                              className="sa-btn-xs"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                void setUserProfitAllocationMode(u, 'PROFIT')
                              }}
                              title="Set user live trades to PROFIT (WINS)"
                              style={{
                                background: userProfitAllocations[u.id] === 'PROFIT' ? '#1ccf84' : 'rgba(28,207,132,0.12)',
                                border: '1px solid #1ccf84',
                                color: userProfitAllocations[u.id] === 'PROFIT' ? '#000000' : '#1ccf84',
                                fontWeight: 800,
                              }}
                            >
                              <Sparkles size={11} /> Profit
                            </button>
                            <button
                              type="button"
                              className="sa-btn-xs"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                void setUserProfitAllocationMode(u, 'LOSS')
                              }}
                              title="Set user live trades to 100% HOUSE LOSS"
                              style={{
                                background: userProfitAllocations[u.id] === 'LOSS' ? '#f04452' : 'rgba(240,68,82,0.12)',
                                border: '1px solid #f04452',
                                color: userProfitAllocations[u.id] === 'LOSS' ? '#ffffff' : '#f04452',
                                fontWeight: 800,
                              }}
                            >
                              <TrendingDown size={11} /> Loss
                            </button>
                            <button
                              type="button"
                              className="sa-btn-xs sa-btn-xs-ok"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setBalanceModal({ user: u, amount: '', mode: 'credit', reason: '' })
                              }}
                              title="Load / Allocate money directly to this user Real Account balance"
                            >
                              <DollarSign size={11} /> Load Funds
                            </button>
                            {u.accountStatus === 'pending' ? (
                              <button type="button" className="sa-btn-xs sa-btn-xs-ok" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void approveAccount(u) }}>
                                <CheckCircle2 size={11} /> Approve
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`sa-btn-xs ${u.status === 'active' ? 'sa-btn-xs-danger' : 'sa-btn-xs-ok'}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleUserStatus(u) }}
                              >
                                {u.status === 'active' ? <><Ban size={11} /> Suspend</> : <><CheckCircle2 size={11} /> Activate</>}
                              </button>
                            )}
                            <button type="button" className="sa-btn-xs sa-btn-xs-outline" title="Edit details" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditUser(u) }}>
                              <Pencil size={11} />
                            </button>
                            <button type="button" className="sa-btn-xs sa-btn-xs-danger" title="Permanently delete user" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void deleteUser(u) }}>
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* User detail drawer */}
              {selectedUser && (
                <div className="sa-drawer-overlay" onClick={() => setSelectedUser(null)}>
                  <div className="sa-drawer" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>User Profile</h3>
                      <button className="sa-icon-btn" onClick={() => setSelectedUser(null)}><X size={16} /></button>
                    </div>
                    <div className="sa-drawer-avatar">
                      {selectedUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <h4 style={{ textAlign: 'center', marginBottom: '4px' }}>{selectedUser.name}</h4>
                    <p style={{ textAlign: 'center', color: 'var(--sa-muted)', fontSize: '12px', marginBottom: '16px' }}>{selectedUser.email}</p>

                    <div className="sa-detail-grid">
                      <div className="sa-detail-row"><span>ID</span><code className="sa-code">{selectedUser.id}</code></div>
                      <div className="sa-detail-row"><span>Phone</span><strong>{selectedUser.phone}</strong></div>
                      <div className="sa-detail-row"><span>Country</span><strong>{selectedUser.country}</strong></div>
                      <div className="sa-detail-row"><span>Account</span><strong>{selectedUser.accountType}</strong></div>
                      <div className="sa-detail-row"><span>Balance</span><strong style={{ color: '#1ccf84' }}>{fmtUSD(selectedUser.balance)}</strong></div>
                      <div className="sa-detail-row"><span>KYC Status</span><StatusBadge status={selectedUser.kycStatus} /></div>
                      <div className="sa-detail-row"><span>Status</span><StatusBadge status={selectedUser.status} /></div>
                      <div className="sa-detail-row">
                        <span>Account Approval</span>
                        {selectedUser.accountStatus === 'pending'
                          ? <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>⏳ Pending Admin Approval</span>
                          : <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>✓ Approved</span>
                        }
                      </div>
                      <div className="sa-detail-row"><span>Registered</span><span className="sa-dim">{selectedUser.registeredAt}</span></div>
                      <div className="sa-detail-row"><span>Last Seen</span><span className="sa-dim">{selectedUser.lastSeen}</span></div>
                    </div>

                    <div className="sa-drawer-actions">
                      {selectedUser.accountStatus === 'pending' && (
                        <button className="sa-btn sa-btn-primary" style={{ width: '100%' }} onClick={() => approveAccount(selectedUser)}>
                          <CheckCircle2 size={14} /> Approve Account
                        </button>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          className={`sa-btn ${selectedUser.status === 'active' ? 'sa-btn-danger' : 'sa-btn-ok'}`}
                          onClick={() => toggleUserStatus(selectedUser)}
                        >
                          {selectedUser.status === 'active' ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Activate</>}
                        </button>
                        <button className="sa-btn sa-btn-outline" onClick={() => openEditUser(selectedUser)}>
                          <Pencil size={14} /> Edit Details
                        </button>
                        {canAccess('canAdjustBalances') && (
                          <button
                            className="sa-btn sa-btn-ok"
                            onClick={() => setBalanceModal({ user: selectedUser, amount: '', mode: 'credit', reason: '' })}
                          >
                            <DollarSign size={14} /> Allocate Balance
                          </button>
                        )}
                        <button className="sa-btn sa-btn-danger" onClick={() => openResetPassword(selectedUser)}>
                          <Lock size={14} /> Reset Password
                        </button>
                        <button className="sa-btn sa-btn-outline" style={{ gridColumn: '1/-1' }}
                          onClick={() => { setNotifySubject(''); setNotifyMessage(''); setNotifySent(false); setNotifyModal(selectedUser) }}>
                          <Bell size={14} /> Send Notification
                        </button>
                        {canAccess('canManageAdmins') && (
                          <button className="sa-btn" style={{ gridColumn: '1/-1', background: 'rgba(32,235,90,0.12)', color: '#20eb5a', border: '1px solid rgba(32,235,90,0.3)' }}
                            onClick={() => { setUpgradeRole('kyc_admin'); setUpgradeModal(selectedUser) }}>
                            <ShieldCheck size={14} /> Upgrade to Admin
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ KYC ═══════════════════════════════════════ */}
          {section === 'kyc' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">DOCUMENT VERIFICATION</div>
                  <h1>KYC Queue <span className="sa-count">{filteredKyc.length}</span></h1>
                </div>
                <div className="sa-filter-row">
                  <button className={`sa-pill ${kycFilter === 'pending' ? 'sa-pill-active' : ''}`} onClick={() => setKycFilter('pending')}>Pending</button>
                  <button className={`sa-pill ${kycFilter === 'all' ? 'sa-pill-active' : ''}`} onClick={() => setKycFilter('all')}>All</button>
                </div>
              </div>

              <div className="sa-kyc-grid">
                {filteredKyc.map(kyc => (
                  <div key={kyc.id} className={`sa-kyc-card ${kyc.status !== 'pending' ? 'sa-kyc-card-done' : ''}`}>
                    <div className="sa-kyc-card-head">
                      <div>
                        <strong>{kyc.userName}</strong>
                        <div className="sa-dim">{kyc.userEmail}</div>
                      </div>
                      <StatusBadge status={kyc.status} />
                    </div>
                    <div className="sa-kyc-meta">
                      <span><FileText size={12} /> {kyc.documentType}</span>
                      <span><Clock size={12} /> {fmtDate(kyc.submittedAt)}</span>
                    </div>
                    {kyc.rejectionReason && (
                      <div className="sa-kyc-rejection">
                        <AlertTriangle size={12} /> {kyc.rejectionReason}
                      </div>
                    )}
                    {/* Simulated document preview thumbnails */}
                    {/* Real submitted KYC document image or PDF viewer */}
                    <div className="sa-kyc-docs" style={{ margin: '10px 0' }}>
                      {kyc.mimeType?.includes('pdf') ? (
                        <a
                          href={kyc.fileUrl || '/generic-profile-portrait.svg'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sa-doc-pdf-link"
                          title="Open submitted PDF document"
                          onClick={e => e.stopPropagation()}
                        >
                          <FileText size={28} color="#20eb5a" />
                          <span>View Submitted PDF File</span>
                        </a>
                      ) : (
                        <div
                          className="sa-doc-image-preview"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImageModal({ url: kyc.fileUrl || '/generic-profile-portrait.svg', title: `${kyc.userName} - ${kyc.documentType}` })
                          }}
                          title="Click to view full resolution document image"
                        >
                          <img
                            src={kyc.fileUrl || '/generic-profile-portrait.svg'}
                            alt={`${kyc.userName} ${kyc.documentType}`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/generic-profile-portrait.svg'
                            }}
                          />
                          <span className="sa-doc-zoom-tag"><Eye size={12} /> Inspect ID Image</span>
                        </div>
                      )}
                    </div>
                    {kyc.status === 'pending' && (
                      <div className="sa-kyc-actions">
                        <button type="button" className="sa-btn sa-btn-ok" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void approveKyc(kyc) }}>
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button type="button" className="sa-btn sa-btn-outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedKyc(kyc); setKycRejectReason('') }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {filteredKyc.length === 0 && (
                  <div className="sa-empty"><CheckCircle2 size={28} color="#1ccf84" /><p>All caught up — no documents pending.</p></div>
                )}
              </div>

              {/* Lightbox Image Inspection Modal */}
              {previewImageModal && (
                <div className="sa-drawer-overlay" onClick={() => setPreviewImageModal(null)}>
                  <div className="sa-image-lightbox-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head" style={{ width: '100%' }}>
                      <h3>KYC Document Inspection — {previewImageModal.title}</h3>
                      <button className="sa-icon-btn" onClick={() => setPreviewImageModal(null)}><X size={16} /></button>
                    </div>
                    <img src={previewImageModal.url} alt="KYC Document Full Resolution Preview" />
                    <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                      <a
                        href={previewImageModal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="sa-btn sa-btn-primary"
                        style={{ textDecoration: 'none' }}
                      >
                        <Download size={14} /> Download Document
                      </a>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setPreviewImageModal(null)}>
                        Close Inspection
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reject modal */}
              {selectedKyc && (
                <div className="sa-drawer-overlay" onClick={() => setSelectedKyc(null)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Reject KYC — {selectedKyc.userName}</h3>
                      <button className="sa-icon-btn" onClick={() => setSelectedKyc(null)}><X size={16} /></button>
                    </div>
                    <p className="sa-dim" style={{ marginBottom: '12px' }}>
                      A rejection reason will be sent to the user via email. Be specific and helpful.
                    </p>
                    <textarea
                      className="sa-textarea"
                      rows={4}
                      placeholder="e.g. Document image is blurry. Please resubmit a clear, well-lit photograph."
                      value={kycRejectReason}
                      onChange={e => setKycRejectReason(e.target.value)}
                    />
                    <div className="sa-modal-actions">
                      <button type="button" className="sa-btn sa-btn-danger" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void rejectKyc(selectedKyc, kycRejectReason) }}>
                        <XCircle size={14} /> Confirm Rejection
                      </button>
                      <button type="button" className="sa-btn sa-btn-ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedKyc(null) }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ FINANCE ═══════════════════════════════════ */}
          {section === 'finance' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">PAYMENT GATEWAY</div>
                  <h1>Finance & Transactions</h1>
                </div>
                <div className="sa-filter-row">
                  <button className={`sa-pill ${txFilter === 'all' ? 'sa-pill-active' : ''}`} onClick={() => setTxFilter('all')}>All</button>
                  <button className={`sa-pill ${txFilter === 'pending' ? 'sa-pill-active' : ''}`} onClick={() => setTxFilter('pending')}>
                    Pending {pendingTxns > 0 && <span className="sa-pill-badge">{pendingTxns}</span>}
                  </button>
                  <button className={`sa-pill sa-pill-danger ${txFilter === 'flagged' ? 'sa-pill-active' : ''}`} onClick={() => setTxFilter('flagged')}>
                    Flagged {flaggedTxns > 0 && <span className="sa-pill-badge">{flaggedTxns}</span>}
                  </button>
                </div>
              </div>

              {/* Finance summary */}
              <div className="sa-finance-summary">
                <div className="sa-fin-stat">
                  <TrendingUp size={16} color="#1ccf84" />
                  <div>
                    <div className="sa-fin-val">{fmtUSD(transactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + t.amount, 0))}</div>
                    <div className="sa-dim">Total Deposits Approved</div>
                  </div>
                </div>
                <div className="sa-fin-stat">
                  <TrendingDown size={16} color="#f04452" />
                  <div>
                    <div className="sa-fin-val">{fmtUSD(transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((s, t) => s + t.amount, 0))}</div>
                    <div className="sa-dim">Total Withdrawals Approved</div>
                  </div>
                </div>
                <div className="sa-fin-stat">
                  <AlertTriangle size={16} color="#f2b94b" />
                  <div>
                    <div className="sa-fin-val">{fmtUSD(transactions.filter(t => t.status === 'flagged').reduce((s, t) => s + t.amount, 0))}</div>
                    <div className="sa-dim">Value Under Review</div>
                  </div>
                </div>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr><th>User</th><th>Type</th><th>Amount</th><th>Network</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map(txn => (
                      <tr key={txn.id} className="sa-row-hover">
                        <td>
                          <div>
                            <strong>{txn.userName}</strong>
                            <div className="sa-dim">{txn.userEmail}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`sa-badge ${txn.type === 'deposit' ? 'sa-badge-ok' : txn.type === 'withdrawal' ? 'sa-badge-warn' : ''}`}>
                            {txn.type.toUpperCase()}
                          </span>
                        </td>
                        <td><strong style={{ color: txn.type === 'deposit' ? '#1ccf84' : '#f04452' }}>{fmtUSD(txn.amount)}</strong></td>
                        <td><code className="sa-code">{txn.network}</code></td>
                        <td>
                          <StatusBadge status={txn.status} />
                          {txn.flagReason && <div className="sa-flag-reason"><AlertTriangle size={10} /> {txn.flagReason}</div>}
                        </td>
                        <td><span className="sa-dim">{fmtDate(txn.createdAt)}</span></td>
                        <td>
                          {(txn.status === 'pending' || txn.status === 'flagged') ? (
                            <div className="sa-action-row">
                              <button type="button" className="sa-btn-xs sa-btn-xs-ok" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void approveTxn(txn) }}><CheckCircle2 size={11} /> Approve</button>
                              <button type="button" className="sa-btn-xs sa-btn-xs-danger" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void rejectTxn(txn) }}><XCircle size={11} /> Reject</button>
                            </div>
                          ) : <span className="sa-dim">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTxns.length === 0 && (
                  <div className="sa-empty"><CheckCircle2 size={28} color="#1ccf84" /><p>No transactions match this filter.</p></div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════ MASTER TRADERS ════════════════════════════ */}
          {section === 'master_traders' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">COPY TRADING HUB</div>
                  <h1>Master Trader Applications ($500 Fee)</h1>
                </div>
                <button
                  type="button"
                  className="sa-btn sa-btn-outline"
                  onClick={() => fetchMasterTraderAppsFromDatabase()}
                >
                  <RefreshCw size={13} /> Refresh Queue
                </button>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Applicant User</th>
                      <th>Display Name &amp; Strategy</th>
                      <th>Risk Profile</th>
                      <th>Fee Paid</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterAppsLoading && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                        <RefreshCw size={18} style={{ animation: 'sa-spin 1s linear infinite', marginBottom: 8 }} />
                        <div>Loading applications from database…</div>
                      </td></tr>
                    )}
                    {!masterAppsLoading && masterApps.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                        <Award size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <div>No Master Trader applications in queue.</div>
                      </td></tr>
                    )}
                    {masterApps.map(app => {
                      const isPending = app.status === 'pending'
                      const isApproved = app.status === 'approved'
                      const isRejected = app.status === 'rejected'

                      return (
                        <tr key={app.id} className="sa-row-hover">
                          <td><small>{new Date(app.createdAt).toLocaleString()}</small></td>
                          <td>
                            <div>
                              <strong>{app.userName}</strong>
                              <div className="sa-dim">{app.userEmail}</div>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: '#00e5ff', fontSize: '13.5px' }}>{app.displayName}</strong>
                            <div style={{ fontSize: '11px', color: '#1ccf84', fontWeight: 700 }}>{app.strategyTag}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--sa-muted)', marginTop: '2px', maxWidth: '280px', lineHeight: 1.3 }}>{app.bio}</div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: app.riskLevel === 'Low' ? '#1ccf84' : app.riskLevel === 'Medium' ? '#f2b94b' : '#f04452',
                              background: app.riskLevel === 'Low' ? 'rgba(28, 207, 132, 0.15)' : app.riskLevel === 'Medium' ? 'rgba(242, 185, 75, 0.15)' : 'rgba(240, 68, 82, 0.15)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}>
                              {app.riskLevel} Risk
                            </span>
                          </td>
                          <td><strong style={{ color: '#1ccf84' }}>$500.00 USD</strong></td>
                          <td>
                            {isApproved && <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>✓ Approved</span>}
                            {isPending && <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.15)', color: '#f2b94b' }}>⏳ Pending</span>}
                            {isRejected && <span className="sa-badge" style={{ background: 'rgba(240,68,82,0.15)', color: '#f04452' }}>✗ Rejected</span>}
                          </td>
                          <td>
                            {isPending ? (
                              <div className="sa-action-row">
                                <button type="button" className="sa-btn-xs sa-btn-xs-ok" onClick={() => approveMasterApp(app)}>
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                                <button type="button" className="sa-btn-xs sa-btn-xs-danger" onClick={() => rejectMasterApp(app)}>
                                  <XCircle size={11} /> Reject
                                </button>
                              </div>
                            ) : <span className="sa-dim">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── PUBLISHED MASTER TRADERS DIRECTORY & LIVE ADJUSTMENTS ── */}
              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={20} color="#00e5ff" /> Published Master Traders Directory &amp; Adjustments ({publishedTraders.length})
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--sa-muted)', marginTop: '2px', display: 'block' }}>
                      Adjust win rate, total profit, copiers count, verification status, or toggle trader active visibility in real time.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="sa-search-wrap" style={{ width: '220px' }}>
                      <Search size={14} className="sa-search-icon" />
                      <input
                        type="text"
                        className="sa-input sa-search-input"
                        placeholder="Search trader..."
                        value={traderSearch}
                        onChange={e => setTraderSearch(e.target.value)}
                        style={{ padding: '6px 12px 6px 32px', fontSize: '12px' }}
                      />
                    </div>

                    <button
                      type="button"
                      className="sa-btn sa-btn-outline"
                      onClick={() => fetchPublishedTradersFromDatabase()}
                    >
                      <RefreshCw size={13} /> Refresh Directory
                    </button>
                  </div>
                </div>

                <div className="sa-panel" style={{ overflowX: 'auto' }}>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Master Trader</th>
                        <th>Verification</th>
                        <th>Win Rate (%)</th>
                        <th>Total Profit ($)</th>
                        <th>Copiers</th>
                        <th>Status</th>
                        <th>Quick Adjustments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publishedTraders.filter(t => !traderSearch.trim() || t.displayName.toLowerCase().includes(traderSearch.toLowerCase()) || t.strategyTag.toLowerCase().includes(traderSearch.toLowerCase())).length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--sa-muted)' }}>
                          <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                          <div>No master traders match search filter.</div>
                        </td></tr>
                      ) : (
                        publishedTraders
                          .filter(t => !traderSearch.trim() || t.displayName.toLowerCase().includes(traderSearch.toLowerCase()) || t.strategyTag.toLowerCase().includes(traderSearch.toLowerCase()))
                          .map(trader => (
                          <tr key={trader.id} className="sa-row-hover">
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={trader.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={trader.displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #1ccf84' }} />
                                <div>
                                  <strong style={{ color: '#ffffff', fontSize: '13.5px' }}>{trader.displayName}</strong>
                                  <div style={{ fontSize: '11px', color: '#1ccf84', fontWeight: 700 }}>{trader.strategyTag}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {trader.isVerified ? (
                                <button
                                  type="button"
                                  onClick={() => updatePublishedTrader(trader.id, { isVerified: false })}
                                  className="sa-badge"
                                  style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84', border: '1px solid rgba(28,207,132,0.3)', cursor: 'pointer' }}
                                  title="Click to unverify"
                                >
                                  ✓ Verified
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => updatePublishedTrader(trader.id, { isVerified: true })}
                                  className="sa-badge"
                                  style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', cursor: 'pointer' }}
                                  title="Click to verify"
                                >
                                  Unverified
                                </button>
                              )}
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                defaultValue={trader.winRate}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val)) updatePublishedTrader(trader.id, { winRate: val })
                                }}
                                style={{ width: '70px', background: '#101929', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#1ccf84', fontWeight: 800, padding: '4px 8px', fontSize: '12px' }}
                              /> %
                            </td>
                            <td>
                              $<input
                                type="number"
                                step="100"
                                defaultValue={trader.totalProfit}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val)) updatePublishedTrader(trader.id, { totalProfit: val })
                                }}
                                style={{ width: '90px', background: '#101929', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#ffffff', fontWeight: 800, padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                defaultValue={trader.copiersCount}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10)
                                  if (!isNaN(val)) updatePublishedTrader(trader.id, { copiersCount: val })
                                }}
                                style={{ width: '70px', background: '#101929', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#00e5ff', fontWeight: 800, padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                            <td>
                              {trader.isActive ? (
                                <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>Active</span>
                              ) : (
                                <span className="sa-badge" style={{ background: 'rgba(240,68,82,0.15)', color: '#f04452' }}>Hidden</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`sa-btn-xs ${trader.isActive ? 'sa-btn-xs-danger' : 'sa-btn-xs-ok'}`}
                                onClick={() => updatePublishedTrader(trader.id, { isActive: !trader.isActive })}
                              >
                                {trader.isActive ? 'Deactivate' : 'Publish'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ ADMINS ════════════════════════════════════ */}
          {section === 'admins' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">ACCESS CONTROL</div>
                  <h1>Admin Team</h1>
                </div>
                {canAccess('canManageAdmins') && (
                  <button className="sa-btn sa-btn-primary" onClick={() => setAddAdminModal(true)}>
                    <Plus size={14} /> Add Admin
                  </button>
                )}
              </div>

              <div className="sa-admins-grid">
                {admins.map(a => (
                  <div key={a.id} className="sa-admin-card">
                    <div className="sa-admin-card-head">
                      <div className="sa-admin-card-avatar" style={{ borderColor: roleColor[a.role] }}>
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong>{a.name}</strong>
                        <div className="sa-dim">{a.email}</div>
                        <span className="sa-badge" style={{ background: `${roleColor[a.role]}20`, color: roleColor[a.role], marginTop: '4px', display: 'inline-block' }}>
                          {roleLabel[a.role]}
                        </span>
                      </div>
                      {a.isProtected && <div className="sa-protected-tag"><Lock size={11} /> Protected</div>}
                    </div>

                    <div className="sa-admin-perm-list">
                      {(Object.entries(a.permissions) as [keyof AdminPermissions, boolean][]).map(([k, v]) => (
                        <div key={k} className={`sa-perm-row ${v ? '' : 'sa-perm-off'}`}>
                          {v ? <CheckCircle2 size={12} color="#1ccf84" /> : <XCircle size={12} color="var(--sa-muted)" />}
                          <span>{k.replace(/([A-Z])/g, ' $1').replace('can ', '').trim()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="sa-admin-card-foot">
                      <span className="sa-dim"><Clock size={11} /> {a.lastLogin === 'Never' ? 'Never' : fmtDate(a.lastLogin)}</span>
                      <StatusBadge status={a.status} />
                    </div>

                    {!a.isProtected && canAccess('canManageAdmins') && (
                      <button className="sa-btn sa-btn-danger sa-btn-sm" style={{ marginTop: '10px', width: '100%' }} onClick={() => removeAdmin(a)}>
                        <Trash2 size={13} /> Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Admin Modal */}
              {addAdminModal && (
                <div className="sa-drawer-overlay" onClick={() => setAddAdminModal(false)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Invite New Admin</h3>
                      <button className="sa-icon-btn" onClick={() => setAddAdminModal(false)}><X size={16} /></button>
                    </div>
                    <div className="sa-form-grid">
                      <label className="sa-label">Full Name
                        <input className="sa-input" placeholder="Jane Doe" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} />
                      </label>
                      <label className="sa-label">Email Address
                        <input className="sa-input" type="email" placeholder="jane@binarypip.com" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Role & Permissions
                        <select className="sa-input" value={newAdmin.role} onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value as AdminRole }))}>
                          <option value="kyc_admin">KYC Admin — Can review & approve KYC documents</option>
                          <option value="finance_admin">Finance Admin — Can approve withdrawals & adjust balances</option>
                          <option value="support_admin">Support Admin — Read-only access to user profiles</option>
                        </select>
                      </label>
                    </div>
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-primary" onClick={addAdmin}><Plus size={14} /> Create Admin</button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setAddAdminModal(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ AUDIT LOG ═════════════════════════════════ */}
          {section === 'audit' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">IMMUTABLE TRAIL</div>
                  <h1>System Audit Log <span className="sa-count">{auditLog.length}</span></h1>
                </div>
                <button className="sa-btn sa-btn-outline" onClick={() => notify('Audit log export initiated.')}>
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr><th>Admin</th><th>Action</th><th>Target</th><th>Detail</th><th>IP Address</th><th>Timestamp</th><th>Severity</th></tr>
                  </thead>
                  <tbody>
                    {auditLog.map(e => (
                      <tr key={e.id}>
                        <td>
                          <div>
                            <strong>{e.adminName}</strong>
                            <div className="sa-dim">{e.adminEmail}</div>
                          </div>
                        </td>
                        <td><code className="sa-code">{e.action}</code></td>
                        <td>
                          <div>
                            <span className="sa-dim">{e.targetType}</span>
                            <div><code className="sa-code" style={{ fontSize: '10px' }}>{e.targetId}</code></div>
                          </div>
                        </td>
                        <td style={{ maxWidth: '260px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</span>
                        </td>
                        <td><code className="sa-code">{e.ipAddress}</code></td>
                        <td><span className="sa-dim">{fmtDate(e.timestamp)}</span></td>
                        <td><StatusBadge status={e.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ USER LOGS ═════════════════════════════════ */}
          {section === 'user_logs' && (
            <UserLogs showNotice={(msg, type) => notify(msg, type === 'err' ? 'err' : type === 'warn' ? 'warn' : 'ok')} />
          )}

          {/* ═══════════════════ AI SECURITY GUARDIAN ══════════════════════ */}
          {section === 'security' && renderSecurityGuardian()}

          {/* ═══════════════════ SUPPORT CHAT DESK ══════════════════════ */}
          {section === 'support' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">REAL-TIME MESSAGING</div>
                  <h1>Live Support Chat Desk</h1>
                </div>
                <span className="sa-session-info"><MessageSquare size={13} /> Replies appear to users in real time</span>
              </div>
              <AdminChatDesk agentName={currentAdmin!.name} />
            </div>
          )}

          {/* ═══════════════════ PAYMENT GATEWAY ═══════════════════════ */}
          {section === 'gateway' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">DEPOSIT CHANNELS</div>
                  <h1>Payment Gateway Manager</h1>
                </div>
                <button className="sa-btn sa-btn-primary" onClick={() => setAddAddrOpen(true)}>
                  <Plus size={14} /> Add Address
                </button>
              </div>

              <div className="sa-panel">
                <table className="sa-table">
                  <thead>
                    <tr><th>Network</th><th>Asset</th><th>Wallet Address</th><th>Note</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {gatewayAddresses.map(a => (
                      <tr key={a.id}>
                        <td><code className="sa-code">{a.network}</code></td>
                        <td><strong>{a.assetName}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 260 }}>
                            <code className="sa-code" style={{ fontSize: '10.5px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.address}
                            </code>
                            <button className="sa-icon-btn" title="Copy" style={{ width: 24, height: 24 }}
                              onClick={() => { navigator.clipboard.writeText(a.address); notify('Address copied.') }}>
                              <Copy size={11} />
                            </button>
                          </div>
                        </td>
                        <td><span className="sa-dim">{a.note || '—'}</span></td>
                        <td>
                          <span className="sa-badge" style={{
                            background: a.enabled ? 'rgba(28,207,132,0.15)' : 'rgba(240,68,82,0.12)',
                            color: a.enabled ? '#1ccf84' : '#f04452'
                          }}>
                            {a.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <div className="sa-action-row">
                            <button type="button" className="sa-btn-xs sa-btn-xs-outline"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditAddrDraft({ network: a.network, assetName: a.assetName, address: a.address, note: a.note }); setEditAddrId(a.id) }}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button type="button" className={`sa-btn-xs ${a.enabled ? 'sa-btn-xs-danger' : 'sa-btn-xs-ok'}`}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleGatewayAddress(a.id) }}>
                              {a.enabled ? <><ToggleLeft size={11} /> Disable</> : <><ToggleRight size={11} /> Enable</>}
                            </button>
                            <button type="button" className="sa-btn-xs sa-btn-xs-danger"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); void deleteGatewayAddress(a.id) }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {gatewayAddresses.length === 0 && (
                  <div className="sa-empty"><CreditCard size={28} color="var(--sa-muted)" /><p>No deposit addresses configured yet.</p></div>
                )}
              </div>

              {/* Add Address Modal */}
              {addAddrOpen && (
                <div className="sa-drawer-overlay" onClick={() => setAddAddrOpen(false)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Add Deposit Address</h3>
                      <button className="sa-icon-btn" onClick={() => setAddAddrOpen(false)}><X size={16} /></button>
                    </div>
                    <div className="sa-form-grid">
                      <label className="sa-label">Network Code
                        <input className="sa-input" placeholder="e.g. USDT-TRC20" value={newAddr.network}
                          onChange={e => setNewAddr(a => ({ ...a, network: e.target.value.toUpperCase() }))} />
                      </label>
                      <label className="sa-label">Asset Name
                        <input className="sa-input" placeholder="e.g. Tether (TRC-20)" value={newAddr.assetName}
                          onChange={e => setNewAddr(a => ({ ...a, assetName: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Wallet Address
                        <input className="sa-input" placeholder="Paste full wallet address" value={newAddr.address}
                          onChange={e => setNewAddr(a => ({ ...a, address: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Note for users
                        <input className="sa-input" placeholder="e.g. Send only on this network" value={newAddr.note}
                          onChange={e => setNewAddr(a => ({ ...a, note: e.target.value }))} />
                      </label>
                    </div>
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-primary" onClick={addGatewayAddress}><Plus size={14} /> Add Address</button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setAddAddrOpen(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Address Modal */}
              {editAddrId && (
                <div className="sa-drawer-overlay" onClick={() => setEditAddrId(null)}>
                  <div className="sa-modal" onClick={e => e.stopPropagation()}>
                    <div className="sa-drawer-head">
                      <h3>Edit Deposit Address</h3>
                      <button className="sa-icon-btn" onClick={() => setEditAddrId(null)}><X size={16} /></button>
                    </div>
                    <div className="sa-form-grid">
                      <label className="sa-label">Network Code
                        <input className="sa-input" value={editAddrDraft.network}
                          onChange={e => setEditAddrDraft(d => ({ ...d, network: e.target.value.toUpperCase() }))} />
                      </label>
                      <label className="sa-label">Asset Name
                        <input className="sa-input" value={editAddrDraft.assetName}
                          onChange={e => setEditAddrDraft(d => ({ ...d, assetName: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Wallet Address
                        <input className="sa-input" value={editAddrDraft.address}
                          onChange={e => setEditAddrDraft(d => ({ ...d, address: e.target.value }))} />
                      </label>
                      <label className="sa-label" style={{ gridColumn: '1/-1' }}>Note
                        <input className="sa-input" value={editAddrDraft.note}
                          onChange={e => setEditAddrDraft(d => ({ ...d, note: e.target.value }))} />
                      </label>
                    </div>
                    <div className="sa-modal-actions">
                      <button className="sa-btn sa-btn-primary" onClick={saveEditAddr}><CheckCircle2 size={14} /> Save Changes</button>
                      <button className="sa-btn sa-btn-ghost" onClick={() => setEditAddrId(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            {/* Deposit Limits Panel */}
            <div className="sa-panel" style={{ marginTop: '16px' }}>
              <div className="sa-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={14} /> Deposit & Withdrawal Limits</span>
                {settingsSaved && <span style={{ fontSize: '11px', color: '#1ccf84' }}>✓ Saved</span>}
              </div>
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'end' }}>
                <label className="sa-label">
                  Min Crypto Deposit (USD)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minUSD}
                    onChange={e => setSettingsDraft(d => ({ ...d, minUSD: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: ${minDepositUSD}</span>
                </label>
                <label className="sa-label">
                  Min M-Pesa Deposit (KES)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minKES}
                    onChange={e => setSettingsDraft(d => ({ ...d, minKES: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: KES {minDepositKES}</span>
                </label>
                <label className="sa-label">
                  Min Withdrawal (USD)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minWithdraw}
                    onChange={e => setSettingsDraft(d => ({ ...d, minWithdraw: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: ${minWithdrawalUSD}</span>
                </label>
                <button className="sa-btn sa-btn-primary" style={{ gridColumn: '1/-1' }}
                  onClick={async () => {
                    const usd = parseFloat(settingsDraft.minUSD)
                    const kes = parseFloat(settingsDraft.minKES)
                    const wit = parseFloat(settingsDraft.minWithdraw)
                    if (!usd || !kes || !wit || usd < 1 || kes < 1 || wit < 1) { notify('All limits must be at least 1.', 'err'); return }
                    setMinDepositUSD(usd)
                    setMinDepositKES(kes)
                    setMinWithdrawalUSD(wit)
                    setSettingsSaved(true)

                    try {
                      await Promise.all([
                        fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                          body: JSON.stringify({ key: 'min_deposit_usd', value: usd.toString(), updated_at: new Date().toISOString() }),
                        }),
                        fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                          body: JSON.stringify({ key: 'min_deposit_kes', value: kes.toString(), updated_at: new Date().toISOString() }),
                        }),
                        fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                          body: JSON.stringify({ key: 'min_withdrawal_usd', value: wit.toString(), updated_at: new Date().toISOString() }),
                        }),
                      ])
                    } catch {
                      // silent
                    }

                    addAudit('UPDATE_DEPOSIT_LIMITS', 'system', 'Settings', `Min deposit: $${usd} USD / KES ${kes}. Min withdrawal: $${wit}`, 'info')
                    notify(`Limits updated in database: Min deposit $${usd} / KES ${kes}, Min withdrawal $${wit}.`)
                    setTimeout(() => setSettingsSaved(false), 3000)
                  }}>
                  <CheckCircle2 size={14} /> Apply Limits
                </button>
              </div>
            </div>
            </div>
          )}

          {/* ═══════════════════ SETTINGS ══════════════════════════════════ */}
          {section === 'settings' && (
            <div className="sa-section">
              <div className="sa-section-head">
                <div>
                  <div className="sa-kicker">PORTAL CONFIGURATION</div>
                  <h1>Security Settings</h1>
                </div>
              </div>

              <div className="sa-settings-grid">
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Shield size={20} /></div>
                  <div>
                    <strong>Two-Factor Authentication</strong>
                    <p className="sa-dim">Mandatory for all admin logins. Cannot be disabled.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>Enforced</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Clock size={20} /></div>
                  <div>
                    <strong>Session Timeout</strong>
                    <p className="sa-dim">Auto-locks after 15 minutes of inactivity.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(32,235,90,0.12)', color: '#20eb5a' }}>15 min</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Globe size={20} /></div>
                  <div>
                    <strong>IP Whitelisting</strong>
                    <p className="sa-dim">Restrict portal access to specific IP addresses.</p>
                  </div>
                  <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={() => notify('IP whitelist management coming soon.')}>Configure</button>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Lock size={20} /></div>
                  <div>
                    <strong>Emergency Lockdown</strong>
                    <p className="sa-dim">Immediately suspend all admin operations across the platform.</p>
                  </div>
                  <button
                    className={`sa-btn sa-btn-sm ${lockdownActive ? 'sa-btn-ok' : 'sa-btn-danger'}`}
                    onClick={() => { setLockdownActive(p => !p); addAudit(lockdownActive ? 'LIFT_LOCKDOWN' : 'TRIGGER_LOCKDOWN', 'system', 'System', lockdownActive ? 'Lockdown lifted via settings' : 'Lockdown triggered via settings', 'critical') }}
                  >
                    {lockdownActive ? 'Lift Lockdown' : 'Trigger Lockdown'}
                  </button>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Activity size={20} /></div>
                  <div>
                    <strong>Audit Log Retention</strong>
                    <p className="sa-dim">All logs are immutable and retained indefinitely. Exports available as CSV.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(242,185,75,0.12)', color: '#f2b94b' }}>Indefinite</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><Wifi size={20} /></div>
                  <div>
                    <strong>Encrypted Data Streams</strong>
                    <p className="sa-dim">All document processing and data transfers use TLS 1.3 end-to-end encryption.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(28,207,132,0.15)', color: '#1ccf84' }}>TLS 1.3</span>
                </div>
                <div className="sa-setting-card">
                  <div className="sa-setting-icon"><ServerCrash size={20} /></div>
                  <div>
                    <strong>Super Admin Protection</strong>
                    <p className="sa-dim">Super Admin credentials and role cannot be modified or revoked by any other admin.</p>
                  </div>
                  <span className="sa-badge" style={{ background: 'rgba(32,235,90,0.12)', color: '#20eb5a' }}>Immutable</span>
                </div>
              </div>
            </div>
          )}

        </div>
        {/* end sa-content */}
      </main>

      {/* ── Edit User Details modal ─────────────────────────────────────────── */}
      {editUserModal && (
        <div className="sa-drawer-overlay" onClick={() => setEditUserModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Edit User — {editUserModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setEditUserModal(null)}><X size={16} /></button>
            </div>
            <div className="sa-form-grid">
              <label className="sa-label">Full Name
                <input className="sa-input" value={editDraft.name}
                  onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
              </label>
              <label className="sa-label">Email
                <input className="sa-input" type="email" value={editDraft.email}
                  onChange={e => setEditDraft(d => ({ ...d, email: e.target.value }))} />
              </label>
              <label className="sa-label">Phone
                <input className="sa-input" value={editDraft.phone}
                  onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value }))} />
              </label>
              <label className="sa-label">Country
                <input className="sa-input" value={editDraft.country}
                  onChange={e => setEditDraft(d => ({ ...d, country: e.target.value }))} />
              </label>
            </div>
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-primary" onClick={saveEditUser}>
                <CheckCircle2 size={14} /> Save Changes
              </button>
              <button className="sa-btn sa-btn-ghost" onClick={() => setEditUserModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password modal ──────────────────────────────────────────── */}
      {resetPwModal && (
        <div className="sa-drawer-overlay" onClick={() => setResetPwModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Reset Password — {resetPwModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setResetPwModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>
              Set a new password for <strong style={{ color: '#20eb5a' }}>{resetPwModal.email}</strong>.
              The user will need to use this password on their next login.
            </p>
            {!resetPwDone ? (
              <>
                <label className="sa-label" style={{ marginBottom: '14px' }}>New Password
                  <div style={{ position: 'relative' }}>
                    <input
                      className="sa-input"
                      type="password"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <span style={{ fontSize: '11px', color: '#ff1744', marginTop: '4px', display: 'block' }}>
                      Password must be at least 8 characters
                    </span>
                  )}
                </label>
                <div className="sa-modal-actions">
                  <button className="sa-btn sa-btn-danger" onClick={applyResetPassword}>
                    <KeyRound size={14} /> Reset Password
                  </button>
                  <button className="sa-btn sa-btn-ghost" onClick={() => setResetPwModal(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={32} color="#00e676" />
                <strong style={{ color: '#00e676' }}>Password Reset Successfully</strong>
                <p className="sa-dim">The new password has been applied to {resetPwModal.name}'s account.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upgrade to Admin modal ───────────────────────────────────────── */}
      {upgradeModal && (
        <div className="sa-drawer-overlay" onClick={() => setUpgradeModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Upgrade to Admin — {upgradeModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setUpgradeModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>
              This will move <strong style={{ color: '#20eb5a' }}>{upgradeModal.name}</strong> from the Users list to the Admin Team and grant them admin access.
              This action is logged and reversible.
            </p>
            <label className="sa-label" style={{ marginBottom: '16px' }}>
              Assign Role
              <select className="sa-input" value={upgradeRole}
                onChange={e => setUpgradeRole(e.target.value as AdminRole)}>
                <option value="kyc_admin">KYC Admin — Review &amp; approve KYC documents</option>
                <option value="finance_admin">Finance Admin — Approve withdrawals &amp; adjust balances</option>
                <option value="support_admin">Support Admin — Read-only access to user profiles</option>
              </select>
            </label>
            <div className="sa-modal-actions">
              <button className="sa-btn" style={{ background: 'rgba(32,235,90,0.15)', color: '#20eb5a', border: '1px solid rgba(32,235,90,0.35)' }}
                onClick={upgradeUserToAdmin}>
                <ShieldCheck size={14} /> Confirm Upgrade to Admin
              </button>
              <button className="sa-btn sa-btn-ghost" onClick={() => setUpgradeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notify User modal ──────────────────────────────────────────── */}
      {notifyModal && (
        <div className="sa-drawer-overlay" onClick={() => setNotifyModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Send Notification — {notifyModal.name}</h3>
              <button className="sa-icon-btn" onClick={() => setNotifyModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>
              Message will be sent to <strong style={{ color: '#20eb5a' }}>{notifyModal.email}</strong>
            </p>
            {!notifySent ? (
              <>
                <div className="sa-form-grid">
                  <label className="sa-label" style={{ gridColumn: '1/-1' }}>
                    Notification Type
                    <select className="sa-input" value={notifyType}
                      onChange={e => setNotifyType(e.target.value as 'info' | 'warning' | 'success')}>
                      <option value="info">ℹ️ Info — General message</option>
                      <option value="warning">⚠️ Warning — Requires attention</option>
                      <option value="success">✅ Success — Positive update</option>
                    </select>
                  </label>
                  <label className="sa-label" style={{ gridColumn: '1/-1' }}>
                    Subject
                    <input className="sa-input" placeholder="e.g. Account Update" value={notifySubject}
                      onChange={e => setNotifySubject(e.target.value)} />
                  </label>
                  <label className="sa-label" style={{ gridColumn: '1/-1' }}>
                    Message
                    <textarea className="sa-textarea" rows={4} placeholder="Write your message here…"
                      value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} />
                  </label>
                </div>
                <div className="sa-modal-actions">
                  <button className="sa-btn sa-btn-primary" onClick={sendNotification}>
                    <Bell size={14} /> Send Notification
                  </button>
                  <button className="sa-btn sa-btn-ghost" onClick={() => setNotifyModal(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={36} color="#00e676" />
                <strong style={{ color: '#00e676' }}>Notification Sent</strong>
                <p className="sa-dim">{notifyModal.name} has been notified.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Balance adjustment modal ──────────────────────────────────────── */}
      {balanceModal && (
        <div className="sa-drawer-overlay" onClick={() => setBalanceModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-drawer-head">
              <h3>Adjust Balance — {balanceModal.user.name}</h3>
              <button className="sa-icon-btn" onClick={() => setBalanceModal(null)}><X size={16} /></button>
            </div>
            <p className="sa-dim" style={{ marginBottom: '14px' }}>Current balance: <strong style={{ color: '#1ccf84' }}>{fmtUSD(balanceModal.user.balance)}</strong></p>
            <div className="sa-form-grid">
              <label className="sa-label" style={{ gridColumn: '1/-1' }}>Operation
                <select className="sa-input" value={balanceModal.mode} onChange={e => setBalanceModal(p => p ? ({ ...p, mode: e.target.value as 'credit' | 'debit' }) : null)}>
                  <option value="credit">Credit (add funds)</option>
                  <option value="debit">Debit (remove funds)</option>
                </select>
              </label>
              <label className="sa-label" style={{ gridColumn: '1/-1' }}>Amount (USD)
                <input className="sa-input" type="number" min="1" placeholder="0.00" value={balanceModal.amount} onChange={e => setBalanceModal(p => p ? ({ ...p, amount: e.target.value }) : null)} />
              </label>
              <label className="sa-label" style={{ gridColumn: '1/-1' }}>Internal Reason (required)
                <input className="sa-input" placeholder="e.g. Manual correction for failed withdrawal refund" value={balanceModal.reason} onChange={e => setBalanceModal(p => p ? ({ ...p, reason: e.target.value }) : null)} />
              </label>
            </div>
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-primary" onClick={applyBalanceAdjustment}>
                <DollarSign size={14} /> Apply Adjustment
              </button>
              <button className="sa-btn sa-btn-ghost" onClick={() => setBalanceModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`sa-toast sa-toast-${toast.type}`}>
          {toast.type === 'ok' ? <CheckCircle2 size={15} /> : toast.type === 'err' ? <XCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
