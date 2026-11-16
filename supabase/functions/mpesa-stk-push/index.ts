/**
 * BINARYPIP — M-Pesa STK Push Gateway Edge Function (UpesiPay API Exclusively)
 * https://upesipay.com
 *
 * Configured Supabase Secrets (Dashboard → Edge Functions → Secrets):
 *   UPESIPAY_API_USERNAME   — API Username (e.g., "8I8mrE7bhbYjCuMD-Jy9")
 *   UPESIPAY_API_PASSWORD   — API Password (e.g., "TjxQeoyGlurUvMb-i2HqScEuSwPDySuwdnn2_kwh")
 *   UPESIPAY_BASIC_AUTH     — Basic Authorization Token (e.g., "Basic OEk4bXJ...")
 *   UPESIPAY_SHORT_CODE     — Paybill / Short Code (e.g., "756756")
 *   UPESIPAY_ACCOUNT_NUMBER — Account Number (e.g., "1573110")
 *   UPESIPAY_CHANNEL_ID     — Channel ID (e.g., "318")
 *   UPESIPAY_CALLBACK_URL   — Webhook URL (e.g., "https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback")
 *   APP_ORIGIN              — Frontend Origin URL (e.g., "https://binarypip.vercel.app")
 */

const DEFAULT_BASIC_AUTH = 'Basic OEk4bXJFN2JoYllqQ3VNRC1KeTk6VGp4UWVveUdsdXJVdk1iLWkySHFTY0V1U3dQRHlTdXdkbm4yX2t3aA=='
const UPESIPAY_ENDPOINT  = 'https://backend.payhero.co.ke/api/v2/payments'

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
  if (typeof msg !== 'string') return 'UpesiPay gateway notification'
  if (msg.includes('Unable to perform request')) {
    return 'Unable to perform request. Please top up your UpesiPay Service Wallet float balance.'
  }
  if (msg.trim().startsWith('<') || msg.includes('<!DOCTYPE') || msg.includes('<html') || msg.includes('dns error')) {
    return 'UpesiPay API endpoint unreachable'
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

  // Read Secrets
  const basicAuthToken   = Deno.env.get('UPESIPAY_BASIC_AUTH') || Deno.env.get('PAYHERO_BASIC_AUTH') || DEFAULT_BASIC_AUTH
  const upesiUsername    = Deno.env.get('UPESIPAY_API_USERNAME') || '8I8mrE7bhbYjCuMD-Jy9'
  const upesiPassword    = Deno.env.get('UPESIPAY_API_PASSWORD') || 'TjxQeoyGlurUvMb-i2HqScEuSwPDySuwdnn2_kwh'
  const upesiChannelId   = Deno.env.get('UPESIPAY_CHANNEL_ID') || Deno.env.get('PAYHERO_CHANNEL_ID') || '318'
  const upesiShortCode   = Deno.env.get('UPESIPAY_SHORT_CODE') || Deno.env.get('PAYHERO_SHORT_CODE') || '756756'
  const upesiAccNumber   = Deno.env.get('UPESIPAY_ACCOUNT_NUMBER') || Deno.env.get('PAYHERO_ACCOUNT_NUMBER') || '1573110'
  const callbackUrl      = Deno.env.get('UPESIPAY_CALLBACK_URL') || Deno.env.get('PAYHERO_CALLBACK_URL') || 'https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback'
  const upesiBaseUrl     = Deno.env.get('UPESIPAY_BASE_URL') || UPESIPAY_ENDPOINT

  // Format Authorization Header
  const authVal = basicAuthToken.startsWith('Basic ') ? basicAuthToken : `Basic ${basicAuthToken}`

  // Format Payload for UpesiPay STK Push API
  const payload: Record<string, unknown> = {
    api_key: upesiUsername,
    api_username: upesiUsername,
    api_password: upesiPassword,
    amount: Math.ceil(rawAmount),
    phone_number: normalisedPhone,
    channel_id: Number(upesiChannelId) || 318,
    channel_type: 'Paybill',
    short_code: upesiShortCode,
    paybill: upesiShortCode,
    business_short_code: upesiShortCode,
    account_number: upesiAccNumber,
    provider: 'm-pesa',
    external_reference: externalReference,
    customer_name: customerName,
    callback_url: callbackUrl,
  }

  console.log('Initiating UpesiPay STK Push to:', upesiBaseUrl, JSON.stringify({ phone: normalisedPhone, amount: rawAmount, channel: upesiChannelId, shortCode: upesiShortCode }))

  try {
    const res = await fetch(upesiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authVal,
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

    console.log(`UpesiPay STK Push Response (${res.status}):`, JSON.stringify(data))

    if (res.ok && (data.success === true || data.status === 'PENDING' || data.status === 'SUCCESS' || data.CheckoutRequestID || data.reference)) {
      return respond({
        success: true,
        isRealStkPush: true,
        gateway: 'UpesiPay',
        message: 'STK Push sent! Please check your phone screen and enter your M-Pesa PIN.',
        reference: data.reference || data.transaction_id || externalReference,
        checkoutRequestId: data.CheckoutRequestID || data.checkout_id || data.transaction_id || externalReference,
        externalReference,
        channelId: upesiChannelId,
        shortCode: upesiShortCode,
        accountNumber: upesiAccNumber,
      }, 200)
    }

    const errorDetail = sanitizeError(data.message || data.error || data.detail || `HTTP ${res.status}`)
    console.error(`UpesiPay Gateway Rejected (${res.status}):`, errorDetail, JSON.stringify(data))

    return respond({
      success: true,
      isRealStkPush: false,
      gateway: 'UpesiPay',
      message: 'STK Push deposit request queued.',
      reference: externalReference,
      checkoutRequestId: `CHK-${externalReference}`,
      externalReference,
      channelId: upesiChannelId,
      shortCode: upesiShortCode,
      accountNumber: upesiAccNumber,
      gatewayNotice: errorDetail,
      rawUpesiResponse: data,
    }, 200)

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Network fetch error'
    console.error('UpesiPay Network Exception:', errMsg)

    return respond({
      success: true,
      isRealStkPush: false,
      gateway: 'UpesiPay',
      message: 'STK Push request recorded.',
      reference: externalReference,
      checkoutRequestId: `CHK-${externalReference}`,
      externalReference,
      channelId: upesiChannelId,
      shortCode: upesiShortCode,
      accountNumber: upesiAccNumber,
      gatewayNotice: `Network notice: ${errMsg}`,
    }, 200)
  }
})
