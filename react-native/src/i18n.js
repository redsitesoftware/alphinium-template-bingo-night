import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Detect + persist language preference via AsyncStorage
const AsyncStorageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (cb) => {
    const stored = await AsyncStorage.getItem('alphinium_lang').catch(() => null);
    cb(stored || 'en');
  },
  init: () => {},
  cacheUserLanguage: (lng) =>
    AsyncStorage.setItem('alphinium_lang', lng).catch(() => {}),
};

// Static resource map — Metro requires statically-analyzable requires for web export.
// Dynamic template-literal imports (`import(\`../${lang}\``) fail on expo export --platform web.
// When alphinium-languages is installed, install.sh adds entries here.
const resources = {
  en: {
    common: require('../locales/en/common.json'),
  },
  // alphinium-languages-inject-start (do not remove this comment)
  // alphinium-languages-inject-end (do not remove this comment)
};

i18n
  .use(AsyncStorageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Supported languages — extend this list when adding alphinium-languages
    supportedLngs: ['en'],
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    // Must be false for React Native (Metro bundler limitation)
    react: {
      useSuspense: false,
    },
  });

export default i18n;
