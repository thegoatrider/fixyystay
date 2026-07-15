import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  try {
    const body = await req.json()
    const { userId, ownerName, email, amount } = body

    if (!userId || !ownerName || !email) {
      return NextResponse.json({ error: 'Missing required details.' }, { status: 400 })
    }

    const checkoutAmount = amount || 4999 // Default to ₹4999 if not provided
    const origin = req.headers.get('origin') || 'https://www.fixystays.com'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `FixyStays Owner Onboarding`,
              description: `Lifetime access for ${ownerName}`,
            },
            unit_amount: checkoutAmount * 100, // in paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/onboarding`,
      metadata: {
        userId,
        type: 'owner_onboarding',
      },
      customer_email: email,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe session creation failed:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
