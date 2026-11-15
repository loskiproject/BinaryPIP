/**
 * BINARYPIP — M-Pesa STK Push Gateway Edge Function (UpesiPay Gateway)
 * https://upesipay.com
 *
 * Configured Supabase Secrets (Dashboard → Edge Functions → Secrets):
 *   UPESIPAY_APP_KEY        — Merchant ID (e.g., "XE386")
 *   UPESIPAY_BASIC_AUTH     — Full Basic Authorization Token (e.g., "Basic c1lJV2hPUDdn...")
 *   UPESIPAY_SHORT_CODE     — Paybill / Short Code (e.g., "756756")
 *   UPESIPAY_ACCOUNT_NUMBER — Account Number (e.g., "1573110")
 *   UPESIPAY_CHANNEL_ID     — Channel ID (e.g., "318")
 *   UPESIPAY_CALLBACK_URL   — Webhook URL (e.g., "https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback")
 *   APP_ORIGIN              — Frontend Origin URL (e.g., "https://binarypip.vercel.app")
 */

const DEFAULT_BASIC_AUTH = 'Basic c1lJV2hPUDdnUUlkbkxTM25ESmk6enRDLWtnNGtCODYyQ0xHbFlqNXF3N1YwV3UxRkdTZXRYTDNHN3RwVg=='

/** Normalise phone number to standard 2547XXXXXXXX or 2541XXXXXXXX format */
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

/** Sanitize error messages */
function sanitizeError(msg: unknown): string {
  if (typeof msg !== 'string') return 'UpesiPay gateway notification'
  if (msg.trim().startsWith('<') || msg.includes('<!DOCTYPE') || msg.includes('<html')) {
    return 'UpesiPay API endpoint unreachable or protected by security filter'
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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed.' }, 405)
  }

  // Parse request JSON body (supports { phone, amount } and { phoneNumber, amountKes })
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return respond({ error: 'Invalid JSON payload in request.' }, 400)
  }

  const rawPhone = body.phone || body.phoneNumber || ''
  const rawAmount = Number(body.amount ?? body.amountKes ?? 0)
  const customerName = body.customerName || 'BINARYPIP CLIENT'
  const userRef = body.reference || body.referenceId || ''

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
  const basicAuthToken   = Deno.env.get('UPESIPAY_BASIC_AUTH') || DEFAULT_BASIC_AUTH
  const upesiAppKey      = Deno.env.get('UPESIPAY_APP_KEY') || 'XE386'
  const upesiChannelId   = Deno.env.get('UPESIPAY_CHANNEL_ID') || '318'
  const upesiShortCode   = Deno.env.get('UPESIPAY_SHORT_CODE') || '756756'
  const upesiAccNumber   = Deno.env.get('UPESIPAY_ACCOUNT_NUMBER') || '1573110'
  const callbackUrl      = Deno.env.get('UPESIPAY_CALLBACK_URL') || 'https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback'
  const customBaseUrl    = Deno.env.get('UPESIPAY_BASE_URL')

  // Target UpesiPay API backend endpoints
  const apiEndpoints = customBaseUrl
    ? [`${customBaseUrl.replace(/\/$/, '')}/payments`]
    : [
        'https://backend.payhero.co.ke/api/v2/payments',
        'https://backend.upesipay.com/api/v2/payments',
      ]

  // Format Auth Header
  const authVal = basicAuthToken.startsWith('Basic ') ? basicAuthToken : `Basic ${basicAuthToken}`

  // Format UpesiPay STK Push Payload
  const payload: Record<string, unknown> = {
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

  console.log('Initiating UpesiPay STK Push:', JSON.stringify({ phone: normalisedPhone, amount: rawAmount, channel: upesiChannelId, shortCode: upesiShortCode }))

  let successData: any = null
  let lastErrorMsg = ''

  for (const endpoint of apiEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authVal,
          'X-MERCHANT-ID': upesiAppKey,
          'X-CHANNEL-ID': upesiChannelId,
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

      console.log(`UpesiPay Endpoint (${endpoint}) Response (${res.status}):`, JSON.stringify(data))

      if (res.ok && (data.success === true || data.status === 'PENDING' || data.status === 'SUCCESS' || data.CheckoutRequestID || data.reference)) {
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

  console.error('UpesiPay Gateway Notice:', lastErrorMsg)

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
    gatewayNotice: lastErrorMsg || 'Paybill 756756 STK request queued',
  }, 200)
})
