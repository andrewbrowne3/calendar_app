/**
 * Calendar App - React Native with TypeScript
 * Clean, fast, and functional!
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { AppNavigator } from './src/navigation/AppNavigator';
import { store, persistor } from './src/store/store';
import { COLORS } from './src/constants/config';
import notificationService from './src/services/notificationService';
import { logger } from './src/utils/logger';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize notification service on app startup
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        logger.info('App: Initializing notification service');
        await notificationService.initialize();

        // Request permissions
        const hasPermission = await notificationService.checkPermissions();
        if (!hasPermission) {
          logger.info('App: Requesting notification permissions');
          const granted = await notificationService.requestPermissions();
          logger.info('App: Notification permission granted:', granted);
        } else {
          logger.info('App: Notification permissions already granted');
        }
      } catch (error) {
        logger.error('App: Failed to initialize notifications', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={COLORS.BACKGROUND.PRIMARY}
          />
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
