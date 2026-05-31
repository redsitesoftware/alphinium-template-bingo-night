import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * AlphiniumNewsCard — displays a single news article card.
 */
export default function AlphiniumNewsCard({ article, onPress, style }) {
  const { title, content, createdAt } = article || {};
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString() : '';
  const excerpt = (content || '').substring(0, 120) + (content?.length > 120 ? '...' : '');

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={() => onPress?.(article)}
      activeOpacity={0.8}
    >
      <View style={styles.categoryTag}>
        <Text style={styles.categoryText}>📰 NEWS</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{title || 'Untitled'}</Text>
      {excerpt ? <Text style={styles.excerpt}>{excerpt}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.readMore}>Read more →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4285F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#0a1628',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    color: '#4285F4',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  excerpt: {
    fontSize: 13,
    color: '#8b9dc3',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 11,
    color: '#6b7a94',
  },
  readMore: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '600',
  },
});
