// API Service - Clean, type-safe, no more Flutter headaches!
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from '../constants/config';
import storageService from './storage';
import { logger } from '../utils/logger';
import { 
  User, 
  Goal, 
  Calendar, 
  Event, 
  LoginRequest, 
  LoginResponse, 
  ApiResponse 
} from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        // Don't add auth header to login, register, or token refresh endpoints
        const isAuthEndpoint = config.url?.includes('/login') || 
                              config.url?.includes('/register') || 
                              config.url?.includes('/token/refresh');
        
        if (!isAuthEndpoint) {
          const token = await storageService.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔑 TOKEN BEING SENT:', token.substring(0, 50) + '...');
            console.log('🔑 FULL AUTH HEADER:', `Bearer ${token.substring(0, 50)}...`);
            logger.debug('Auth header added to request');
          }
        } else {
          logger.debug('Skipping auth header for auth endpoint');
        }
        
        // Log the request
        logger.api(
          config.method || 'GET',
          config.url || '',
          config.data
        );
        
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => {
        // Log successful response
        logger.apiResponse(
          response.status,
          response.config.url || '',
          response.data
        );
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Log the error
        logger.apiResponse(
          error.response?.status || 0,
          originalRequest?.url || '',
          error.response?.data
        );

        // Don't try to refresh token for auth endpoints
        const isAuthEndpoint = originalRequest?.url?.includes('/login') || 
                              originalRequest?.url?.includes('/register') || 
                              originalRequest?.url?.includes('/token/refresh');

        // If 401 and we haven't already tried to refresh (and it's not an auth endpoint)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;
          logger.info('Token expired, attempting refresh...');

          try {
            const refreshToken = await storageService.getRefreshToken();
            if (refreshToken) {
              logger.debug('Refresh token found, requesting new access token');
              
              // Create new axios instance to avoid interceptor loop
              const response = await axios.post(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
                { refresh: refreshToken }
              );

              const newAccessToken = response.data.access;
              await storageService.saveTokens({
                access: newAccessToken,
                refresh: refreshToken,
              });
              
              logger.info('Token refresh successful');

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            } else {
              logger.warn('No refresh token available');
            }
          } catch (refreshError) {
            logger.error('Token refresh failed:', refreshError);
            // Clear tokens and redirect to login
            await storageService.clearAll();
            // TODO: Navigate to login screen
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request methods (like C++ templates!)
  private async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url);
    return response.data;
  }

  private async post<T, U>(url: string, data?: U): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  private async put<T, U>(url: string, data: U): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }

  private async patch<T, U>(url: string, data: U): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data);
    return response.data;
  }

  private async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('🔐 Starting login for user:', credentials.email);
    console.log('🔗 Login URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`);
    
    try {
      const response = await this.post<LoginResponse, LoginRequest>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      console.log('📡 Login response received:', response);
      console.log('🔑 Access token received (first 50 chars):', response.access.substring(0, 50) + '...');
      console.log('🔑 Refresh token received (first 50 chars):', response.refresh.substring(0, 50) + '...');

      // Save tokens and user data
      console.log('💾 Saving tokens to storage...');
      await storageService.saveTokens({
        access: response.access,
        refresh: response.refresh,
      });
      console.log('💾 Tokens saved successfully');
      
      console.log('👤 Saving user data to storage...');
      await storageService.saveUser(response.user);
      console.log('👤 User data saved successfully');

      // Verify tokens were saved
      const savedAccessToken = await storageService.getAccessToken();
      const savedRefreshToken = await storageService.getRefreshToken();
      const savedUser = await storageService.getUser();
      
      console.log('🔍 Verification - Saved access token exists:', !!savedAccessToken);
      console.log('🔍 Verification - Saved refresh token exists:', !!savedRefreshToken);
      console.log('🔍 Verification - Saved user exists:', !!savedUser);
      console.log('🔍 Verification - Saved user email:', savedUser?.email);

      console.log('✅ Login successful:', response.user.email);
      return response;
    } catch (error: any) {
      console.error('❌ Login failed - Full error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw new Error(error.response?.data?.detail || error.message || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    console.log('🚪 Starting logout API call...');
    console.log('🔗 Logout URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`);
    
    try {
      const refreshToken = await storageService.getRefreshToken();
      if (refreshToken) {
        console.log('🔑 Found refresh token, calling logout API...');
        console.log('🔑 Refresh token (first 10 chars):', refreshToken.substring(0, 10) + '...');
        
        // Add timeout to logout call
        const logoutPromise = this.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, { refresh: refreshToken });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Logout request timed out')), 5000)
        );
        
        await Promise.race([logoutPromise, timeoutPromise]);
        console.log('✅ API logout successful');
      } else {
        console.log('⚠️ No refresh token found, skipping API call');
      }
    } catch (error: any) {
      console.error('❌ Logout API error - Full error:', error);
      console.error('❌ Logout error response:', error.response?.data);
      console.error('❌ Logout error status:', error.response?.status);
      // Don't throw - always clear local data even if API fails
    } finally {
      console.log('🧹 Clearing local storage...');
      await storageService.clearAll();
      console.log('✅ Local storage cleared');
    }
  }

  async getCurrentUser(): Promise<User> {
    return await this.get<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  // Goals methods
  async getGoals(): Promise<Goal[]> {
    console.log('📋 Fetching goals from API');
    return await this.get<Goal[]>(API_CONFIG.ENDPOINTS.GOALS);
  }

  async createGoal(goalData: Partial<Goal>): Promise<Goal> {
    logger.debug('Creating goal:', goalData.title);
    return await this.post<Goal, Partial<Goal>>(API_CONFIG.ENDPOINTS.GOALS, goalData);
  }

  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal> {
    logger.debug('Updating goal:', goalId);
    return await this.patch<Goal, Partial<Goal>>(
      `${API_CONFIG.ENDPOINTS.GOALS}${goalId}/`,
      updates
    );
  }

  async deleteGoal(goalId: string): Promise<void> {
    logger.debug('Deleting goal:', goalId);
    await this.delete(`${API_CONFIG.ENDPOINTS.GOALS}${goalId}/`);
  }

  // Quick method to toggle goal completion (the main event!)
  async toggleGoalCompletion(goalId: string, isCompleted: boolean): Promise<Goal> {
    const status = isCompleted ? 'completed' : 'active';
    return await this.updateGoal(goalId, { 
      is_completed: isCompleted, 
      status 
    });
  }

  // Calendar methods
  async getCalendars(): Promise<Calendar[]> {
    logger.debug('Fetching calendars');
    return await this.get<Calendar[]>(API_CONFIG.ENDPOINTS.CALENDARS);
  }

  async createCalendar(calendar: Partial<Calendar>): Promise<Calendar> {
    return await this.post<Calendar, Partial<Calendar>>(
      API_CONFIG.ENDPOINTS.CALENDARS, 
      calendar
    );
  }

  async updateCalendar(calendarId: string, updates: Partial<Calendar>): Promise<Calendar> {
    return await this.patch<Calendar, Partial<Calendar>>(
      `${API_CONFIG.ENDPOINTS.CALENDARS}${calendarId}/`,
      updates
    );
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.CALENDARS}${calendarId}/`);
  }

  // Events methods
  async getEvents(startDate?: string, endDate?: string, calendarId?: string): Promise<Event[]> {
    let url = API_CONFIG.ENDPOINTS.EVENTS;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (calendarId) params.append('calendar_id', calendarId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('📅 Fetching events from:', url);
    return await this.get<Event[]>(url);
  }

  async createEvent(event: Partial<Event>): Promise<Event> {
    return await this.post<Event, Partial<Event>>(API_CONFIG.ENDPOINTS.EVENTS, event);
  }

  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    return await this.patch<Event, Partial<Event>>(
      `${API_CONFIG.ENDPOINTS.EVENTS}${eventId}/`,
      updates
    );
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.EVENTS}${eventId}/`);
  }

  // Test connection (no more 404 errors!)
  async testConnection(): Promise<boolean> {
    try {
      await this.get(API_CONFIG.ENDPOINTS.GOALS);
      logger.debug('API connection test successful');
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;