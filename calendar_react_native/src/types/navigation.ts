// Navigation types - TypeScript navigation parameters (like function signatures!)
import { Goal, Calendar, Event } from './index';

// Stack navigation types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Goals: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  // Modal screens that can be opened from anywhere
  GoalDetail: { goal: Goal };
  GoalForm: { goal?: Goal }; // undefined for new goal, Goal for editing
  CreateGoal: undefined;
  EditGoal: { goal: Goal };
  CreateEvent: { date?: string };
  EditEvent: { event: Event };
  EventDetail: { event: Event };
  EventForm: { event?: Event };
  CalendarForm: { calendar?: Calendar };
};

// Bottom tab navigation
export type BottomTabParamList = {
  HomeTab: undefined;
  GoalsTab: undefined;
  ChatbotTab: undefined;
  ProfileTab: undefined;
};

// Root navigation (combines auth and main)
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
} & AppStackParamList;