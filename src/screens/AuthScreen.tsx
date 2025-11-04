import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleSkip = () => {
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EcoSpectre</Text>
      <Text style={styles.subtitle}>
        Scan products, track sustainability, make greener choices
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleLogin} style={[styles.button, styles.buttonPrimary]}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignup} style={[styles.button, styles.buttonSecondary]}>
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSkip} style={styles.guestButton}>
        <Text style={styles.guestButtonText}>Continue as Guest</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#4CAF50',
  },
  guestButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  guestButtonText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});