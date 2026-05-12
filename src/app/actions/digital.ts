'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createRazorpayOrder, verifyPaymentSignature, RazorpayApiError } from '@/lib/razorpay'

// ---------------------------------------------------------------------------
// initiateDigitalPurchase
// Creates a Razorpay order + a pending digital_purchases row.
// Returns the data the client needs to open Razorpay checkout.
// ---------------------------------------------------------------------------

export async function initiateDigitalPurchase(params: {
  blockId:     string
  buyerName?:  string
  buyerEmail?: string
}): Promise<
  | { purchaseId: string; razorpayOrderId: string; amount: number; title: string; coverImageUrl: string | null }
  | { error: string }
> {
  const { blockId, buyerName, buyerEmail } = params

  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch the block to get the product config + creator_id
  const { data: block, error: blockErr } = await admin
    .from('page_blocks')
    .select('config, profile_id')
    .eq('id', blockId)
    .maybeSingle()

  if (blockErr || !block) return { error: 'Product not found' }

  const cfg = block.config as unknown as {
    title?: string; description?: string; price_paise?: number; file_url?: string; cover_image_url?: string
  }

  if (!cfg.file_url || !cfg.price_paise || cfg.price_paise <= 0) {
    return { error: 'This product is not available for purchase yet' }
  }

  const amountPaise = cfg.price_paise
  const title       = cfg.title ?? 'Digital Product'
  const fileUrl     = cfg.file_url

  // 2. Create the Razorpay order
  let razorpayOrderId: string
  try {
    const receipt = ['dp', blockId.slice(-6), Date.now().toString(36).slice(-6)].join('_').slice(0, 40)
    const order = await createRazorpayOrder({
      amount:   amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        block_id:   blockId,
        product:    title.slice(0, 50),
        ...(user?.id ? { buyer_user_id: user.id } : {}),
      },
    })
    razorpayOrderId = order.id
  } catch (err) {
    const msg = err instanceof RazorpayApiError ? err.message : 'Payment service unavailable'
    return { error: msg }
  }

  // 3. Insert a pending digital_purchases row
  const { data: purchase, error: insertErr } = await admin
    .from('digital_purchases')
    .insert({
      block_id:          blockId,
      creator_id:        block.profile_id,
      buyer_user_id:     user?.id ?? null,
      buyer_name:        buyerName ?? null,
      buyer_email:       buyerEmail ?? null,
      razorpay_order_id: razorpayOrderId,
      status:            'pending',
      amount_paise:      amountPaise,
      file_url:          fileUrl,
    })
    .select('id')
    .single()

  if (insertErr || !purchase) {
    return { error: 'Failed to initiate purchase. Please try again.' }
  }

  return {
    purchaseId:      purchase.id,
    razorpayOrderId,
    amount:          amountPaise,
    title,
    coverImageUrl:   cfg.cover_image_url ?? null,
  }
}

// ---------------------------------------------------------------------------
// confirmDigitalPurchase
// Verifies the Razorpay signature and marks the purchase as paid.
// Returns the file_url so the client can redirect the buyer.
// ---------------------------------------------------------------------------

export async function confirmDigitalPurchase(params: {
  purchaseId:        string
  razorpayOrderId:   string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<{ fileUrl: string } | { error: string }> {
  const { purchaseId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params

  const admin = createAdminClient()

  // 1. Verify the HMAC signature
  const isValid = verifyPaymentSignature({
    order_id:   razorpayOrderId,
    payment_id: razorpayPaymentId,
    signature:  razorpaySignature,
  })

  if (!isValid) {
    return { error: 'Payment verification failed. Please contact support.' }
  }

  // 2. Fetch the pending purchase row
  const { data: purchase, error: fetchErr } = await admin
    .from('digital_purchases')
    .select('id, status, file_url, razorpay_order_id')
    .eq('id', purchaseId)
    .maybeSingle()

  if (fetchErr || !purchase) return { error: 'Purchase record not found' }
  if (purchase.status === 'paid')   return { fileUrl: purchase.file_url }
  if (purchase.razorpay_order_id !== razorpayOrderId) return { error: 'Order ID mismatch' }

  // 3. Mark as paid
  const { error: updateErr } = await admin
    .from('digital_purchases')
    .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId })
    .eq('id', purchaseId)

  if (updateErr) {
    return { error: 'Failed to record purchase. Please contact support with your payment ID.' }
  }

  return { fileUrl: purchase.file_url }
}

// ---------------------------------------------------------------------------
// joinWaitlist
// Inserts an email into the waitlist_entries table for a given block.
// Silently ignores duplicate (block_id, email) pairs.
// ---------------------------------------------------------------------------

export async function joinWaitlist(params: {
  blockId: string
  email:   string
  name?:   string
}): Promise<{ success: true; alreadyJoined?: boolean } | { error: string }> {
  const { blockId, email, name } = params

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  const admin = createAdminClient()

  // Fetch creator_id + optional event_id from the block config
  const { data: block, error: blockErr } = await admin
    .from('page_blocks')
    .select('profile_id, config')
    .eq('id', blockId)
    .maybeSingle()

  if (blockErr || !block) return { error: 'Block not found' }

  const cfg = block.config as unknown as { event_id?: string }

  const { error: insertErr } = await admin
    .from('waitlist_entries')
    .insert({
      block_id:   blockId,
      creator_id: block.profile_id,
      event_id:   cfg.event_id ?? null,
      email:      email.trim().toLowerCase(),
      name:       name?.trim() ?? null,
    })

  // Unique constraint violation = already joined
  if (insertErr) {
    if (insertErr.code === '23505') return { success: true, alreadyJoined: true }
    return { error: 'Failed to join waitlist. Please try again.' }
  }

  revalidatePath('/dashboard/bookings')
  return { success: true }
}

// ---------------------------------------------------------------------------
// getWaitlistCount
// Returns the number of entries for a specific block (for the public counter).
// ---------------------------------------------------------------------------

export async function getWaitlistCount(blockId: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('waitlist_entries')
    .select('id', { count: 'exact', head: true })
    .eq('block_id', blockId)

  return count ?? 0
}
