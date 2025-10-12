import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserPremiumStatus } from '@/lib/user-management';
import { claimFounderSlot } from '@/lib/founder-tier';

/**
 * Verify and complete a checkout session
 * This is a fallback for when webhooks don't fire (common in test mode)
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log(`\n🔍 Verifying checkout session: ${sessionId}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log(`   Payment Status: ${session.payment_status}`);
    console.log(`   Session Status: ${session.status}`);

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      );
    }

    // Get userId and isFounder from metadata
    const userId = session.metadata?.userId;
    const isFounder = session.metadata?.isFounder === 'true';

    console.log(`   User ID: ${userId}`);
    console.log(`   Is Founder: ${isFounder}`);

    if (!userId) {
      return NextResponse.json(
        { error: 'No userId found in session metadata' },
        { status: 400 }
      );
    }

    // Update user in Firebase (same logic as webhook)
    console.log(`\n🔥 Updating Firebase user: ${userId}`);
    await updateUserPremiumStatus(userId, {
      isPremium: true,
      isFounder: isFounder,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      subscriptionStatus: 'active',
    });

    console.log(`✅ User ${userId} updated successfully`);

    // Claim founder slot if this is a founder tier purchase
    let founderSlotNumber: number | undefined;
    let founderSlotsRemaining: number | undefined;

    if (isFounder) {
      console.log(`\n🏆 Claiming founder slot for user: ${userId}`);
      try {
        const founderResult = await claimFounderSlot(userId);
        
        if (founderResult.success) {
          console.log(`✅ ${founderResult.message}`);
          founderSlotNumber = founderResult.slotNumber;
          founderSlotsRemaining = founderResult.slotsRemaining;
        } else {
          console.error(`❌ Failed to claim founder slot: ${founderResult.message}`);
        }
      } catch (error) {
        console.error(`❌ Error claiming founder slot:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      isPremium: true,
      isFounder: isFounder,
      founderSlotNumber,
      founderSlotsRemaining,
      message: isFounder 
        ? `🎉 Welcome, Founder #${founderSlotNumber}! You now have unlimited access.`
        : '🎉 Welcome to Premium! You now have unlimited access.'
    });
  } catch (error: unknown) {
    console.error('❌ Error verifying checkout:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to verify checkout', details: errorMessage },
      { status: 500 }
    );
  }
}

