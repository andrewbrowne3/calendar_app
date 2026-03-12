// TypeScript interfaces - Like C++ structs but better!

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;  // ? means optional (like nullable in C++)
  timezone: string;
  date_format: string;
  time_format: number;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

// Union types - like enum but more flexible
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type NotificationStyle = 'normal' | 'urgent' | 'silent';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  frequency: GoalFrequency;
  priority: GoalPriority;
  status: GoalStatus;
  target_value?: number;
  current_value: number;
  unit?: string;
  start_date: string;
  end_date?: string;
  color: string;
  is_active: boolean;
  is_completed: boolean;  // This is our strike-through field!
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  visibility: 'private' | 'public' | 'shared';
  timezone: string;
  is_active: boolean;
  event_count?: number;
  created_at: string;
  updated_at: string;
  owner?: User;
}

export interface Event {
  id: string;
  calendar: Calendar;
  creator: User;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  color?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  completed?: boolean;  // For event completion toggle
  reminder_minutes?: number[];  // Array of reminder times in minutes before event (e.g., [15, 60, 1440])
}

// Generic API response type (like C++ templates!)
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}