/**
 * BINARYPIP — M-Pesa Callback Webhook Edge Function (UpesiPay API)
 * Receives real-time payment status webhooks from UpesiPay.
 *
 * Callback URL:
 *   https://xggjgegiuqhyqapcfdto.supabase.co/functions/v1/mpesa-callback
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
    console.log('Received UpesiPay Callback Payload:', JSON.stringify(payload))

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase Service Role Key missing in Edge environment.')
      return new Response(JSON.stringify({ status: 'ignored', reason: 'Missing backend keys' }), { status: 200 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Extract UpesiPay Webhook JSON payload structures
    let isSuccess = false
    let externalRef = ''
    let mpesaReceipt = ''
    let amountPaid = 0

    const responseObj = payload.response || payload.Response || payload

    const statusStr = String(payload.status || responseObj.Status || responseObj.ResultDesc || '').toUpperCase()
    const resultCode = Number(payload.result_code ?? responseObj.ResultCode ?? payload.ResultCode ?? -1)

    if (statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || resultCode === 0) {
      isSuccess = true
    }

    externalRef = payload.reference || payload.external_reference || responseObj.ExternalReference || responseObj.CheckoutRequestID || payload.CheckoutRequestID || ''
    mpesaReceipt = payload.mpesa_reference || payload.receipt_number || responseObj.MpesaReceiptNumber || responseObj.MpesaReference || ''
    amountPaid = Number(payload.amount ?? responseObj.Amount ?? 0)

    console.log('Parsed UpesiPay Callback:', JSON.stringify({ isSuccess, externalRef, mpesaReceipt, amountPaid }))

    if (externalRef) {
      // 1. Primary Table: 'public.transactions'
      const { data: tx } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .or(`reference_id.eq.${externalRef},details->>external_reference.eq.${externalRef}`)
        .in('status', ['pending', 'PENDING'])
        .maybeSingle()

      if (tx && isSuccess) {
        // Update transaction status to approved
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

        // Credit user wallet live_balance
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
        // Update transaction status to rejected
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'rejected',
            details: {
              ...tx.details,
              failure_reason: payload.message || responseObj.ResultDesc || 'Payment failed or cancelled',
              completed_at: new Date().toISOString(),
            },
          })
          .eq('id', tx.id)
      }

      // 2. Secondary Table: 'public.mpesa_transactions' (if used)
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
    console.error('UpesiPay Callback error:', err)
    return new Response(JSON.stringify({ status: 'error', message: String(err) }), { status: 500 })
  }
})
