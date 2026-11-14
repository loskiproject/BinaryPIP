/**
 * NEXSMARKETS — M-Pesa STK Push Gateway Edge Function
 * Supports UpesiPay API & PayHero API
 *
 * Configurable Supabase Secrets (Dashboard → Edge Functions → Secrets):
 *
 * ── UPESIPAY GATEWAY CREDENTIALS ──
 *   UPESIPAY_API_KEY      — Your API Username or Token e.g. "S4xI-GnBs6cZGIyvIw8g"
 *   UPESIPAY_APP_KEY      — Your Merchant ID e.g. "XE386"
 *   UPESIPAY_BASE_URL     — (Optional) Default: https://api.upesipay.com/v1
 *   UPESIPAY_CALLBACK_URL — Public webhook URL for M-Pesa callbacks
 *                           e.g. https://<project-ref>.supabase.co/functions/v1/mpesa-callback
 *
 * ── PAYHERO GATEWAY CREDENTIALS (FALLBACK) ──
 *   PAYHERO_BASIC_AUTH_TOKEN  — Full Basic token from PayHero dashboard
 *   PAYHERO_CHANNEL_ID        — Numeric channel ID from PayHero
 *   PAYHERO_CALLBACK_URL      — Webhook callback URL
 *
 * ── COMMON ──
 *   APP_ORIGIN                — Your frontend origin URL
 */

const DEFAULT_UPESIPAY_BASE = 'https://api.upesipay.com/v1'
const DEFAULT_PAYHERO_BASE  = 'https://backend.payhero.co.ke/api/v2'

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

/** Normalise phone: 07XXXXXXXX or 01XXXXXXXX or +254... → 2547XXXXXXXX */
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

  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowed },
    })
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed.' }, 405, allowed)
  }

  // Parse request payload
  let body: { phone: string; amount: number; customerName?: string; reference?: string }
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON body.' }, 400, allowed)
  }

  const { phone, amount, customerName = 'NEXSMARKETS CLIENT', reference: userRef } = body

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

  const externalReference = userRef || generateRef()

  // 1. Check for UpesiPay Gateway Credentials
  const upesiApiKey      = Deno.env.get('UPESIPAY_API_KEY')
  const upesiAppKey      = Deno.env.get('UPESIPAY_APP_KEY')
  const upesiBaseUrl     = Deno.env.get('UPESIPAY_BASE_URL') || DEFAULT_UPESIPAY_BASE
  const upesiCallbackUrl = Deno.env.get('UPESIPAY_CALLBACK_URL') || Deno.env.get('PAYHERO_CALLBACK_URL')

  // 2. Check for PayHero Credentials (Fallback)
  const payheroToken     = Deno.env.get('PAYHERO_BASIC_AUTH_TOKEN')
  const payheroChannelId = Deno.env.get('PAYHERO_CHANNEL_ID')
  const payheroCallback  = Deno.env.get('PAYHERO_CALLBACK_URL')

  // If UpesiPay credentials exist, use UpesiPay Gateway
  if (upesiApiKey) {
    try {
      const upesiEndpoint = `${upesiBaseUrl.replace(/\/$/, '')}/stkpush`

      const payload: Record<string, unknown> = {
        api_username: upesiApiKey,
        api_key: upesiApiKey,
        merchant_id: upesiAppKey || 'XE386',
        amount: Math.ceil(amount),
        phone: normalisedPhone,
        phone_number: normalisedPhone,
        reference: externalReference,
        account_reference: externalReference,
        transaction_desc: `Deposit KES ${amount} to Real Account`,
        description: `Deposit KES ${amount}`,
        callback_url: upesiCallbackUrl || `${appUrl}/api/mpesa-callback`,
        customer_name: customerName,
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': upesiApiKey.startsWith('Bearer ') ? upesiApiKey : `Bearer ${upesiApiKey}`,
        'X-API-KEY': upesiApiKey,
        'X-MERCHANT-ID': upesiAppKey || 'XE386',
      }

      const res = await fetch(upesiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || (data.success === false && data.status !== 'PENDING' && data.status !== 'SUCCESS')) {
        const errorMsg = data.message || data.error || data.detail || `UpesiPay API returned error (${res.status})`
        return respond({ error: errorMsg, gateway: 'UpesiPay' }, res.ok ? 400 : res.status, allowed)
      }

      return respond({
        success: true,
        gateway: 'UpesiPay',
        message: 'STK Push sent! Please check your phone and enter your M-Pesa PIN.',
        reference: data.reference || data.transaction_id || externalReference,
        checkoutRequestId: data.CheckoutRequestID || data.checkout_id || data.transaction_id || externalReference,
        externalReference,
      }, 200, allowed)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown network error'
      return respond({ error: `UpesiPay STK Push failed: ${message}` }, 500, allowed)
    }
  }

  // Fallback to PayHero if configured
  if (payheroToken && payheroChannelId && payheroCallback) {
    try {
      const res = await fetch(`${DEFAULT_PAYHERO_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': payheroToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.ceil(amount),
          phone_number: normalisedPhone,
          channel_id: Number(payheroChannelId),
          provider: 'm-pesa',
          external_reference: externalReference,
          customer_name: customerName,
          callback_url: payheroCallback,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        const msg = data.message ?? data.error ?? `PayHero error: ${res.status}`
        return respond({ error: msg, gateway: 'PayHero' }, res.ok ? 400 : res.status, allowed)
      }

      return respond({
        success: true,
        gateway: 'PayHero',
        message: 'STK Push sent. Please check your phone and enter your M-Pesa PIN.',
        reference: data.reference,
        checkoutRequestId: data.CheckoutRequestID,
        externalReference,
      }, 201, allowed)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return respond({ error: `PayHero STK Push failed: ${message}` }, 500, allowed)
    }
  }

  // If no credentials configured
  return respond({
    error: 'M-Pesa Gateway credentials not configured. Please add UPESIPAY_API_KEY in Supabase secrets.',
  }, 503, allowed)
})
