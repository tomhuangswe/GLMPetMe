// src/screens/VIPScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VIPScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.crown}>👑</Text>
      <Text style={styles.message}>VIP features will come soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crown: {
    fontSize: 64,
    marginBottom: 20,
  },
  message: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2060',
    textAlign: 'center',
  },
});
