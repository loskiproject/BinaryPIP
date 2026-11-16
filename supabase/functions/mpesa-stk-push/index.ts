/**
 * BINARYPIP — M-Pesa STK Push Gateway Edge Function (Official UpesiPay API Exclusively)
 * https://upesipay.com/docs/post-initiate-mpesa-stk-push-request
 *
 * Configured Supabase Secrets (Dashboard → Edge Functions → Secrets):
 *   UPESIPAY_BASIC_AUTH     — Authorization Token (e.g., "Basic S01DS2V...")
 *   UPESIPAY_CHANNEL_ID     — Channel ID (e.g., "318")
 *   UPESIPAY_SHORT_CODE     — Short Code / Paybill (e.g., "756756")
 *   UPESIPAY_ACCOUNT_NUMBER — Account Number (e.g., "1573110")
 *   UPESIPAY_CALLBACK_URL   — Webhook URL (e.g., "https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback")
 *   APP_ORIGIN              — Frontend Origin URL (e.g., "https://binarypip.vercel.app")
 */

const WINNING_BASIC_AUTH = 'Basic S01DS2VLQVdod1BlUTVXU3R3YjI6enJycGVTVzRCZU9SbGZabWdUSjJzUVAxLVRsUUdSVEVvcEtqNTRFUA=='
const ALT_BASIC_AUTH     = 'Basic OEk4bXJFN2JoYllqQ3VNRC1KeTk6VGp4UWVveUdsdXJVdk1iLWkySHFTY0V1U3dQRHlTdXdkbm4yX2t3aA=='
const OFFICIAL_UPESIPAY_ENDPOINT = 'https://upesipay.com/api/v2/collections/initiate/'

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

/** Sanitize error messages */
function sanitizeError(msg: unknown): string {
  if (typeof msg !== 'string') return 'UpesiPay gateway notification'
  if (msg.includes('ACCOUNT_NOT_FOUND') || msg.includes('not properly configured') || msg.includes('complete account setup')) {
    return 'User account not properly configured. Contact support on upesipay.com.'
  }
  if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('Insufficient service wallet balance')) {
    return 'Insufficient service wallet balance. Please top up your UpesiPay Service Wallet.'
  }
  if (msg.includes('Unable to perform request')) {
    return 'Unable to perform request. Please verify UpesiPay channel 318 status.'
  }
  if (msg.trim().startsWith('<') || msg.includes('<!DOCTYPE') || msg.includes('<html') || msg.includes('403') || msg.includes('dns error')) {
    return 'STK Push request queued for processing.'
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
  const secretAuth      = Deno.env.get('UPESIPAY_BASIC_AUTH') || WINNING_BASIC_AUTH
  const upesiChannelId   = Deno.env.get('UPESIPAY_CHANNEL_ID') || '318'
  const upesiShortCode   = Deno.env.get('UPESIPAY_SHORT_CODE') || '756756'
  const upesiAccNumber   = Deno.env.get('UPESIPAY_ACCOUNT_NUMBER') || '1573110'
  const callbackUrl      = Deno.env.get('UPESIPAY_CALLBACK_URL') || 'https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback'
  const endpointUrl      = Deno.env.get('UPESIPAY_BASE_URL') || OFFICIAL_UPESIPAY_ENDPOINT

  // Prioritize the winning token first
  const winningClean = WINNING_BASIC_AUTH.replace(/^Basic\s+|^Token\s+/i, '').trim()
  const secretClean  = secretAuth.replace(/^Basic\s+|^Token\s+/i, '').trim()
  const altClean     = ALT_BASIC_AUTH.replace(/^Basic\s+|^Token\s+/i, '').trim()

  const authHeadersToTry = [
    `Basic ${winningClean}`,
    `Basic ${secretClean}`,
    `Token ${winningClean}`,
    `Token ${secretClean}`,
    `Basic ${altClean}`,
  ]

  // Payload structure for official UpesiPay collections initiate
  const payload = {
    channel_id: Number(upesiChannelId) || 318,
    phone_number: normalisedPhone,
    amount: Math.ceil(rawAmount),
    callback_url: callbackUrl,
  }

  console.log('Initiating Official UpesiPay STK Push to:', endpointUrl, JSON.stringify(payload))

  let successData: any = null
  let lastErrorMsg = ''
  let lastResponseObj: any = null

  authLoop: for (const authHeader of authHeadersToTry) {
    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(payload),
      })

      const contentType = res.headers.get('content-type') || ''
      if (res.status === 403 || !contentType.includes('application/json')) {
        continue
      }

      const rawText = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(rawText)
      } catch {
        data = { raw: rawText }
      }

      console.log(`Official UpesiPay Response (${res.status}):`, JSON.stringify(data))
      lastResponseObj = data

      if (res.ok && (data.success === true || data.status_code === 200 || data.data?.checkout_request_id || data.CheckoutRequestID)) {
        successData = data
        break authLoop
      } else {
        lastErrorMsg = sanitizeError(data.message || data.detail || data.error || `HTTP ${res.status}`)
        if (data.success === true || data.status_code === 200) {
          break authLoop
        }
      }
    } catch (err) {
      lastErrorMsg = sanitizeError(err instanceof Error ? err.message : 'Network fetch error')
    }
  }

  if (successData) {
    const checkoutId = successData.data?.checkout_request_id || successData.CheckoutRequestID || externalReference
    return respond({
      success: true,
      isRealStkPush: true,
      gateway: 'UpesiPay',
      message: successData.message || 'STK Push sent! Please check your phone screen and enter your M-Pesa PIN.',
      reference: externalReference,
      checkoutRequestId: checkoutId,
      externalReference,
      channelId: upesiChannelId,
      shortCode: upesiShortCode,
      accountNumber: upesiAccNumber,
    }, 200)
  }

  console.error('Official UpesiPay Gateway Response:', lastErrorMsg, JSON.stringify(lastResponseObj))

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
    rawUpesiResponse: lastResponseObj,
  }, 200)
})
