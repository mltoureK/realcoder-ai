'use client';

import { useState, useEffect } from 'react';
import { getFounderTierStatus } from '@/lib/founder-tier';

interface FounderTierStatus {
  available: boolean;
  slotsRemaining: number;
  totalSlots: number;
  claimedSlots: number;
  isActive: boolean;
}

export default function FounderCounter() {
  const [status, setStatus] = useState<FounderTierStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch founder tier status
  const fetchStatus = async () => {
    try {
      setError(null);
      const founderStatus = await getFounderTierStatus();
      console.log('🔍 FounderCounter Debug - Status fetched:', founderStatus);
      setStatus(founderStatus);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching founder tier status:', err);
      setError('Failed to load founder tier status');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Don't render if loading or error
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 shadow-lg">
          <div className="animate-pulse">
            <div className="h-6 bg-white/20 rounded mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.warn('FounderCounter error:', error);
    return null; // Don't show error to users, just log it
  }

  if (!status) {
    return null;
  }

  // Hide component when inactive or sold out
  if (!status.isActive || !status.available || status.slotsRemaining <= 0) {
    return null;
  }

  // Calculate progress percentage
  const progressPercentage = (status.claimedSlots / status.totalSlots) * 100;
  
  // Determine urgency styling based on remaining slots
  const getUrgencyLevel = () => {
    if (status.slotsRemaining <= 5) return 'critical';
    if (status.slotsRemaining <= 15) return 'high';
    if (status.slotsRemaining <= 30) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();

  // Dynamic messaging based on urgency
  const getUrgencyMessage = () => {
    switch (urgencyLevel) {
      case 'critical':
        return `🔥 ONLY ${status.slotsRemaining} SPOTS LEFT! 🔥`;
      case 'high':
        return `⚡ Only ${status.slotsRemaining} spots left!`;
      case 'medium':
        return `⚡ ${status.slotsRemaining} founder spots remaining!`;
      default:
        return `${status.slotsRemaining} founder spots available`;
    }
  };

  // Dynamic gradient based on urgency
  const getGradientClass = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'from-red-500 to-red-700 animate-pulse';
      case 'high':
        return 'from-amber-500 to-orange-600';
      case 'medium':
        return 'from-yellow-500 to-amber-500';
      default:
        return 'from-emerald-500 to-teal-600';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className={`bg-gradient-to-r ${getGradientClass()} rounded-2xl p-6 shadow-xl border border-white/20`}>
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            🏆 Founder Tier
          </h2>
          <p className="text-white/90 text-lg font-medium">
            {getUrgencyMessage()}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-white/80 mb-2">
            <span className="font-medium">
              {status.claimedSlots} of {status.totalSlots} claimed
            </span>
            <span className="font-medium">
              {progressPercentage.toFixed(1)}% full
            </span>
          </div>
          
          {/* Progress bar container */}
          <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
            {/* Progress bar fill */}
            <div 
              className="h-full bg-gradient-to-r from-white/90 to-white transition-all duration-1000 ease-out rounded-full relative"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Shimmer effect for high progress */}
              {progressPercentage > 70 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center space-x-6 text-center">
          <div className="text-white/80">
            <div className="text-2xl font-bold text-white">
              {status.claimedSlots}
            </div>
            <div className="text-sm">Claimed</div>
          </div>
          <div className="text-white/80">
            <div className="text-2xl font-bold text-white">
              {status.slotsRemaining}
            </div>
            <div className="text-sm">Remaining</div>
          </div>
          <div className="text-white/80">
            <div className="text-2xl font-bold text-white">
              {status.totalSlots}
            </div>
            <div className="text-sm">Total</div>
          </div>
        </div>

        {/* Last updated indicator */}
        {lastUpdated && (
          <div className="text-center mt-4">
            <div className="text-xs text-white/60">
              Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refreshes every 30s
            </div>
          </div>
        )}

        {/* Call to action hint */}
        {urgencyLevel === 'critical' && (
          <div className="text-center mt-4">
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-white font-medium text-sm">
                🚨 Don't miss out! Limited time offer
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
