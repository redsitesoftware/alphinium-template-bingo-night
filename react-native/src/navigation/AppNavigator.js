/**
 * AppNavigator — Phase-based navigation (no React Navigation needed)
 */
import React from 'react';
import { useBingoStore } from '../store/bingoStore';
import HomeScreen from '../screens/HomeScreen';
import CardScreen from '../screens/CardScreen';
import WinScreen from '../screens/WinScreen';
import FullHouseScreen from '../screens/FullHouseScreen';
import SpectatorScreen from '../screens/SpectatorScreen';

export default function AppNavigator() {
  const phase = useBingoStore(s => s.phase);

  switch (phase) {
    case 'card':
    case 'calling':
      return <CardScreen />;
    case 'win':
      return <WinScreen />;
    case 'fullhouse':
      return <FullHouseScreen />;
    case 'spectating':
      return <SpectatorScreen />;
    default:
      return <HomeScreen />;
  }
}
