import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import eventsReducer from './slices/eventsSlice';
import calendarsReducer from './slices/calendarsSlice';
import goalsReducer from './slices/goalsSlice';
import chatbotReducer from './slices/chatbotSlice';
import financeReducer from './slices/financeSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  events: eventsReducer,
  calendars: calendarsReducer,
  goals: goalsReducer,
  chatbot: chatbotReducer,
  finance: financeReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
