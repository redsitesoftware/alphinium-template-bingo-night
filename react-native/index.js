import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Fix web scrolling BEFORE React renders
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Override Expo's default overflow: hidden
  const style = document.createElement('style');
  style.setAttribute('id', 'scroll-fix');
  style.textContent = `
    html, body {
      height: auto !important;
      overflow-y: scroll !important;
    }
    #root {
      height: auto !important;
      min-height: 100vh !important;
    }
  `;
  document.head.appendChild(style);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
