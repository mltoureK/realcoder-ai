import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/user-management';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user data to find their Stripe subscription
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Cancel the subscription in Stripe (no-op if stripe is not configured)
    if (!stripe || !('subscriptions' in stripe)) {
      return NextResponse.json({ success: true, message: 'Stripe not configured; skipping subscription cancellation' });
    }

    const subscriptionResponse = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
        metadata: {
          cancelled_by_user: 'true',
          cancelled_at: new Date().toISOString()
        }
      }
    );

    // Type assertion to access subscription properties
    const subscription = subscriptionResponse as any;

    console.log('✅ Subscription cancelled by user:', {
      userId,
      subscriptionId: user.stripeSubscriptionId,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : 'N/A'
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      }
    });

  } catch (error: unknown) {
    console.error('Error cancelling subscription:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: errorMessage },
      { status: 500 }
    );
  }
}
