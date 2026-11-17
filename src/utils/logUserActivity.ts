import { supabase, supabaseUrl, supabaseKey } from '../lib/supabase'

export async function logUserActivity(
  userEmail: string,
  action: 'USER_LOGIN' | 'AUTH_FAILED' | 'PROFILE_UPDATE' | 'DEPOSIT_INIT' | 'MASTER_TRADER_APPLY' | string,
  details: string,
  severity: 'Info' | 'Warning' | 'Critical' | 'Success' | string = 'Info'
) {
  let ipAddress = '—'
  let location = 'Unknown Location'

  try {
    const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2000) })
    if (response.ok) {
      const data = await response.json()
      if (data.ip) {
        ipAddress = data.ip
      }
      if (data.city && data.country_name) {
        location = `${data.city}, ${data.country_name}`
      } else if (data.country_name) {
        location = data.country_name
      }
    }
  } catch (err) {
    // Fallback IP lookup
    try {
      const fbRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1500) })
      if (fbRes.ok) {
        const fbData = await fbRes.json()
        if (fbData.ip) ipAddress = fbData.ip
      }
    } catch {
      // silent
    }
  }

  const enrichedDetails = `${details} [Location: ${location}]`

  try {
    if (supabase) {
      const { error } = await supabase.from('user_logs').insert([
        {
          user_email: userEmail || 'anonymous@binarypip.com',
          action: action,
          details: enrichedDetails,
          severity: severity,
          ip_address: ipAddress,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) {
        // Direct REST fallback if client SDK fails
        await fetch(`${supabaseUrl}/rest/v1/user_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            user_email: userEmail || 'anonymous@binarypip.com',
            action: action,
            details: enrichedDetails,
            severity: severity,
            ip_address: ipAddress,
            created_at: new Date().toISOString(),
          }),
        })
      }
    }
  } catch (err) {
    console.error('Failed to save user log:', err)
  }
}
