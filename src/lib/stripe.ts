import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Client-side Stripe promise
let stripePromise: Promise<Stripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined');
    }
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Pricing constants (in cents)
export const FOUNDER_PRICE = 500; // $5.00 per month
export const REGULAR_PRICE = 1000; // $10.00 per month (future pricing)

// Product metadata
export const FOUNDER_TIER_NAME = 'Founder Tier';
export const FOUNDER_TIER_DESCRIPTION = 'Unlimited quizzes + lifetime access at founder pricing';


