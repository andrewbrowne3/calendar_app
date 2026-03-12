// App configuration - much cleaner than Flutter constants!

export const API_CONFIG = {
  BASE_URL: 'https://calendar.andrewbrowne.org',
  TIMEOUT: 10000, // 10 seconds
  
  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login/',
      LOGOUT: '/api/auth/logout/',
      REFRESH: '/api/auth/token/refresh/',
      PROFILE: '/api/auth/profile/',
    },
    CALENDARS: '/api/calendars/',
    EVENTS: '/api/events/',
    GOALS: '/api/goals/',
    RESPONSIBILITIES: '/api/responsibilities/',
    AI_AGENT: {
      CHAT: '/agent/chat',
      HEALTH: '/agent/',
      MODELS: '/agent/models',
    },
  }
} as const; // 'as const' makes this read-only (like const in C++)

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@calendar_app/access_token',
  REFRESH_TOKEN: '@calendar_app/refresh_token',
  USER_DATA: '@calendar_app/user_data',
  NOTIFICATION_STYLE_PREFIX: '@calendar_app/notification_style/',
} as const;

export const NOTIFICATION_STYLES = {
  normal: {
    label: 'Normal',
    description: 'Standard notification with sound',
    color: '#2196F3',
  },
  urgent: {
    label: 'Urgent',
    description: 'Alarm-style, repeating sound & vibration',
    color: '#F44336',
  },
  silent: {
    label: 'Silent',
    description: 'Visual only, no sound or vibration',
    color: '#757575',
  },
} as const;

export const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#4CAF50', 
  ERROR: '#F44336',
  WARNING: '#FF9800',
  SUCCESS: '#4CAF50',
  
  // Goal priority colors
  PRIORITY: {
    low: '#4CAF50',      // Green
    medium: '#FF9800',    // Orange  
    high: '#F44336',      // Red
    critical: '#9C27B0',  // Purple
  },
  
  // Text colors
  TEXT: {
    PRIMARY: '#212121',
    SECONDARY: '#757575',
    DISABLED: '#BDBDBD',
  },
  
  // Background colors
  BACKGROUND: {
    PRIMARY: '#FFFFFF',
    SECONDARY: '#F5F5F5',
    CARD: '#FFFFFF',
  },
} as const;

export const FONT_SIZES = {
  SMALL: 12,
  MEDIUM: 16,
  LARGE: 20,
  EXTRA_LARGE: 24,
  TITLE: 28,
} as const;