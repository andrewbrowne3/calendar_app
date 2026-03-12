import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import { loginUser, logoutUser, checkAuthStatus, clearError } from '../store/slices/authSlice';
import type { LoginRequest } from '../types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      return dispatch(loginUser(credentials)).unwrap();
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    return dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  const checkAuth = useCallback(async () => {
    return dispatch(checkAuthStatus()).unwrap();
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    clearAuthError,
  };
};

export default useAuth;
