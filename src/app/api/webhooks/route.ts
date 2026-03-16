import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

  const payload = await req.text()
  const sig = req.headers.get('stripe-signature') as string

  let event

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    
    // Retrieve the metadata we passed in during session creation
    const { propertyId, roomId, guestName, guestPhone, influencerId } = session.metadata || {}
    const amount = session.amount_total ? session.amount_total / 100 : 0 // Convert back from paise

    if (propertyId && roomId) {
      // Securely connect to Supabase using Service Role Key to bypass RLS for webhooks
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await supabaseAdmin.from('bookings').insert([{
        property_id: propertyId,
        room_id: roomId,
        influencer_id: influencerId || null,
        guest_name: guestName,
        guest_phone: guestPhone,
        amount
      }])

      if (error) {
        console.error('Failed to insert booking after successful payment:', error)
        // Note: Stripe will retry the webhook if we return 500
        return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
      }
      
      console.log(`Booking for Room ${roomId} inserted successfully.`)
    }
  }

  return NextResponse.json({ received: true })
}
