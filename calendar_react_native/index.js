/**
 * @format
 */

import 'react-native-gesture-handler'; // Must be at the top
import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Register background event handler for notifications
// MUST be at top level (outside React components) for notifications to work when app is killed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  console.log('Background notification event:', type, notification?.id);

  if (type === EventType.PRESS) {
    // User pressed the notification
    console.log('User pressed notification:', notification?.data?.eventId);
  }

  if (type === EventType.DISMISSED) {
    // User dismissed the notification
    console.log('User dismissed notification:', notification?.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
