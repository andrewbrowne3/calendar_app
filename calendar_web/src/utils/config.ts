// App configuration

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'https://calendar.andrewbrowne.org',
  TIMEOUT: 10000,

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
    AI_AGENT: {
      CHAT: '/agent/chat',
      CHAT_STREAM: '/agent/chat/stream',
      HEALTH: '/agent/',
      MODELS: '/agent/models',
    },
    FINANCE: {
      ACCOUNTS: '/api/finance/accounts/',
      TRANSACTIONS: '/api/finance/transactions/',
      TRANSFERS: '/api/finance/transfers/',
      CATEGORIES: '/api/finance/categories/',
      RECURRING: '/api/finance/recurring/',
      SUBSCRIPTIONS: '/api/finance/subscriptions/',
      BUDGETS: '/api/finance/budgets/',
      DASHBOARD: '/api/finance/dashboard/',
      GOALS: '/api/finance/goals/',
      REPORTS: {
        PROFIT_LOSS: '/api/finance/reports/profit-loss/',
        CASH_FLOW: '/api/finance/reports/cash-flow/',
        CATEGORY_BREAKDOWN: '/api/finance/reports/category-breakdown/',
        BUDGET_STATUS: '/api/finance/reports/budget-status/',
        TAX_SUMMARY: '/api/finance/reports/tax-summary/',
        INCOME_VS_EXPENSES: '/api/finance/reports/income-vs-expenses/',
      },
    },
  }
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'calendar_app_access_token',
  REFRESH_TOKEN: 'calendar_app_refresh_token',
  USER_DATA: 'calendar_app_user_data',
} as const;

export const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FF9800',
  SUCCESS: '#4CAF50',

  PRIORITY: {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#9C27B0',
  },

  TEXT: {
    PRIMARY: '#212121',
    SECONDARY: '#757575',
    DISABLED: '#BDBDBD',
  },

  BACKGROUND: {
    PRIMARY: '#FFFFFF',
    SECONDARY: '#F5F5F5',
    CARD: '#FFFFFF',
  },
} as const;
