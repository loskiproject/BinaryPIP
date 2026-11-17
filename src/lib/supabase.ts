import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xggjgegiuqhyqapcfdto.supabase.co'
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RcFWyVMX1RtO66eVAMqNgw_tGyHvyUu'

export const supabaseUrl = rawUrl
export const supabaseKey = rawKey

export const supabaseConfigured = true

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    timeout: 15000,
    params: {
      eventsPerSecond: 10,
    },
  },
})

export const recordSecurityEvent = async (
  eventType: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  userEmail: string = '—',
  actionTaken: string = 'Logged',
  metadataObj: any = {}
) => {
  try {
    let clientIp = '127.0.0.1'
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1500) })
      if (ipRes.ok) {
        const ipData = await ipRes.json() as { ip?: string }
        if (ipData.ip) clientIp = ipData.ip
      }
    } catch {
      // fallback
    }

    const ipParts = clientIp.split('.')
    const subnetStr = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24` : `${clientIp}/24`

    await fetch(`${supabaseUrl}/rest/v1/security_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        severity: severity,
        user_email: userEmail,
        ip_address: clientIp,
        subnet: subnetStr,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'BinaryPip Client',
        action_taken: actionTaken,
        metadata: metadataObj,
      }),
    })
  } catch {
    // silent
  }
}
