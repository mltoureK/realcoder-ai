import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Disable body parsing for webhooks (we need raw body)
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not defined');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    console.log(`\n🔔 Webhook Event Received: ${event.type}`);
    console.log(`   Event ID: ${event.id}`);
    console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('\n💳 Checkout Session Completed');
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Customer: ${session.customer}`);
        console.log(`   Subscription: ${session.subscription}`);
        console.log(`   Amount Total: $${(session.amount_total || 0) / 100}`);
        
        // Get userId and isFounder from metadata
        const userId = session.metadata?.userId;
        const isFounder = session.metadata?.isFounder === 'true';
        
        console.log(`   User ID: ${userId}`);
        console.log(`   Is Founder: ${isFounder}`);
        
        if (!userId) {
          console.error('❌ No userId found in session metadata');
          console.error('   Available metadata:', session.metadata);
          return NextResponse.json(
            { error: 'No userId in metadata' },
            { status: 400 }
          );
        }

        // Update user in Firebase
        console.log(`\n🔥 Updating Firebase user: ${userId}`);
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          isPremium: true,
          isFounder: isFounder,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionStatus: 'active',
          updatedAt: new Date().toISOString(),
        });

        console.log(`✅ User ${userId} updated successfully`);
        console.log(`   isPremium: true`);
        console.log(`   isFounder: ${isFounder}`);
        console.log(`   subscriptionStatus: active`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('\n🚫 Subscription Deleted');
        console.log(`   Subscription ID: ${subscription.id}`);
        console.log(`   Customer: ${subscription.customer}`);
        console.log(`   Status: ${subscription.status}`);
        
        // Find user by subscription ID
        // Note: You may want to add a query here to find the user by stripeSubscriptionId
        // For now, we'll assume the subscription has customer metadata with userId
        const customerId = subscription.customer as string;
        
        // Retrieve customer to get metadata
        console.log(`\n🔍 Retrieving customer: ${customerId}`);
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          console.error('❌ Customer was deleted');
          return NextResponse.json({ error: 'Customer deleted' }, { status: 400 });
        }
        
        const userId = customer.metadata?.userId;
        console.log(`   User ID: ${userId}`);
        
        if (!userId) {
          console.error('❌ No userId found in customer metadata');
          console.error('   Available metadata:', customer.metadata);
          return NextResponse.json(
            { error: 'No userId in customer metadata' },
            { status: 400 }
          );
        }

        // Update user to remove premium status
        console.log(`\n🔥 Updating Firebase user: ${userId}`);
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          isPremium: false,
          subscriptionStatus: 'canceled',
          updatedAt: new Date().toISOString(),
        });

        console.log(`✅ User ${userId} updated successfully`);
        console.log(`   isPremium: false`);
        console.log(`   subscriptionStatus: canceled`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log('\n🔄 Subscription Updated');
        console.log(`   Subscription ID: ${subscription.id}`);
        console.log(`   Customer: ${subscription.customer}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Current Period End: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        
        const customerId = subscription.customer as string;
        console.log(`\n🔍 Retrieving customer: ${customerId}`);
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.deleted) {
          console.error('❌ Customer was deleted');
          return NextResponse.json({ error: 'Customer deleted' }, { status: 400 });
        }
        
        const userId = customer.metadata?.userId;
        console.log(`   User ID: ${userId}`);
        
        if (!userId) {
          console.error('❌ No userId found in customer metadata');
          console.error('   Available metadata:', customer.metadata);
          return NextResponse.json(
            { error: 'No userId in customer metadata' },
            { status: 400 }
          );
        }

        // Update subscription status
        const isPremium = ['active', 'trialing'].includes(subscription.status);
        
        console.log(`\n🔥 Updating Firebase user: ${userId}`);
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          isPremium: isPremium,
          subscriptionStatus: subscription.status,
          updatedAt: new Date().toISOString(),
        });

        console.log(`✅ User ${userId} updated successfully`);
        console.log(`   isPremium: ${isPremium}`);
        console.log(`   subscriptionStatus: ${subscription.status}`);
        break;
      }

      default:
        console.log(`\n⏭️  Unhandled event type: ${event.type}`);
    }

    console.log(`\n✅ Webhook processed successfully`);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('\n❌ Error processing webhook:', err);
    console.error('   Error details:', err instanceof Error ? err.message : 'Unknown error');
    console.error('   Stack trace:', err instanceof Error ? err.stack : 'N/A');
    return NextResponse.json(
      { error: `Webhook handler failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

