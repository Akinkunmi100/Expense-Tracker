import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// How notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulator/emulator — notifications won't work natively
    console.warn('[Notifications] Must use physical device for push notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SpendWise Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  return true;
}

/**
 * Schedule a daily spending reminder at a given hour (24h format).
 * Default: 8:00 PM (20:00)
 */
export async function scheduleDailyReminder(hour = 20, minute = 0): Promise<string | null> {
  try {
    // Cancel any existing daily reminder first to avoid duplicates
    await cancelDailyReminder();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💸 SpendWise Reminder',
        body: "Don't forget to log your expenses for today!",
        sound: true,
        data: { type: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log('[Notifications] Daily reminder scheduled, id:', id);
    return id;
  } catch (e) {
    console.error('[Notifications] Failed to schedule daily reminder:', e);
    return null;
  }
}

/**
 * Cancel the daily spending reminder.
 */
export async function cancelDailyReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const daily = scheduled.filter(
    (n) => n.content.data?.type === 'daily_reminder'
  );
  await Promise.all(daily.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * Send an immediate local notification (e.g., after a recurring expense auto-logs).
 */
export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // fire immediately
  });
}
