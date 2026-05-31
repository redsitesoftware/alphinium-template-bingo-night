require('dotenv').config();

module.exports = {
  expo: require('./app.json').expo,
  extra: {
    // Use EXPO_PUBLIC_API_URL (set as Docker build arg for deployed pods)
    strapiUrl: process.env.EXPO_PUBLIC_API_URL || process.env.STRAPI_URL || '',
    strapiApiToken: process.env.EXPO_PUBLIC_API_TOKEN || process.env.STRAPI_API_TOKEN || '',
  },
};
