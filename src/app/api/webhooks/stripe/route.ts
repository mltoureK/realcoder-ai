import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ No webhook secret configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('✅ Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout session completed:', session.id);
        
        // Handle successful payment
        if (session.metadata?.userId) {
          console.log(`🎉 User ${session.metadata.userId} successfully subscribed to ${session.metadata.tier}`);
          
          // TODO: Update user subscription status in your database
          // You can use Firebase to update the user's subscription status
          // Example:
          // await updateUserSubscription(session.metadata.userId, {
          //   tier: session.metadata.tier,
          //   isActive: true,
          //   stripeCustomerId: session.customer,
          //   stripeSubscriptionId: session.subscription
          // });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📝 Subscription created:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id);
        
        // Handle subscription changes (upgrade, downgrade, cancellation)
        if (subscription.metadata?.userId) {
          const isActive = subscription.status === 'active';
          console.log(`📊 User ${subscription.metadata.userId} subscription status: ${subscription.status}`);
          
          // TODO: Update user subscription status in your database
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription cancelled:', subscription.id);
        
        // Handle subscription cancellation
        if (subscription.metadata?.userId) {
          console.log(`🚫 User ${subscription.metadata.userId} subscription cancelled`);
          
          // TODO: Update user subscription status in your database
          // await updateUserSubscription(subscription.metadata.userId, {
          //   tier: 'free',
          //   isActive: false,
          //   stripeCustomerId: subscription.customer,
          //   stripeSubscriptionId: null
          // });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Payment succeeded for invoice:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💸 Payment failed for invoice:', invoice.id);
        
        // TODO: Handle failed payments
        // You might want to notify the user or temporarily suspend their access
        break;
      }

      default:
        console.log(`🤷‍♂️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Webhook handler failed', details: errorMessage },
      { status: 500 }
    );
  }
}
