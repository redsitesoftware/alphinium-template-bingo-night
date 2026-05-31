/**
 * Stripe Service
 * Handles Stripe payments and subscriptions in React Native
 */

import { STRAPI_URL } from '../config';

const STRIPE_PRICES = {
  developer_monthly: 'price_developer_monthly',
  developer_annual: 'price_developer_annual',
  team_monthly: 'price_team_monthly',
  team_annual: 'price_team_annual',
};

export const StripeService = {
  /**
   * Create checkout session
   */
  async createCheckoutSession(priceId, userId, token) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      return data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },

  /**
   * Get user's subscription
   */
  async getSubscription(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/payment/subscription/${userId}`, {
        headers
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No subscription
        }
        throw new Error(data.error || 'Failed to get subscription');
      }

      return data.subscription;
    } catch (error) {
      console.error('Get subscription error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, immediately = false, token) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/payment/cancel-subscription`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          immediately,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      return data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(userId, token) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/payment/reactivate-subscription`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      return data;
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      throw error;
    }
  },

  /**
   * Create customer portal session
   */
  async createPortalSession(userId, token) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/payment/create-portal-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      return data;
    } catch (error) {
      console.error('Create portal session error:', error);
      throw error;
    }
  },

  /**
   * Get price IDs
   */
  getPrices() {
    return STRIPE_PRICES;
  },
};

export default StripeService;
