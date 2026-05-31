import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export const LoadingOverlay = ({
  message = 'Loading...',
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size={36} color="#2196F3" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
