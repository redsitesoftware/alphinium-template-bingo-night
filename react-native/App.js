/**
 * Bingo Night — Root App
 */
import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
      <AppNavigator />
    </>
  );
}
