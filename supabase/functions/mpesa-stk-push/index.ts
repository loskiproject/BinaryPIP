/**
 * NEXSMARKETS — M-Pesa STK Push via PayHero
 * https://docs.payhero.co.ke
 *
 * Required Supabase secrets (Dashboard → Edge Functions → Secrets):
 *   PAYHERO_API_USERNAME   — API username from PayHero dashboard → API Keys
 *   PAYHERO_API_PASSWORD   — API password from PayHero dashboard → API Keys
 *   PAYHERO_CHANNEL_ID     — Numeric channel ID from PayHero → Payment Channels
 *   PAYHERO_CALLBACK_URL   — Public URL PayHero will POST results to
 *                            e.g. https://your-project.supabase.co/functions/v1/mpesa-callback
 *   APP_ORIGIN             — Your Vercel frontend URL e.g. https://cryptcoin.vercel.app
 */

const PAYHERO_BASE = 'https://backend.payhero.co.ke/api/v2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function respond(body: unknown, status = 200, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin },
  })
}

/** Normalise phone: 07XXXXXXXX → 2547XXXXXXXX */
function normalisePhone(phone: string): string {
  const clean = phone.replace(/\s+/g, '').replace(/^(\+254|254)/, '0')
  if (clean.startsWith('07') || clean.startsWith('01')) {
    return `254${clean.slice(1)}`
  }
  return clean
}

/** Generate a unique external reference */
function generateRef(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `NXS-${ts}-${rand}`
}

Deno.serve(async (req) => {
  const appUrl = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'
  const origin = req.headers.get('Origin') ?? ''
  const allowed =
    origin === appUrl || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ? origin
      : appUrl

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowed },
    })
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed.' }, 405, allowed)
  }

  // Read credentials from Supabase secrets
  const apiUsername   = Deno.env.get('PAYHERO_API_USERNAME')
  const apiPassword   = Deno.env.get('PAYHERO_API_PASSWORD')
  const channelId     = Deno.env.get('PAYHERO_CHANNEL_ID')
  const callbackUrl   = Deno.env.get('PAYHERO_CALLBACK_URL')

  if (!apiUsername || !apiPassword) {
    return respond(
      { error: 'PayHero API credentials not configured. Add PAYHERO_API_USERNAME and PAYHERO_API_PASSWORD to Supabase secrets.' },
      503,
      allowed
    )
  }

  if (!channelId) {
    return respond(
      { error: 'PAYHERO_CHANNEL_ID not configured. Add it to Supabase secrets.' },
      503,
      allowed
    )
  }

  if (!callbackUrl) {
    return respond(
      { error: 'PAYHERO_CALLBACK_URL not configured. Add it to Supabase secrets.' },
      503,
      allowed
    )
  }

  // Parse request body
  let body: { phone: string; amount: number; customerName?: string }
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON body.' }, 400, allowed)
  }

  const { phone, amount, customerName = 'NEXSMARKETS CLIENT' } = body

  if (!phone || !amount) {
    return respond({ error: 'phone and amount are required.' }, 400, allowed)
  }

  if (amount < 1) {
    return respond({ error: 'Amount must be at least KES 1.' }, 400, allowed)
  }

  const normalisedPhone = normalisePhone(String(phone))
  if (!/^2547\d{8}$|^2541\d{8}$/.test(normalisedPhone)) {
    return respond(
      { error: 'Invalid M-Pesa phone number. Use 07XXXXXXXX or 01XXXXXXXX format.' },
      400,
      allowed
    )
  }

  // Build Basic auth header
  const basicToken = btoa(`${apiUsername}:${apiPassword}`)
  const externalReference = generateRef()

  try {
    const res = await fetch(`${PAYHERO_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.ceil(amount),
        phone_number: normalisedPhone,
        channel_id: Number(channelId),
        provider: 'm-pesa',
        external_reference: externalReference,
        customer_name: customerName,
        callback_url: callbackUrl,
      }),
    })

    type PayHeroResponse = {
      success?: boolean
      status?: string
      reference?: string
      CheckoutRequestID?: string
      message?: string
      error?: string
    }

    const data = await res.json() as PayHeroResponse

    if (!res.ok || !data.success) {
      const msg = data.message ?? data.error ?? `PayHero error: ${res.status}`
      return respond({ error: msg }, res.ok ? 400 : res.status, allowed)
    }

    return respond({
      success: true,
      message: 'STK Push sent. Please check your phone and enter your M-Pesa PIN.',
      reference: data.reference,
      checkoutRequestId: data.CheckoutRequestID,
      externalReference,
    }, 201, allowed)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return respond({ error: `STK Push failed: ${message}` }, 500, allowed)
  }
})
