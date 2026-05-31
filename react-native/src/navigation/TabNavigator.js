import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@alphinium/auth';
import { isProjectAdmin } from '../utils/admin';
import { colors, typography, spacing } from '../theme';

// Tab screens
import DashboardScreen from '../screens/DashboardScreen';
import AlphiniumAddonsScreen from '../screens/AlphiniumAddonsScreen';
import AccountScreen from '../screens/AccountScreen';

// Stack-only screens
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import PricingScreen from '../screens/PricingScreen';
import StripeCheckoutScreen from '../screens/StripeCheckoutScreen';
import OAuthSettingsScreen from '../screens/OAuthSettingsScreen';
import SubscriptionManagementScreen from '../screens/SubscriptionManagementScreen';

const Stack = createStackNavigator();

const USER_TABS = [
  { id: 'Dashboard', emoji: '⚡', label: 'Home',    Screen: DashboardScreen },
  { id: 'Account',   emoji: '👤', label: 'Account', Screen: AccountScreen },
];

const ADMIN_TABS = [
  { id: 'Dashboard', emoji: '⚡', label: 'Home',    Screen: DashboardScreen },
  { id: 'Addons',    emoji: '🧩', label: 'Add-ons', Screen: AlphiniumAddonsScreen },
  { id: 'Account',   emoji: '👤', label: 'Account', Screen: AccountScreen },
];

// Custom persistent bottom tab bar — no react-native-screens dependency
function TabBar({ active, onSelect, tabs }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const focused = active === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onSelect(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
              {tab.emoji}
            </Text>
            <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Main tab view — renders the active tab screen inline
function MainTabs({ navigation }) {
  const { user } = useAuth();
  const TABS = isProjectAdmin(user) ? ADMIN_TABS : USER_TABS;
  const [activeTab, setActiveTab] = useState('Dashboard');
  const activeTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveScreen = activeTabDef.Screen;

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>
        <ActiveScreen navigation={navigation} />
      </View>
      <View style={styles.safeTabBar}>
      <TabBar active={activeTab} onSelect={setActiveTab} tabs={TABS} />
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: typography.bold, fontSize: typography.md },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main"   component={MainTabs}                   options={{ headerShown: false }} />
      <Stack.Screen name="Home"   component={HomeScreen}                 options={{ title: '📰 News Feed', headerBackTitle: 'Back' }} />
      <Stack.Screen name="Login"  component={LoginScreen}                options={{ headerShown: false }} />
      <Stack.Screen name="Pricing" component={PricingScreen}             options={{ title: 'Pricing Plans' }} />
      <Stack.Screen name="StripeCheckout"         component={StripeCheckoutScreen}         options={{ title: 'Checkout', headerBackTitle: 'Back' }} />
      <Stack.Screen name="OAuthSettings"          component={OAuthSettingsScreen}          options={{ title: 'OAuth Settings' }} />
      <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} options={{ title: 'Manage Subscription' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenArea: {
    flex: 1,
  },
  safeTabBar: {
    backgroundColor: colors.surface,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: 8,
    paddingBottom: 8,
    height: 58,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.4,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontWeight: typography.medium,
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});

