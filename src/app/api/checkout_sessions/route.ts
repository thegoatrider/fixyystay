import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Initialize Stripe directly inside the handler
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  try {
    const body = await req.json()
    const { propertyId, propertyName, roomId, roomName, guestName, guestPhone, influencerId, amount } = body

    if (!propertyId || !roomId || !amount) {
      return NextResponse.json({ error: 'Missing required booking details.' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Stay at ${propertyName}`,
              description: roomName,
            },
            unit_amount: amount * 100, // Stripe expects amounts in smallest currency unit (paise)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/guest/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/guest/property/${propertyId}`,
      metadata: {
        propertyId,
        roomId,
        guestName,
        guestPhone,
        influencerId: influencerId || '',
      },
      customer_email: undefined, // Optionally collect this if you add an email field to the guest form
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe session creation failed:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
