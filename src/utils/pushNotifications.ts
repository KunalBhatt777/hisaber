import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { updatePushToken } from '../firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(uid: string): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    console.log('[Push] Permission status:', existing);

    let status = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
      console.log('[Push] After request:', status);
    }

    if (status !== 'granted') {
      console.warn('[Push] Permission not granted — notifications disabled');
      return;
    }

    const projectId =
      (Constants.easConfig as { projectId?: string } | null)?.projectId ??
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

    console.log('[Push] projectId:', projectId);
    if (!projectId) {
      console.warn('[Push] No projectId found — cannot get push token');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Token obtained:', token);

    await updatePushToken(uid, token);
    console.log('[Push] Token saved to Firestore for uid:', uid);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
      console.log('[Push] Android notification channel set');
    }
  } catch (e) {
    console.error('[Push] Registration error:', e);
  }
}

export async function sendExpenseNotification(
  tokens: string[],
  paidByName: string,
  groupId: string,
  groupName: string,
  itemName: string,
  totalPrice: number,
): Promise<void> {
  const valid = tokens.filter(Boolean);
  console.log('[Push] Sending to tokens:', valid);
  if (!valid.length) {
    console.warn('[Push] No valid tokens — skipping send');
    return;
  }

  const messages = valid.map((to) => ({
    to,
    sound: 'default',
    title: `${itemName} · $${totalPrice.toFixed(2)}`,
    body: `${paidByName} added an expense in ${groupName}`,
    data: { groupId, groupName },
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const text = await res.text();
    console.log('[Push] Expo API status:', res.status, 'body:', text);
  } catch (e) {
    console.error('[Push] Send error:', e);
  }
}
