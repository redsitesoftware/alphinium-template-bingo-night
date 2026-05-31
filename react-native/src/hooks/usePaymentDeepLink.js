import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

export const usePaymentDeepLink = () => {
  const [deepLink, setDeepLink] = useState({ type: null });

  useEffect(() => {
    // Handle deep link when app is already open
    const handleDeepLink = ({ url }) => {
      const parsedLink = parsePaymentUrl(url);
      if (parsedLink.type) {
        setDeepLink(parsedLink);
      }
    };

    // Handle deep link when app is opened from closed state
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsedLink = parsePaymentUrl(initialUrl);
        if (parsedLink.type) {
          setDeepLink(parsedLink);
        }
      }
    };

    getInitialUrl();

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const clearDeepLink = () => {
    setDeepLink({ type: null });
  };

  return { deepLink, clearDeepLink };
};

const parsePaymentUrl = (url) => {
  try {
    // Expected formats:
    // alphinium://payment-success?session_id=cs_xxx
    // alphinium://payment-cancel

    if (url.includes('payment-success')) {
      const urlObj = new URL(url);
      const sessionId = urlObj.searchParams.get('session_id') || undefined;
      return { type: 'success', sessionId };
    }

    if (url.includes('payment-cancel')) {
      return { type: 'cancel' };
    }

    return { type: null };
  } catch (error) {
    console.error('Error parsing payment URL:', error);
    return { type: null };
  }
};
