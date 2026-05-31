import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export const ConfigurableFooter = ({ 
  companyName, 
  tagline,
  columns = [], 
  socialLinks = [],
}) => {
  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          {tagline && <Text style={styles.tagline}>{tagline}</Text>}
        </View>
        
        <View style={styles.columns}>
          {columns.map((column, index) => (
            <View key={index} style={styles.column}>
              <Text style={styles.columnTitle}>{column.title}</Text>
              {column.links.map((link, linkIndex) => (
                <TouchableOpacity key={linkIndex} style={styles.link}>
                  <Text style={styles.linkText}>{link.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {socialLinks.length > 0 && (
          <View style={styles.social}>
            {socialLinks.map((social, index) => (
              <TouchableOpacity key={index} style={styles.socialIcon}>
                <Text style={styles.socialText}>{social.platform}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.copyright}>
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#0a0e27',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a3550',
  },
  container: {
    maxWidth: 1200,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#8b9dc3',
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  column: {
    minWidth: 150,
    marginBottom: 16,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  link: {
    marginBottom: 8,
  },
  linkText: {
    color: '#8b9dc3',
    fontSize: 14,
  },
  social: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialIcon: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  socialText: {
    color: '#2196F3',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  copyright: {
    textAlign: 'center',
    color: '#6b7a94',
    fontSize: 12,
  },
});

export default ConfigurableFooter;
