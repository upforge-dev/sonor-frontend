#!/usr/bin/env node
/**
 * Fix Invoice Payment Tokens
 * 
 * This script finds invoices without payment tokens and generates new ones.
 * Run with: node scripts/fix-invoice-tokens.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generatePaymentToken() {
  return randomBytes(32).toString('hex')
}

async function fixInvoiceTokens() {
  console.log('🔍 Finding invoices without payment tokens...\n')

  // Find all unpaid invoices without payment tokens or with expired tokens
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, payment_token, payment_token_expires, contact:contacts!invoices_contact_id_fkey(name, email)')
    .neq('status', 'paid')
    .neq('status', 'cancelled')

  if (error) {
    console.error('❌ Error fetching invoices:', error)
    process.exit(1)
  }

  const now = new Date()
  const needsFix = invoices.filter(inv => {
    // No token at all
    if (!inv.payment_token) return true
    // Token is expired
    if (inv.payment_token_expires && new Date(inv.payment_token_expires) < now) return true
    return false
  })

  if (needsFix.length === 0) {
    console.log('✅ All invoices have valid payment tokens!')
    return
  }

  console.log(`Found ${needsFix.length} invoices needing payment token fixes:\n`)

  for (const invoice of needsFix) {
    const reason = !invoice.payment_token ? 'missing token' : 'expired token'
    console.log(`  • ${invoice.invoice_number} (${reason}) - ${invoice.contact?.email || 'no email'}`)
  }

  console.log('\n🔧 Generating new payment tokens...\n')

  let fixed = 0
  for (const invoice of needsFix) {
    const paymentToken = generatePaymentToken()
    const tokenExpires = new Date()
    tokenExpires.setDate(tokenExpires.getDate() + 30) // 30 days

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        payment_token: paymentToken,
        payment_token_expires: tokenExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id)

    if (updateError) {
      console.error(`  ❌ Failed to fix ${invoice.invoice_number}:`, updateError.message)
    } else {
      fixed++
      const paymentUrl = `https://app.sonor.io/pay/${paymentToken}`
      console.log(`  ✅ ${invoice.invoice_number}`)
      console.log(`     New payment link: ${paymentUrl}`)
      console.log(`     Expires: ${tokenExpires.toLocaleDateString()}\n`)
    }
  }

  console.log(`\n✅ Fixed ${fixed}/${needsFix.length} invoices`)
  console.log('\n💡 Tip: Resend the invoice from the Billing page to email the new payment link to the client.')
}

fixInvoiceTokens().catch(console.error)
