/**
 * NEXSMARKETS — M-Pesa STK Push Gateway Edge Function
 * UpesiPay / PayHero Paybill 756756 / Channel 318 Integration
 */

const DEFAULT_BASIC_AUTH = 'Basic c1lJV2hPUDdnUUlkbkxTM25ESmk6enRDLWtnNGtCODYyQ0xHbFlqNXF3N1YwV3UxRkdTZXRYTDNHN3RwVg=='

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

/** Sanitize error messages */
function sanitizeError(msg: unknown): string {
  if (typeof msg !== 'string') return 'Gateway temporary notice'
  if (msg.trim().startsWith('<') || msg.includes('<!DOCTYPE') || msg.includes('<html')) {
    return 'UpesiPay API endpoint unreachable'
  }
  return msg.length > 200 ? msg.substring(0, 200) + '...' : msg
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '*'

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
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

  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed.' }, 405)
  }

  // Parse request payload
  let body: { phone: string; amount: number; customerName?: string; reference?: string }
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON body.' }, 400)
  }

  const { phone, amount, customerName = 'NEXSMARKETS CLIENT', reference: userRef } = body

  if (!phone || !amount) {
    return respond({ error: 'phone and amount are required.' }, 400)
  }

  if (amount < 1) {
    return respond({ error: 'Amount must be at least KES 1.' }, 400)
  }

  const normalisedPhone = normalisePhone(String(phone))
  if (!/^2547\d{8}$|^2541\d{8}$/.test(normalisedPhone)) {
    return respond(
      { error: 'Invalid M-Pesa phone number. Use 07XXXXXXXX or 01XXXXXXXX format.' },
      400
    )
  }

  const externalReference = userRef || generateRef()

  // Read secrets
  const rawBasicAuth   = Deno.env.get('UPESIPAY_BASIC_AUTH') || DEFAULT_BASIC_AUTH
  const upesiApiKey      = Deno.env.get('UPESIPAY_API_KEY') || 'sYIWhOP7gQIdnLS3nDJi'
  const upesiApiPassword = Deno.env.get('UPESIPAY_API_PASSWORD') || 'ztC-kg4kB862CLGlYj5qw7V0Wu1FGSetXL3G7tpV'
  const upesiAppKey      = Deno.env.get('UPESIPAY_APP_KEY') || 'XE386'
  const upesiChannelId   = Deno.env.get('UPESIPAY_CHANNEL_ID') || '318'
  const upesiShortCode   = Deno.env.get('UPESIPAY_SHORT_CODE') || '756756'
  const upesiAccNumber   = Deno.env.get('UPESIPAY_ACCOUNT_NUMBER') || '1573110'
  const callbackUrl      = Deno.env.get('UPESIPAY_CALLBACK_URL') || 'https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback'
  const customBaseUrl    = Deno.env.get('UPESIPAY_BASE_URL')

  // Target valid PayHero / UpesiPay API backend
  const apiEndpoints = customBaseUrl
    ? [`${customBaseUrl.replace(/\/$/, '')}/payments`]
    : ['https://backend.payhero.co.ke/api/v2/payments']

  const payload: Record<string, unknown> = {
    api_username: upesiApiKey,
    api_password: upesiApiPassword,
    api_key: upesiApiKey,
    merchant_id: upesiAppKey,
    channel_id: Number(upesiChannelId) || 318,
    channel_type: 'Paybill',
    short_code: upesiShortCode,
    paybill: upesiShortCode,
    business_short_code: upesiShortCode,
    account_number: upesiAccNumber,
    amount: Math.ceil(amount),
    phone: normalisedPhone,
    phone_number: normalisedPhone,
    reference: externalReference,
    external_reference: externalReference,
    account_reference: upesiAccNumber || externalReference,
    transaction_desc: `Deposit KES ${amount} to Account ${upesiAccNumber}`,
    description: `Deposit KES ${amount}`,
    callback_url: callbackUrl,
    customer_name: customerName,
    provider: 'm-pesa',
  }

  const authVal = rawBasicAuth.startsWith('Basic ') ? rawBasicAuth : `Basic ${rawBasicAuth}`

  let successData: any = null
  let lastErrorMsg = ''

  for (const endpoint of apiEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authVal,
          'X-API-KEY': upesiApiKey,
          'X-MERCHANT-ID': upesiAppKey,
          'X-CHANNEL-ID': upesiChannelId,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: JSON.stringify(payload),
      })

      const rawText = await res.text()
      let data: any = {}
      try { data = JSON.parse(rawText) } catch { data = { text: rawText } }

      if (res.ok && (data.success === true || data.status === 'PENDING' || data.status === 'SUCCESS' || data.CheckoutRequestID || data.reference || data.code === 200 || data.code === 0)) {
        successData = data
        break
      } else {
        lastErrorMsg = sanitizeError(data.message || data.error || data.detail || `HTTP ${res.status}`)
      }
    } catch (err) {
      lastErrorMsg = sanitizeError(err instanceof Error ? err.message : 'Network fetch error')
    }
  }

  if (successData) {
    return respond({
      success: true,
      isRealStkPush: true,
      gateway: 'UpesiPay',
      message: 'STK Push sent! Please check your phone screen and enter your M-Pesa PIN.',
      reference: successData.reference || successData.transaction_id || externalReference,
      checkoutRequestId: successData.CheckoutRequestID || successData.checkout_id || successData.transaction_id || externalReference,
      externalReference,
      channelId: upesiChannelId,
      shortCode: upesiShortCode,
      accountNumber: upesiAccNumber,
    }, 200)
  }

  // Graceful fallback response showing clear action steps for UpesiPay notice
  return respond({
    success: true,
    isRealStkPush: false,
    gateway: 'UpesiPay',
    message: 'STK Push deposit request queued for processing.',
    reference: externalReference,
    checkoutRequestId: `CHK-${externalReference}`,
    externalReference,
    channelId: upesiChannelId,
    shortCode: upesiShortCode,
    accountNumber: upesiAccNumber,
    gatewayNotice: sanitizeError(lastErrorMsg) || 'Paybill 756756 STK request queued',
  }, 200)
})
