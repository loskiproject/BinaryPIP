/**
 * NEXSMARKETS — M-Pesa STK Push Edge Function
 * Calls Safaricom Daraja API to send an STK Push prompt to the user's phone.
 *
 * Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
 *   MPESA_CONSUMER_KEY        — From Safaricom Daraja app
 *   MPESA_CONSUMER_SECRET     — From Safaricom Daraja app
 *   MPESA_PAYBILL             — Your Paybill / Till number
 *   MPESA_PASSKEY             — Lipa Na M-Pesa Online Passkey from Daraja
 *   MPESA_CALLBACK_URL        — e.g. https://nexsmarkets.com/api/mpesa-callback
 *   APP_ORIGIN                — e.g. https://nexsmarkets.com
 *
 * Sandbox vs Production:
 *   Set MPESA_ENV=sandbox  for testing (default)
 *   Set MPESA_ENV=production for live payments
 */

const SANDBOX_BASE    = 'https://sandbox.safaricom.co.ke'
const PRODUCTION_BASE = 'https://api.safaricom.co.ke'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function getBase(): string {
  return Deno.env.get('MPESA_ENV') === 'production' ? PRODUCTION_BASE : SANDBOX_BASE
}

function respond(body: unknown, status = 200, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin },
  })
}

/** Get OAuth access token from Safaricom */
async function getAccessToken(base: string, consumerKey: string, consumerSecret: string): Promise<string> {
  const credentials = btoa(`${consumerKey}:${consumerSecret}`)
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: { Authorization: `Basic ${credentials}` },
  })
  if (!res.ok) throw new Error(`OAuth failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

/** Generate STK Push password: Base64(Paybill + Passkey + Timestamp) */
function getPassword(paybill: string, passkey: string, timestamp: string): string {
  return btoa(`${paybill}${passkey}${timestamp}`)
}

/** Format timestamp: YYYYMMDDHHmmss */
function getTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/** Normalise phone: 07xxxxxxxx → 2547xxxxxxxx */
function normalisePhone(phone: string): string {
  const clean = phone.replace(/\s+/g, '').replace(/^(\+254|254)/, '0')
  if (clean.startsWith('07') || clean.startsWith('01')) {
    return `254${clean.slice(1)}`
  }
  return clean
}

Deno.serve(async (req) => {
  const appUrl = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'
  const origin = req.headers.get('Origin') ?? ''
  const allowed = origin === appUrl || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ? origin : appUrl

  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowed } })
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405, allowed)

  const consumerKey    = Deno.env.get('MPESA_CONSUMER_KEY')
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')
  const paybill        = Deno.env.get('MPESA_PAYBILL') ?? '174379'
  const passkey        = Deno.env.get('MPESA_PASSKEY') ?? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
  const callbackUrl    = Deno.env.get('MPESA_CALLBACK_URL') ?? 'https://example.com/callback'

  if (!consumerKey || !consumerSecret) {
    return respond({ error: 'M-Pesa API keys not configured. Add MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET to Supabase secrets.' }, 503, allowed)
  }

  let body: { phone: string; amount: number; accountRef?: string }
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON body.' }, 400, allowed)
  }

  const { phone, amount, accountRef = 'NEXSMARKETS' } = body

  if (!phone || !amount) {
    return respond({ error: 'phone and amount are required.' }, 400, allowed)
  }

  if (amount < 1) {
    return respond({ error: 'Amount must be at least KES 1.' }, 400, allowed)
  }

  const normalisedPhone = normalisePhone(String(phone))
  if (!/^2547\d{8}$|^2541\d{8}$/.test(normalisedPhone)) {
    return respond({ error: 'Invalid M-Pesa phone number. Use 07XXXXXXXX format.' }, 400, allowed)
  }

  const base      = getBase()
  const timestamp = getTimestamp()
  const password  = getPassword(paybill, passkey, timestamp)

  try {
    const accessToken = await getAccessToken(base, consumerKey, consumerSecret)

    const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: paybill,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            Math.ceil(amount),
        PartyA:            normalisedPhone,
        PartyB:            paybill,
        PhoneNumber:       normalisedPhone,
        CallBackURL:       callbackUrl,
        AccountReference:  accountRef,
        TransactionDesc:   `NEXSMARKETS Deposit`,
      }),
    })

    const stkData = await stkRes.json() as {
      ResponseCode?: string
      ResponseDescription?: string
      CustomerMessage?: string
      CheckoutRequestID?: string
      MerchantRequestID?: string
      errorCode?: string
      errorMessage?: string
    }

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      const msg = stkData.errorMessage ?? stkData.ResponseDescription ?? 'STK Push failed.'
      return respond({ error: msg }, 400, allowed)
    }

    return respond({
      success: true,
      message: stkData.CustomerMessage ?? 'STK Push sent. Check your phone.',
      checkoutRequestId: stkData.CheckoutRequestID,
      merchantRequestId: stkData.MerchantRequestID,
    }, 200, allowed)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return respond({ error: `STK Push error: ${message}` }, 500, allowed)
  }
})
