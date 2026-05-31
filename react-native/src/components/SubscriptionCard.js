import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

export const SubscriptionCard = ({
  plan,
  onSelect,
  isLoading = false,
  disabled = false,
}) => {
  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  return (
    <View style={[styles.card, plan.recommended && styles.recommendedCard]}>
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>RECOMMENDED</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>
          {formatPrice(plan.price, plan.currency)}
        </Text>
        <Text style={styles.interval}>/{plan.interval}</Text>
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.feature}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          plan.recommended && styles.recommendedButton,
          (disabled || isLoading) && styles.disabledButton,
        ]}
        onPress={() => onSelect(plan)}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.selectButtonText}>Select Plan</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  recommendedCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  interval: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  feature: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  recommendedButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
