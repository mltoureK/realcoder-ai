import { NextRequest, NextResponse } from 'next/server';
import { stripe, FOUNDER_PRICE, REGULAR_PRICE, FOUNDER_TIER_NAME, FOUNDER_TIER_DESCRIPTION } from '@/lib/stripe';
import { getFounderTierStatus } from '@/lib/founder-tier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // First, create or retrieve a customer with metadata
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      // Update existing customer metadata
      const customer = await stripe.customers.update(customers.data[0].id, {
        metadata: {
          userId,
          isFounder: isFounder.toString(),
        },
      });
      customerId = customer.id;
    } else {
      // Create new customer with metadata
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId,
          isFounder: isFounder.toString(),
        },
      });
      customerId = customer.id;
    }

    // Determine pricing based on founder availability
    const founderStatus = await getFounderTierStatus();
    const effectiveIsFounder = founderStatus.available;
    const unitAmount = effectiveIsFounder ? FOUNDER_PRICE : REGULAR_PRICE;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: FOUNDER_TIER_NAME,
              description: FOUNDER_TIER_DESCRIPTION,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      // Store user info in metadata for webhook processing
      metadata: {
        userId,
        isFounder: effectiveIsFounder.toString(),
        tier: effectiveIsFounder ? 'founder' : 'regular',
      },
      subscription_data: {
        metadata: {
          userId,
          isFounder: effectiveIsFounder.toString(),
          tier: effectiveIsFounder ? 'founder' : 'regular',
        },
      },
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}


