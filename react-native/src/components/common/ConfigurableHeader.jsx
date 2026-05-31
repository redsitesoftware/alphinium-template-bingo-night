import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export const ConfigurableHeader = ({ 
  brand, 
  links = [], 
  actions = [], 
  scrollTrigger = false,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!scrollTrigger) return;
    
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setScrolled(window.scrollY > 50);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [scrollTrigger]);

  return (
    <View style={[styles.header, scrolled && styles.headerScrolled]}>
      <View style={styles.container}>
        <Text style={styles.brand}>{brand}</Text>
        <View style={styles.navLinks}>
          {links.map((link, index) => (
            <TouchableOpacity key={index} style={styles.link}>
              <Text style={styles.linkText}>{link.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <TouchableOpacity 
              key={index}
              style={[styles.actionButton, action.className === 'btn-primary' && styles.actionPrimary]}
            >
              <Text style={styles.actionText}>{action.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1a1f3a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3550',
  },
  headerScrolled: {
    backgroundColor: '#0a0e27',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  navLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
  },
  link: {
    marginHorizontal: 12,
  },
  linkText: {
    color: '#b4c1d8',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2a3550',
  },
  actionPrimary: {
    backgroundColor: '#2196F3',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConfigurableHeader;
