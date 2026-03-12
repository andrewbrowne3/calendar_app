import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginRequest, AuthTokens } from '../../types';
import apiService from '../../services/api';
import storageService from '../../services/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      console.log('🔐 Redux: Starting login for user:', credentials.email);
      
      // Clear any existing invalid tokens before login
      await storageService.clearAll();
      console.log('🧹 Redux: Cleared all storage before login');
      
      const response = await apiService.login(credentials);
      
      console.log('✅ Redux: Login successful:', response.user.email);
      return response;
    } catch (error: any) {
      console.error('❌ Redux: Login failed:', error.message);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🚪 Redux: Starting logout');
      await apiService.logout();
      console.log('✅ Redux: Logout successful');
    } catch (error: any) {
      console.error('❌ Redux: Logout failed:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔍 Redux: Checking authentication status');
      
      const isLoggedIn = await storageService.isLoggedIn();
      
      if (isLoggedIn) {
        const storedUser = await storageService.getUser();
        
        if (storedUser && storedUser.email && storedUser.id) {
          console.log('✅ Redux: Auto-login successful:', storedUser.email);
          return { user: storedUser };
        } else {
          console.log('⚠️ Redux: Invalid stored user data');
          await storageService.clearAll();
          return rejectWithValue('Invalid stored user data');
        }
      } else {
        console.log('📱 Redux: No valid stored authentication');
        return rejectWithValue('No valid authentication');
      }
    } catch (error: any) {
      console.error('❌ Redux: Auth check failed:', error);
      await storageService.clearAll();
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null; // Don't show error for initial auth check
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;