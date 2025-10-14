import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance (non-fatal if missing during build)
const stripeSecret = process.env.STRIPE_SECRET_KEY;
export const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  // Cast to Stripe to avoid import-time crashes while allowing deploys without env
  : (null as unknown as Stripe);

// Client-side Stripe promise
let stripePromise: Promise<Stripe | null> | null = null;
export const getStripe = () => {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    // Return null promise if missing to avoid build-time failures
    stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return stripePromise;
};

// Pricing constants (in cents)
export const FOUNDER_PRICE = 500; // $5.00 per month
export const REGULAR_PRICE = 1000; // $10.00 per month (future pricing)

// Product metadata
export const FOUNDER_TIER_NAME = 'Founder Tier';
export const FOUNDER_TIER_DESCRIPTION = 'Unlimited quizzes + lifetime access at founder pricing';


