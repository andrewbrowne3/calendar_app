// Authentication hook - React's state management at its finest!
import { useState, useEffect, useCallback } from 'react';
import { User, LoginRequest } from '../types';
import apiService from '../services/api';
import storageService from '../services/storage';
import { logger } from '../utils/logger';

// Custom hook for authentication - like a state manager but simpler!
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.auth('Checking authentication status');
      
      // Use the improved isLoggedIn that checks both tokens and user
      const isLoggedIn = await storageService.isLoggedIn();
      
      if (isLoggedIn) {
        const storedUser = await storageService.getUser();
        
        if (storedUser && storedUser.email && storedUser.id) {
          setUser(storedUser);
          setIsAuthenticated(true);
          logger.auth('Auto-login successful', { email: storedUser.email });
        } else {
          // This shouldn't happen due to isLoggedIn validation, but just in case
          logger.warn('Unexpected: isLoggedIn true but invalid user');
          await storageService.clearAll();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        logger.auth('No valid stored authentication');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      logger.error('Auth check failed:', error);
      // Clear invalid data
      await storageService.clearAll();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      logger.auth('Starting login', { email: credentials.email });
      
      const response = await apiService.login(credentials);
      
      if (response.user && response.user.email) {
        setUser(response.user);
        setIsAuthenticated(true);
        logger.auth('Login successful', { email: response.user.email });
      } else {
        throw new Error('Invalid user data received from server');
      }
    } catch (error: any) {
      logger.error('Login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      logger.auth('Starting logout', { currentUser: user?.email });
      
      // Always try to logout from server, but don't fail if it doesn't work
      await apiService.logout();
      
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      
      logger.auth('Logout successful');
    } catch (error) {
      logger.error('Logout error (will clear local state anyway):', error);
      // Even if server logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      if (!isAuthenticated) {
        logger.debug('Skipping user refresh - not authenticated');
        return;
      }
      
      logger.debug('Refreshing user data');
      const updatedUser = await apiService.getCurrentUser();
      
      if (updatedUser && updatedUser.email) {
        setUser(updatedUser);
        await storageService.saveUser(updatedUser);
        logger.auth('User data refreshed', { email: updatedUser.email });
      } else {
        logger.warn('Invalid user data received during refresh');
      }
    } catch (error) {
      logger.error('Failed to refresh user data:', error);
    }
  }, [isAuthenticated]);

  // Initialize auth state on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // State
    user,
    isLoading,
    isAuthenticated,
    
    // Actions
    login,
    logout,
    refreshUser,
    checkAuthStatus,
  };
};