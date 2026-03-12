// Main App Navigator - Clean navigation structure
import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';

import { LoginScreen } from '../screens/LoginScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { CreateGoalScreen } from '../screens/CreateGoalScreen';
import { EditGoalScreen } from '../screens/EditGoalScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { EditEventScreen } from '../screens/EditEventScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';

import { RootStackParamList, BottomTabParamList } from '../types/navigation';
import { COLORS } from '../constants/config';
import { logger } from '../utils/logger';
import { RootState, AppDispatch } from '../store/store';
import { checkAuthStatus } from '../store/slices/authSlice';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

// Main tab navigator (for authenticated users)
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT.SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND.PRIMARY,
          borderTopColor: COLORS.BACKGROUND.SECONDARY,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        headerStyle: {
          backgroundColor: COLORS.BACKGROUND.PRIMARY,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.TEXT.PRIMARY,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{
          title: 'Calendar',
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="📅" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="GoalsTab"
        component={GoalsScreen}
        options={{
          title: 'Goals',
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🎯" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatbotTab"
        component={ChatbotScreen}
        options={{
          title: 'AI Assistant',
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🤖" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="👤" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Simple tab icon component
const TabIcon = ({ icon, color }: { icon: string; color: string }) => (
  <Text style={{ fontSize: 24, color }}>{icon}</Text>
);

// Loading screen component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Main app navigator
export const AppNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  // Check auth status on app start
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Log navigation state changes
  useEffect(() => {
    logger.navigation('Navigation state', {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      userEmail: user?.email,
    });
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.BACKGROUND.PRIMARY },
        }}
      >
        {isAuthenticated && user ? (
          // Authenticated user flow
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="CreateGoal" 
              component={CreateGoalScreen}
              options={{
                headerShown: true,
                title: 'Create Goal',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="EditGoal" 
              component={EditGoalScreen}
              options={{
                headerShown: true,
                title: 'Edit Goal',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="CreateEvent" 
              component={CreateEventScreen}
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="EditEvent" 
              component={EditEventScreen}
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="EventDetail" 
              component={EventDetailScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </>
        ) : (
          // Unauthenticated user flow
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
  },
});