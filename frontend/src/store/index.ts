import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import emailReducer from './slices/emailSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    email: emailReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 