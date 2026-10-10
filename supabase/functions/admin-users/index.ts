import { createClient } from 'npm:@supabase/supabase-js@2'

const appUrl = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'
const baseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('Origin') ?? ''
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin)
  const allowedOrigin = requestOrigin === appUrl || localOrigin ? requestOrigin : appUrl
  const corsHeaders = { ...baseHeaders, 'Access-Control-Allow-Origin': allowedOrigin }
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: corsHeaders })

  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return respond({ error: 'Admin service is not configured.' }, 503)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user || user.app_metadata.role !== 'admin') {
    return respond({ error: 'Admin access required.' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await request.json()
    if (body.action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return respond({ error: 'Could not load customer accounts.' }, 500)
      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .select('id, full_name, phone, country, created_at')
        .in('id', data.users.map((account) => account.id))
      if (profileError) return respond({ error: 'Could not load customer profiles.' }, 500)

      const profileById = new Map((profileData ?? []).map((profile) => [profile.id, profile]))
      return respond({ customers: data.users.map((account) => ({
        id: account.id,
        email: account.email ?? '',
        emailConfirmed: Boolean(account.email_confirmed_at),
        bannedUntil: account.banned_until ?? null,
        profile: profileById.get(account.id) ?? null,
      })) })
    }

    if (body.action === 'set_suspended') {
      const targetUserId = typeof body.userId === 'string' ? body.userId : ''
      const suspended = body.suspended === true
      if (!targetUserId || targetUserId === user.id) {
        return respond({ error: 'Choose another customer account to update.' }, 400)
      }

      const { data, error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: suspended ? '876000h' : 'none',
      })
      if (error) return respond({ error: 'Could not update this account.' }, 500)
      return respond({ userId: targetUserId, suspended: Boolean(data.user.banned_until) })
    }

    return respond({ error: 'Unknown admin action.' }, 400)
  } catch {
    return respond({ error: 'Invalid admin request.' }, 400)
  }
})