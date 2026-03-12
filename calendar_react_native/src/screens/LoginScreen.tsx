// Login Screen - Clean and functional (no Flutter keyboard issues!)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, FONT_SIZES } from '../constants/config';
import { RootState, AppDispatch } from '../store/store';
import { loginUser } from '../store/slices/authSlice';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      console.log('🔐 LoginScreen: Attempting Redux login with:', email.trim());
      const result = await dispatch(loginUser({ email: email.trim(), password }));
      
      if (loginUser.fulfilled.match(result)) {
        console.log('✅ LoginScreen: Redux login successful, navigation should happen automatically');
      } else {
        console.error('❌ LoginScreen: Redux login failed:', result.payload);
        Alert.alert('Login Failed', result.payload as string || 'An error occurred during login');
      }
    } catch (error: any) {
      console.error('❌ LoginScreen: Unexpected login error:', error);
      Alert.alert('Login Failed', error.message || 'An unexpected error occurred');
    }
  };

  const handleDemoLogin = () => {
    setEmail('andrewbrowne161@gmail.com');
    setPassword('your_password_here'); // You'll need to update this
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your calendar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoButton} onPress={handleDemoLogin}>
            <Text style={styles.demoButtonText}>Use Demo Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.footerLink}>Sign Up</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },

  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 48,
  },

  title: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: FONT_SIZES.LARGE,
    color: COLORS.TEXT.SECONDARY,
  },

  form: {
    marginBottom: 32,
  },

  inputContainer: {
    marginBottom: 20,
  },

  label: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  loginButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
  },

  demoButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },

  demoButtonText: {
    color: COLORS.PRIMARY,
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
  },

  footerText: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },

  footerLink: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});