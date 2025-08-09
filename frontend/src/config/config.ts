export const config = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  EMAIL_SERVICE_URL: process.env.REACT_APP_EMAIL_SERVICE_URL || 'http://localhost:8001',
  MAILBOX_SERVICE_URL: process.env.REACT_APP_MAILBOX_SERVICE_URL || 'http://localhost:8002',
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
    GET_BY_ID: '/users/{id}',
  },
  EMAILS: {
    COMPOSE: '/emails/compose',
    LIST: '/emails',
    GET: '/emails/{id}',
    UPDATE: '/emails/{id}',
    DELETE: '/emails/{id}',
    MARK_READ: '/emails/{id}/read',
    MARK_STAR: '/emails/{id}/star',
    COUNT: '/emails/count/{folder}',
  },
  MAILBOX: {
    FOLDERS: '/folders',
    INITIALIZE_FOLDERS: '/folders/initialize',
    CREATE_FOLDER: '/folders',
    UPDATE_FOLDER: '/folders/{id}',
    DELETE_FOLDER: '/folders/{id}',
    REFRESH_COUNTS: '/folders/{id}/refresh-counts',
  },
}; 