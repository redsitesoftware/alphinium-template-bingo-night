import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export const ConfigurableNewsletter = ({ 
  title, 
  description, 
  placeholder = "Enter your email",
  submitText = "Subscribe",
  successMessage = "Successfully subscribed!"
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    if (!email) {
      setStatus('Please enter an email address');
      return;
    }

    try {
      // Add your newsletter subscription logic here
      setStatus(successMessage);
      Alert.alert('Success', successMessage);
      setEmail('');
    } catch (error) {
      setStatus('Failed to subscribe. Please try again.');
      Alert.alert('Error', 'Failed to subscribe. Please try again.');
    }
  };

  return (
    <View style={styles.newsletter}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        
        <View style={styles.form}>
          <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={placeholder}
            placeholderTextColor="#8b9dc3"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>{submitText}</Text>
          </TouchableOpacity>
        </View>
        
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  newsletter: {
    backgroundColor: '#1a1f3a',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  container: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#8b9dc3',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#2a3550',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    marginTop: 12,
    textAlign: 'center',
    color: '#4CAF50',
    fontSize: 13,
  },
});

export default ConfigurableNewsletter;
