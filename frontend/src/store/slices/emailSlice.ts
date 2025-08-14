import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Email } from '../../types/email';

interface EmailCache {
  [folderId: string]: {
    emails: Email[];
    lastFetched: number;
    total: number;
    hasMore: boolean;
    page: number;
  };
}

interface EmailState {
  cache: EmailCache;
  currentFolder: string;
  loading: boolean;
  error: string | null;
}

const initialState: EmailState = {
  cache: {},
  currentFolder: '',
  loading: false,
  error: null,
};

const emailSlice = createSlice({
  name: 'email',
  initialState,
  reducers: {
    setCurrentFolder: (state, action: PayloadAction<string>) => {
      state.currentFolder = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    cacheEmails: (state, action: PayloadAction<{
      folderId: string;
      emails: Email[];
      total: number;
      hasMore: boolean;
      page: number;
    }>) => {
      const { folderId, emails, total, hasMore, page } = action.payload;
      
      if (page === 1) {
        // Replace cache for first page
        state.cache[folderId] = {
          emails,
          lastFetched: Date.now(),
          total,
          hasMore,
          page,
        };
      } else {
        // Append to existing cache for pagination
        if (state.cache[folderId]) {
          state.cache[folderId].emails = [...state.cache[folderId].emails, ...emails];
          state.cache[folderId].hasMore = hasMore;
          state.cache[folderId].page = page;
          state.cache[folderId].lastFetched = Date.now();
        }
      }
    },
    updateEmailInCache: (state, action: PayloadAction<{
      emailId: string;
      updates: Partial<Email>;
    }>) => {
      const { emailId, updates } = action.payload;
      
      // Update email in all cached folders
      Object.keys(state.cache).forEach(folderId => {
        const emailIndex = state.cache[folderId].emails.findIndex(e => e.id === emailId);
        if (emailIndex !== -1) {
          state.cache[folderId].emails[emailIndex] = {
            ...state.cache[folderId].emails[emailIndex],
            ...updates,
          };
        }
      });
    },
    removeEmailFromCache: (state, action: PayloadAction<string>) => {
      const emailId = action.payload;
      
      // Remove email from all cached folders
      Object.keys(state.cache).forEach(folderId => {
        state.cache[folderId].emails = state.cache[folderId].emails.filter(e => e.id !== emailId);
      });
    },
    clearCache: (state) => {
      state.cache = {};
    },
    clearFolderCache: (state, action: PayloadAction<string>) => {
      const folderId = action.payload;
      delete state.cache[folderId];
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { 
  setCurrentFolder, 
  setLoading, 
  cacheEmails, 
  updateEmailInCache,
  removeEmailFromCache,
  clearCache, 
  clearFolderCache,
  setError 
} = emailSlice.actions;

export default emailSlice.reducer;
