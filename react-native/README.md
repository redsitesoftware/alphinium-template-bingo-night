# React Native + Strapi CMS Prototype

A comprehensive React Native prototype demonstrating Strapi CMS integration for the Alphinium Platform.

## 🚀 What's New

### Issue #570 - Stripe Payment Integration 💳
**Complete Stripe Checkout implementation!** This prototype now includes:
- ✅ Subscription plan selection screen
- ✅ Stripe Checkout integration
- ✅ Payment success/cancel handling
- ✅ Deep link support for payment redirects
- ✅ Payment verification flow
- ✅ Mock subscription plans for testing
- ✅ Full Stripe service layer

**See:** [`STRIPE_INTEGRATION.md`](./STRIPE_INTEGRATION.md) for complete setup guide

### Issue #448 - Complete Mobile App Features
**Complete Mobile App Features!** This prototype now includes:
- ✅ Enhanced CRUD with edit & delete
- ✅ Offline support with sync queue
- ✅ Advanced error handling & retry
- ✅ Skeleton loading states
- ✅ Search, sort & filter
- ✅ Draft saving
- ✅ Bookmarks/favorites
- ✅ Share functionality
- ✅ Haptic feedback
- ✅ Full accessibility

**Two Versions Available:**
- `App.js` - Original basic prototype (Issue #324)
- `App-Enhanced.js` - Complete features (Issue #448) ⭐

## 🎯 Purpose

This prototype extends the work from issue #308 by integrating Strapi CMS, demonstrating:
- Full CRUD operations with Strapi CMS
- Real-time content management
- Cross-platform compatibility (iOS, Android, Web)
- Modern React Native UI patterns
- Error handling and connection monitoring
- Production-ready mobile app features

## 📋 Features

### Stripe Payment Integration - Issue #570 💳
- 💳 **Subscription Management** - Complete payment flow with Stripe Checkout
- 📋 **Plan Selection** - Display subscription plans with pricing and features
- 🔐 **Secure Payments** - Stripe-hosted checkout for PCI compliance
- ✅ **Payment Verification** - Server-side payment confirmation
- 🔗 **Deep Linking** - Automatic return to app after payment
- 🎨 **Payment UI** - Success/cancel screens with retry options
- 🧪 **Test Mode** - Stripe test cards for development
- 📱 **Cross-platform** - Works on iOS, Android, and Web

**Quick Start:**
1. Copy `.env.example` to `.env` and add your Stripe publishable key
2. Ensure Strapi backend is running with subscription endpoints
3. Use test card `4242 4242 4242 4242` for testing

**See:** [`STRIPE_INTEGRATION.md`](./STRIPE_INTEGRATION.md) for complete documentation

### Enhanced Version (App-Enhanced.js) - Issue #448 ⭐
- ✨ Complete CRUD operations (create, read, update, delete)
- 💾 Offline support with AsyncStorage caching
- 🔄 Pull-to-refresh with debounce
- 🔁 Retry mechanism with exponential backoff
- ⏳ Skeleton loading screens with shimmer
- 🔍 Search articles by title/content
- 📊 Sort by date, title, author
- 📝 Draft saving and loading
- ⭐ Bookmarks/favorites
- 📤 Share functionality
- 📳 Haptic feedback
- ♿ Full accessibility support
- 🛡️ Error boundaries
- 🔌 Network status monitoring
- 📱 Keyboard-aware forms
- 🎨 Dark mode ready

### Basic Version (App.js) - Issue #324

### ✨ CMS Integration
- **Connection Testing** - Verify Strapi backend connectivity
- **Fetch Articles** - Retrieve content from Strapi API
- **Create Articles** - Submit new content to Strapi
- **Real-time Updates** - Automatic list refresh after creating content
- **Status Monitoring** - Visual connection status indicator

### 🎨 User Interface
- **Modern Dark Theme** - Professional dark-mode interface
- **Responsive Cards** - Clean, organized content sections
- **Interactive Forms** - Text inputs with validation
- **Loading States** - Activity indicators during API calls
- **Error Feedback** - User-friendly error messages

### 🔧 Technical Features
- **Axios HTTP Client** - Robust API communication
- **Bearer Token Auth** - Secure API authentication
- **Cross-platform** - Works on iOS, Android, and Web
- **Expo Framework** - Easy development and deployment
- **React Hooks** - Modern state management

## 🚀 Quick Start

**Choose your version:**

### Enhanced Version (Recommended) - Issue #448
```bash
# Navigate to prototype directory
cd prototypes/react-native-strapi

# Install dependencies (includes AsyncStorage)
npm install

# Rename to use enhanced version
mv App.js App-Basic.js
mv App-Enhanced.js App.js

# Start development server
npm start

# Or run directly on web
npm run web
```

### Basic Version - Issue #324
```bash
# Use App.js as-is
npm install
npm start
```

## 📚 Documentation

- **README.md** (this file) - Getting started
- **FEATURES.md** - Complete enhanced feature list ⭐
- **TESTING.md** - Comprehensive testing guide ⭐
- **ISSUE-324-NOTES.md** - Original implementation notes
- **STRAPI-SETUP.md** - Backend setup guide

### Stripe Payment Integration (Issue #570)
- **[STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md)** - Complete integration guide
- **[STRIPE_INSTALLATION.md](./STRIPE_INSTALLATION.md)** - Step-by-step setup
- **[STRIPE_TEST_REPORT.md](./STRIPE_TEST_REPORT.md)** - Comprehensive test report (34 test cases)
- **[STRIPE_TESTING_QUICKSTART.md](./STRIPE_TESTING_QUICKSTART.md)** - Quick testing checklist (2-3 hours) ⚡ **NEW**

### Prerequisites
- Node.js 20.x or later
- npm or yarn
- Strapi CMS instance (see setup below)

### Quick Installation

## 🗄️ Strapi CMS Setup

### 1. Create Strapi Project

```bash
# Create new Strapi project
npx create-strapi-app@latest my-strapi --quickstart

# Navigate to project
cd my-strapi

# Start Strapi in development mode
npm run develop
```

This will:
- Install Strapi CMS
- Create SQLite database
- Open admin panel at http://localhost:1337/admin

### 2. Create Admin User

When Strapi opens in your browser:
1. Fill out the admin registration form
2. Create your first admin account
3. Log in to the admin panel

### 3. Create Article Content Type

In the Strapi admin panel:

1. **Go to Content-Type Builder** (left sidebar)
2. **Click "Create new collection type"**
3. **Name it:** `article`
4. **Add fields:**
   - **Title** (Text, Short text)
     - Click "Add another field"
     - Select "Text"
     - Name: `title`
     - Type: Short text
     - Click "Finish"
   - **Content** (Rich text or Long text)
     - Click "Add another field"
     - Select "Rich text" or "Text"
     - Name: `content`
     - Type: Long text
     - Click "Finish"
5. **Click "Save"** (top right)
6. **Server will restart automatically**

### 4. Configure Permissions

1. **Go to Settings** → **Users & Permissions Plugin** → **Roles**
2. **Click on "Public" role**
3. **Under Permissions:**
   - Find "Article" section
   - Check: `find`, `findOne`, `create`, `update`, `delete`
4. **Click "Save"**

### 5. Generate API Token

For secure API access:

1. **Go to Settings** → **API Tokens**
2. **Click "Create new API Token"**
3. **Fill out:**
   - Name: `React Native App`
   - Token duration: Unlimited
   - Token type: Full access or Custom (select Article permissions)
4. **Click "Save"**
5. **Copy the generated token** (you won't see it again!)

### 6. Update App Configuration

Edit `App.js` in the prototype:

```javascript
// Update these constants
const STRAPI_URL = 'http://localhost:1337';
const STRAPI_API_TOKEN = 'your-api-token-here'; // Paste your token
```

**For mobile testing:**
- Replace `localhost` with your computer's local IP
- Example: `http://192.168.1.100:1337`

## 📱 Testing the Integration

### 1. Test Connection

1. Start the React Native app
2. Click **"Test Connection"** button
3. Should see "Connected ✓" status

### 2. Fetch Articles

1. Click **"Fetch Articles"** button
2. Initially empty (no articles yet)
3. Should see "No articles yet. Create one below!"

### 3. Create Article

1. Scroll to **"Create Article"** section
2. Enter a title: `My First Article`
3. Enter content: `This is a test article from React Native!`
4. Click **"Create Article"**
5. Should see success message
6. Articles list will auto-refresh

### 4. View Articles

- Scroll to **"Articles"** section
- See your created articles
- Each shows title, content preview, and creation date

## 🏗️ Project Structure

```
react-native-strapi/
├── App.js              # Main application component
├── package.json        # Dependencies and scripts
├── app.json           # Expo configuration
├── babel.config.js    # Babel configuration
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🔌 API Integration Details

### Strapi API Endpoints

The app uses these Strapi REST API endpoints:

- **GET** `/api/articles` - Fetch all articles
- **GET** `/api/articles/:id` - Fetch single article
- **POST** `/api/articles` - Create new article
- **PUT** `/api/articles/:id` - Update article
- **DELETE** `/api/articles/:id` - Delete article

### Authentication

Uses Bearer token authentication:

```javascript
headers: {
  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  'Content-Type': 'application/json',
}
```

### Data Format

Strapi wraps data in a specific format:

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "title": "Article Title",
        "content": "Article content...",
        "createdAt": "2026-01-08T10:00:00.000Z",
        "updatedAt": "2026-01-08T10:00:00.000Z"
      }
    }
  ]
}
```

## 📸 Screenshots

Use Valerie (Visual Audio Loop - Environment Remote Interaction Engine) to capture screenshots:

```bash
# From Alphinium platform
# Deploy prototype to accessible URL
# Use Valerie screenshot tool
# Save to prototypes/screenshots/
```

## 🐛 Troubleshooting

### Connection Failed

**Problem:** "Connection failed ✗" message

**Solutions:**
- Verify Strapi is running: `npm run develop`
- Check URL is correct (http://localhost:1337)
- Try using local IP instead of localhost on mobile
- Check firewall settings

### 403 Forbidden Error

**Problem:** API returns 403 error

**Solutions:**
- Verify API token is correct
- Check permissions in Strapi admin
- Ensure "Public" role has Article permissions
- Regenerate API token if needed

### CORS Errors (Web)

**Problem:** CORS policy blocking requests

**Solutions:**
- Strapi should allow CORS by default in development
- Check `config/middlewares.js` in Strapi project
- Add your app's URL to allowed origins if needed

### No Articles Showing

**Problem:** Empty list even after creating articles

**Solutions:**
- Click "Fetch Articles" to refresh
- Check Strapi admin panel - are articles there?
- Verify API permissions include `find` and `findOne`
- Check browser/app console for errors

## 🔗 Related Issues

- **Issue #308** - React Native Prototype and Valerie Test (base work)
- **Issue #324** - React Native Prototype Strapi CMS Integration (this issue)

## 🛠️ Technologies Used

- **React Native** - Mobile framework
- **Expo** - Development platform
- **React 19.0.0** - UI library
- **Strapi CMS** - Headless CMS
- **Axios** - HTTP client
- **React Native Web** - Web support

## 📚 Documentation

### Strapi Resources
- [Strapi Documentation](https://docs.strapi.io/)
- [Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Content-Type Builder](https://docs.strapi.io/user-docs/content-type-builder)

### React Native Resources
- [React Native Docs](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Axios Documentation](https://axios-http.com/)

## 🎓 Learning Objectives

This prototype demonstrates:
1. **API Integration** - Connecting React Native to backend CMS
2. **State Management** - Using React hooks for data and UI state
3. **Error Handling** - Graceful error handling and user feedback
4. **Authentication** - Secure API access with bearer tokens
5. **CRUD Operations** - Create, Read, Update, Delete patterns
6. **UX Design** - Loading states, empty states, error states
7. **Cross-platform Development** - Single codebase for multiple platforms

## 🚢 Deployment Notes

### Web Deployment

```bash
# Build for web
npm run build

# Output in dist/ directory
# Deploy to any static hosting
```

### Mobile Deployment

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

## ⚙️ Configuration Options

Edit `App.js` to customize:

```javascript
// Strapi Configuration
const STRAPI_URL = 'http://localhost:1337';
const STRAPI_API_TOKEN = 'your-api-token-here';

// Can be expanded to:
const CONFIG = {
  strapi: {
    url: process.env.STRAPI_URL || 'http://localhost:1337',
    token: process.env.STRAPI_API_TOKEN || 'your-token',
  },
  api: {
    timeout: 5000,
    retries: 3,
  },
};
```

## 🤝 Contributing

This is a prototype for the Alphinium Platform. To extend it:

1. Fork the alphinium-assets repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

Part of the Alphinium Platform project.

## 👥 Credits

- **Built for:** Alphinium Platform
- **Issue:** #324 - React Native Prototype Strapi CMS Integration
- **Extension of:** Issue #308 - React Native Prototype
- **Platform:** Alphinium Multi-tenant AI Development Platform

---

**Built with ❤️ for Alphinium Platform - Issue #324**
