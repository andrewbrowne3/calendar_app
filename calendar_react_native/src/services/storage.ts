// Storage service - Like SharedPreferences but actually works!
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import { User, AuthTokens } from '../types';
import { logger } from '../utils/logger';

class StorageService {
  // Generic storage methods - like C++ templates!
  private async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      logger.debug(`Stored ${key}`);
    } catch (error) {
      logger.error(`Error storing ${key}:`, error);
      throw new Error(`Failed to store ${key}`);
    }
  }

  private async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (!jsonValue) {
        logger.debug(`No value for ${key}`);
        return null;
      }
      const parsed = JSON.parse(jsonValue);
      logger.debug(`Retrieved ${key}`);
      return parsed;
    } catch (error) {
      logger.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  private async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      logger.debug(`Removed ${key}`);
    } catch (error) {
      logger.error(`Error removing ${key}:`, error);
    }
  }

  // Authentication token methods
  async saveTokens(tokens: AuthTokens): Promise<void> {
    logger.info('Saving authentication tokens');
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh);
    logger.info('Tokens saved successfully');
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      logger.error('Error retrieving access token:', error);
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      logger.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // User data methods
  async saveUser(user: User): Promise<void> {
    logger.info('Saving user data:', user.email);
    await this.setItem(STORAGE_KEYS.USER_DATA, user);
  }

  async getUser(): Promise<User | null> {
    const user = await this.getItem<User>(STORAGE_KEYS.USER_DATA);
    
    // Validate user data
    if (user && (!user.email || !user.id)) {
      logger.warn('Invalid user data found, clearing...');
      await this.clearUser();
      return null;
    }
    
    if (user) {
      logger.debug('User loaded:', user.email);
    }
    
    return user;
  }

  async clearUser(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // Clear all data (logout)
  async clearAll(): Promise<void> {
    logger.info('Clearing all stored data');
    await Promise.all([
      this.clearTokens(),
      this.clearUser(),
    ]);
    logger.info('All data cleared');
  }

  // Check if user is logged in (has valid tokens AND user data)
  async isLoggedIn(): Promise<boolean> {
    const [accessToken, refreshToken, user] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
      this.getUser(),
    ]);
    
    const hasTokens = !!(accessToken && refreshToken);
    const hasValidUser = !!(user && user.email && user.id);
    const isLoggedIn = hasTokens && hasValidUser;
    
    logger.debug('Login status check:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUser: !!user,
      hasValidUser,
      isLoggedIn,
    });
    
    // If tokens exist but no valid user, clear everything
    if (hasTokens && !hasValidUser) {
      logger.warn('Tokens exist but no valid user, clearing all data');
      await this.clearAll();
      return false;
    }
    
    return isLoggedIn;
  }

  // Public methods for general data storage
  async saveItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw new Error(`Failed to store ${key}`);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  }
}

// Export a singleton instance (like a static class in C++)
export const storageService = new StorageService();
export default storageService;