export const config = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  WS_BASE_URL: process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8000',
  STORAGE_KEY: 'gmail_clone_token',
  DEFAULT_PAGE_SIZE: 20,
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/token',
    REGISTER: '/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/me',
  },
  USERS: {
    PROFILE: '/users/profile',
    SETTINGS: '/users/settings',
  },
  EMAILS: {
    SEND: '/emails/send',
    LIST: '/emails',
    GET: '/emails/{id}',
    DELETE: '/emails/{id}',
    MARK_READ: '/emails/{id}/read',
  },
  MAILBOX: {
    FOLDERS: '/mailbox/folders',
    LABELS: '/mailbox/labels',
    SEARCH: '/mailbox/search',
  },
}; 