/**
 * NEXSMARKETS — M-Pesa Callback Webhook Edge Function
 * Receives payment status updates from UpesiPay / PayHero / M-Pesa.
 *
 * Configured in UpesiPay/PayHero dashboard or secrets:
 *   UPESIPAY_CALLBACK_URL = https://<your-project-ref>.supabase.co/functions/v1/mpesa-callback
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, authorization',
      },
    })
  }

  try {
    const payload = await req.json().catch(() => ({}))
    console.log('Received M-Pesa Callback:', JSON.stringify(payload))

    // Initialize Supabase Admin client using Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase credentials missing in Edge environment.')
      return new Response(JSON.stringify({ status: 'ignored', reason: 'Missing backend keys' }), { status: 200 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Extract transaction references and payment status
    let isSuccess = false
    let externalRef = ''
    let mpesaReceipt = ''
    let amountPaid = 0

    // 1. UpesiPay / Generic Gateway Structure
    if (payload.status || payload.result_code !== undefined || payload.ResultCode !== undefined) {
      const statusStr = String(payload.status || payload.ResultDesc || '').toUpperCase()
      const resultCode = Number(payload.result_code ?? payload.ResultCode ?? -1)

      if (statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || resultCode === 0) {
        isSuccess = true
      }

      externalRef = payload.reference || payload.external_reference || payload.account_reference || payload.CheckoutRequestID || ''
      mpesaReceipt = payload.mpesa_reference || payload.receipt_number || payload.MpesaReceiptNumber || ''
      amountPaid = Number(payload.amount || 0)
    }
    // 2. Daraja / Safaricom Callback Structure
    else if (payload.Body?.stkCallback) {
      const stk = payload.Body.stkCallback
      if (stk.ResultCode === 0) {
        isSuccess = true
      }
      externalRef = stk.CheckoutRequestID || stk.MerchantRequestID || ''

      const items = stk.CallbackMetadata?.Item || []
      for (const item of items) {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = String(item.Value)
        if (item.Name === 'Amount') amountPaid = Number(item.Value)
      }
    }

    if (externalRef) {
      // 1. Search primary 'transactions' table
      const { data: tx } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .or(`reference_id.eq.${externalRef},details->>external_reference.eq.${externalRef}`)
        .in('status', ['pending', 'PENDING'])
        .maybeSingle()

      if (tx && isSuccess) {
        // Mark transaction approved
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'approved',
            reference_id: mpesaReceipt || externalRef,
            details: {
              ...tx.details,
              mpesa_receipt: mpesaReceipt,
              completed_at: new Date().toISOString(),
              gateway_status: 'SUCCESS',
            },
          })
          .eq('id', tx.id)

        // Credit user's wallet live_balance
        const creditAmountUSD = tx.amount || (amountPaid > 0 ? amountPaid / 130 : 0)

        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('live_balance')
          .eq('user_id', tx.user_id)
          .maybeSingle()

        if (wallet) {
          const currentBal = Number(wallet.live_balance || 0)
          await supabaseAdmin
            .from('wallets')
            .update({
              live_balance: currentBal + creditAmountUSD,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', tx.user_id)
        }
      } else if (tx && !isSuccess) {
        // Mark transaction failed
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'rejected',
            details: {
              ...tx.details,
              failure_reason: payload.message || payload.ResultDesc || 'Payment failed or cancelled',
              completed_at: new Date().toISOString(),
            },
          })
          .eq('id', tx.id)
      }

      // 2. Also search fallback 'mpesa_transactions' table if exists
      try {
        const { data: mpesaTx } = await supabaseAdmin
          .from('mpesa_transactions')
          .select('*')
          .or(`reference.eq.${externalRef},gateway_reference.eq.${externalRef}`)
          .in('status', ['PENDING', 'pending'])
          .maybeSingle()

        if (mpesaTx) {
          if (isSuccess) {
            await supabaseAdmin
              .from('mpesa_transactions')
              .update({
                status: 'COMPLETED',
                mpesa_receipt: mpesaReceipt || 'CONFIRMED',
                updated_at: new Date().toISOString(),
              })
              .eq('id', mpesaTx.id)
          } else {
            await supabaseAdmin
              .from('mpesa_transactions')
              .update({
                status: 'FAILED',
                failure_reason: payload.message || 'Payment failed or cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('id', mpesaTx.id)
          }
        }
      } catch {
        // silent
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Callback error:', err)
    return new Response(JSON.stringify({ status: 'error', message: String(err) }), { status: 500 })
  }
})
