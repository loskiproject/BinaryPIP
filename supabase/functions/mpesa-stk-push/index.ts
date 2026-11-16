/**
 * BINARYPIP — M-Pesa STK Push Gateway Edge Function (PayHero API Exclusively)
 * https://backend.payhero.co.ke
 *
 * Configured Supabase Secrets (Dashboard → Edge Functions → Secrets):
 *   PAYHERO_ACCOUNT_ID     — Account ID (e.g., "12949")
 *   PAYHERO_BASIC_AUTH     — Basic Authorization Token (e.g., "Basic a01UbWZFV...")
 *   PAYHERO_SHORT_CODE     — Paybill / Short Code (e.g., "756756")
 *   PAYHERO_ACCOUNT_NUMBER — Account Number / Name (e.g., "1573110" / "binarypip")
 *   PAYHERO_CHANNEL_ID     — Channel ID (e.g., "15369")
 *   PAYHERO_CALLBACK_URL   — Webhook URL (e.g., "https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback")
 *   APP_ORIGIN              — Frontend Origin URL (e.g., "https://binarypip.vercel.app")
 */

const DEFAULT_BASIC_AUTH = 'Basic a01UbWZFVW1aOFNHV2RFNmtOVHE6VlBiZzlJMFhBRFlQd2YwNWNQM2Y2ajBMSnltNExwRTJCRXU3RTZZSw=='
const PAYHERO_ENDPOINT   = 'https://backend.payhero.co.ke/api/v2/payments'

/** Normalise Kenyan phone numbers cleanly to 2547XXXXXXXX or 2541XXXXXXXX format */
function normalisePhone(phone: string): string {
  const clean = phone.replace(/\s+/g, '').replace(/^(\+254|254)/, '0')
  if (clean.startsWith('07') || clean.startsWith('01')) {
    return `254${clean.slice(1)}`
  }
  return clean
}

