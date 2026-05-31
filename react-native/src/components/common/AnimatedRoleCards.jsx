import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const AnimatedRoleCards = ({ 
  cards = [], 
  autoPlay = true, 
  sleepModeDelay = 10000,
  cardChangeInterval = 5000,
}) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!isPlaying || cards.length === 0) return;

    const interval = setInterval(() => {
      setExpandedCard((prev) => {
        const nextIndex = prev === null ? 0 : (prev + 1) % cards.length;
        return nextIndex;
      });
    }, cardChangeInterval);

    return () => clearInterval(interval);
  }, [isPlaying, cards.length, cardChangeInterval]);

  const handleCardPress = (index) => {
    setExpandedCard(index);
    setIsPlaying(false);
    
    if (sleepModeDelay > 0) {
      setTimeout(() => setIsPlaying(true), sleepModeDelay);
    }
  };

  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.card, expandedCard === index && styles.cardExpanded]}
          onPress={() => handleCardPress(index)}
        >
          <Text style={styles.icon}>{card.icon}</Text>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.description}>{card.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  card: {
    backgroundColor: '#2a3550',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    minWidth: 150,
    maxWidth: 200,
    alignItems: 'center',
  },
  cardExpanded: {
    backgroundColor: '#4CAF50',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#b4c1d8',
    textAlign: 'center',
  },
});

export default AnimatedRoleCards;
