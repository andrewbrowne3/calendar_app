import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, LoginRequest } from '../types';
import apiService from '../services/api';
import storageService from '../services/storage';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      
      // Clear any existing invalid tokens before login
      await storageService.clearAll();
      logger.debug('Cleared all storage before login');
      
      const response = await apiService.login(credentials);
      
      if (response.user && response.user.email) {
        setUser(response.user);
        setIsAuthenticated(true);
        logger.auth('Login successful', { email: response.user.email });
        
        // Small delay to ensure token is properly set in interceptors
        await new Promise(resolve => setTimeout(resolve, 100));
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

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};