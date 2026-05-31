import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export const AnimatedLogo = ({ 
  src, 
  alt = "Logo", 
  animation = "none", 
  size = 50,
  style = {}
}) => {
  const numericSize = typeof size === 'string' ? parseInt(size) : size;
  
  return (
    <View style={[styles.container, style]}>
      <Image 
        source={{ uri: src }}
        alt={alt}
        style={[styles.logo, { width: numericSize, height: numericSize }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 50,
    height: 50,
  },
});

export default AnimatedLogo;
