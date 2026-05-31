/**
 * App Configuration
 * Expo requires EXPO_PUBLIC_ prefix for client-accessible env vars.
 * Set these in react-native/.env (copy from .env.example).
 *
 * EXPO_PUBLIC_API_URL must be set at BUILD TIME (passed as Docker build arg)
 * for deployed pods — Expo bakes these into the static bundle.
 */

// API Endpoints
export const STRAPI_URL = process.env.EXPO_PUBLIC_API_URL || '';
export const STRAPI_API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';

// Stripe Configuration
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// App Configuration — set EXPO_PUBLIC_APP_NAME at build time to brand your Forge project
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'My App';
export const APP_VERSION = '1.0.0';

// OAuth providers — comma-separated list of enabled providers.
// Valid values: github, google, facebook, email
// Example: EXPO_PUBLIC_OAUTH_PROVIDERS=google,facebook,email
// Defaults to github,google,email (good for dev-tool apps).
export const OAUTH_PROVIDERS = (process.env.EXPO_PUBLIC_OAUTH_PROVIDERS || 'github,google,email')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

export default {
  STRAPI_URL,
  STRAPI_API_TOKEN,
  STRIPE_PUBLISHABLE_KEY,
  APP_NAME,
  APP_VERSION,
  OAUTH_PROVIDERS,
};