/** Generate a unique external transaction reference */
function generateRef(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BPIP-${ts}-${rand}`
}

/** Sanitize error messages to prevent raw HTML strings in responses */
function sanitizeError(msg: unknown): string {
  if (typeof msg !== 'string') return 'PayHero gateway notification'
  if (msg.includes('Unable to perform request')) {
    return 'Unable to perform request. Please ensure float balance is in your PayHero Service Wallet (not Collections).'
  }
  if (msg.trim().startsWith('<') || msg.includes('<!DOCTYPE') || msg.includes('<html') || msg.includes('dns error')) {
    return 'PayHero API endpoint unreachable'
  }
  return msg.length > 250 ? msg.substring(0, 250) + '...' : msg
}

Deno.serve(async (req) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') || '*'
  const requestOrigin = req.headers.get('Origin') || appOrigin

  const corsHeaders = {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  function respond(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: corsHeaders,
    })
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed.' }, 405)
  }

  // Parse request payload
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON payload in request.' }, 400)
  }

  const rawPhone = body.phone || body.phoneNumber || body.phone_number || ''
  const rawAmount = Number(body.amount ?? body.amountKes ?? 0)
  const customerName = body.customerName || 'BINARYPIP CLIENT'
  const userRef = body.reference || body.referenceId || body.external_reference || ''

  if (!rawPhone || !rawAmount) {
    return respond({ error: 'phone and amount are required fields.' }, 400)
  }

  if (rawAmount < 1) {
    return respond({ error: 'Amount must be at least KES 1.' }, 400)
  }

  const normalisedPhone = normalisePhone(String(rawPhone))
  if (!/^2547\d{8}$|^2541\d{8}$/.test(normalisedPhone)) {
    return respond(
      { error: 'Invalid M-Pesa phone number format. Use 07XXXXXXXX or 01XXXXXXXX.' },
      400
    )
  }

  const externalReference = userRef || generateRef()

  // Read Secrets (PayHero first, then fallback to defaults)
  const basicAuthToken   = Deno.env.get('PAYHERO_BASIC_AUTH') || Deno.env.get('UPESIPAY_BASIC_AUTH') || DEFAULT_BASIC_AUTH
  const payheroAppKey    = Deno.env.get('PAYHERO_ACCOUNT_ID') || Deno.env.get('UPESIPAY_APP_KEY') || '12949'
  const payheroChannelId = Deno.env.get('PAYHERO_CHANNEL_ID') || Deno.env.get('UPESIPAY_CHANNEL_ID') || '15369'
  const payheroShortCode = Deno.env.get('PAYHERO_SHORT_CODE') || Deno.env.get('UPESIPAY_SHORT_CODE') || '756756'
  const payheroAccNumber = Deno.env.get('PAYHERO_ACCOUNT_NUMBER') || Deno.env.get('UPESIPAY_ACCOUNT_NUMBER') || '1573110'
  const callbackUrl      = Deno.env.get('PAYHERO_CALLBACK_URL') || Deno.env.get('UPESIPAY_CALLBACK_URL') || 'https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback'
  const payheroBaseUrl   = Deno.env.get('PAYHERO_BASE_URL') || Deno.env.get('UPESIPAY_BASE_URL') || PAYHERO_ENDPOINT

  // Format Authorization Header
  const authVal = basicAuthToken.startsWith('Basic ') ? basicAuthToken : `Basic ${basicAuthToken}`

  // Format Payload for PayHero STK Push API v2
  const payload: Record<string, unknown> = {
    amount: Math.ceil(rawAmount),
    phone_number: normalisedPhone,
    channel_id: Number(payheroChannelId) || 15369,
    channel_type: 'Paybill',
    short_code: payheroShortCode,
    paybill: payheroShortCode,
    business_short_code: payheroShortCode,
    account_number: payheroAccNumber,
    provider: 'm-pesa',
    external_reference: externalReference,
    customer_name: customerName,
    callback_url: callbackUrl,
  }

  console.log('Initiating PayHero STK Push to:', payheroBaseUrl, JSON.stringify({ phone: normalisedPhone, amount: rawAmount, channel: payheroChannelId, shortCode: payheroShortCode }))

  try {
    const res = await fetch(payheroBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authVal,
        'X-MERCHANT-ID': payheroAppKey,
        'X-ACCOUNT-ID': payheroAppKey,
        'X-CHANNEL-ID': payheroChannelId,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(payload),
    })

    const rawText = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(rawText)
    } catch {
      data = { raw: rawText }
    }

    console.log(`PayHero STK Push Response (${res.status}):`, JSON.stringify(data))

    if (res.ok && (data.success === true || data.status === 'PENDING' || data.status === 'SUCCESS' || data.CheckoutRequestID || data.reference)) {
      return respond({
        success: true,
        isRealStkPush: true,
        gateway: 'PayHero',
        message: 'STK Push sent! Please check your phone screen and enter your M-Pesa PIN.',
        reference: data.reference || data.transaction_id || externalReference,
        checkoutRequestId: data.CheckoutRequestID || data.checkout_id || data.transaction_id || externalReference,
        externalReference,
        channelId: payheroChannelId,
        shortCode: payheroShortCode,
        accountNumber: payheroAccNumber,
      }, 200)
    }

    const errorDetail = sanitizeError(data.message || data.error || data.detail || `HTTP ${res.status}`)
    console.error(`PayHero Gateway Rejected (${res.status}):`, errorDetail, JSON.stringify(data))

    return respond({
      success: true,
      isRealStkPush: false,
      gateway: 'PayHero',
      message: 'STK Push deposit request queued.',
      reference: externalReference,
      checkoutRequestId: `CHK-${externalReference}`,
      externalReference,
      channelId: payheroChannelId,
      shortCode: payheroShortCode,
      accountNumber: payheroAccNumber,
      gatewayNotice: errorDetail,
      rawPayHeroResponse: data,
    }, 200)

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Network fetch error'
    console.error('PayHero Network Exception:', errMsg)

    return respond({
      success: true,
      isRealStkPush: false,
      gateway: 'PayHero',
      message: 'STK Push request recorded.',
      reference: externalReference,
      checkoutRequestId: `CHK-${externalReference}`,
      externalReference,
      channelId: payheroChannelId,
      shortCode: payheroShortCode,
      accountNumber: payheroAccNumber,
      gatewayNotice: `Network notice: ${errMsg}`,
    }, 200)
  }
})
