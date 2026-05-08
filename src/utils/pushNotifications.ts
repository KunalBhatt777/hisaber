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

// ─── Registration ─────────────────────────────────────────────────────────────

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

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function pushSend(messages: object[]): Promise<void> {
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

function buildMessages(
  tokens: string[],
  title: string,
  body: string,
  data: object = {},
): object[] {
  return tokens.filter(Boolean).map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
  }));
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export async function sendExpenseNotification(
  tokens: string[],
  paidByName: string,
  groupId: string,
  groupName: string,
  itemName: string,
  totalPrice: number,
): Promise<void> {
  const valid = tokens.filter(Boolean);
  console.log('[Push] Sending expense to tokens:', valid);
  if (!valid.length) {
    console.warn('[Push] No valid tokens — skipping send');
    return;
  }
  await pushSend(
    buildMessages(
      valid,
      `${itemName} · $${totalPrice.toFixed(2)}`,
      `${paidByName} added an expense in ${groupName}`,
      { type: 'group', groupId, groupName },
    ),
  );
}

// ─── Group ────────────────────────────────────────────────────────────────────

export async function sendGroupCreatedNotification(
  tokens: string[],
  creatorName: string,
  groupName: string,
  groupId: string,
): Promise<void> {
  const valid = tokens.filter(Boolean);
  console.log('[Push] Sending GroupCreated to tokens:', valid);
  if (!valid.length) return;
  await pushSend(
    buildMessages(valid, groupName, `${creatorName} created a group`, { type: 'group', groupId, groupName }),
  );
}

export async function sendAddedToGroupNotification(
  token: string,
  adderName: string,
  groupName: string,
  groupId: string,
): Promise<void> {
  if (!token) return;
  console.log('[Push] Sending AddedToGroup to token:', token);
  await pushSend(
    buildMessages([token], groupName, `${adderName} added you to ${groupName}`, { type: 'group', groupId, groupName }),
  );
}

export async function sendRemovedFromGroupNotification(
  token: string,
  groupName: string,
): Promise<void> {
  if (!token) return;
  console.log('[Push] Sending RemovedFromGroup to token:', token);
  await pushSend(
    buildMessages([token], groupName, `You were removed from ${groupName}`, {}),
  );
}

export async function sendExpenseEditedNotification(
  tokens: string[],
  editorName: string,
  groupId: string,
  groupName: string,
  itemName: string,
): Promise<void> {
  const valid = tokens.filter(Boolean);
  console.log('[Push] Sending ExpenseEdited to tokens:', valid);
  if (!valid.length) return;
  await pushSend(
    buildMessages(
      valid,
      `${itemName} · updated`,
      `${editorName} updated an expense in ${groupName}`,
      { type: 'group', groupId, groupName },
    ),
  );
}

export async function sendExpenseDeletedNotification(
  tokens: string[],
  deleterName: string,
  groupId: string,
  groupName: string,
  itemName: string,
): Promise<void> {
  const valid = tokens.filter(Boolean);
  console.log('[Push] Sending ExpenseDeleted to tokens:', valid);
  if (!valid.length) return;
  await pushSend(
    buildMessages(
      valid,
      `${itemName} · deleted`,
      `${deleterName} deleted an expense in ${groupName}`,
      { type: 'group', groupId, groupName },
    ),
  );
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export async function sendPaymentNotification(
  tokens: string[],
  payerName: string,
  payeeName: string,
  amount: number,
  groupName: string,
  groupId: string,
): Promise<void> {
  const valid = tokens.filter(Boolean);
  console.log('[Push] Sending Payment to tokens:', valid);
  if (!valid.length) return;
  await pushSend(
    buildMessages(
      valid,
      groupName,
      `${payerName} paid ${payeeName} $${amount.toFixed(2)}`,
      { type: 'group', groupId, groupName },
    ),
  );
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function sendFriendRequestNotification(
  token: string,
  senderName: string,
): Promise<void> {
  if (!token) return;
  console.log('[Push] Sending FriendRequest to token:', token);
  await pushSend(
    buildMessages([token], '', `${senderName} sent you a Friend Request`, { type: 'friend' }),
  );
}

export async function sendFriendAcceptedNotification(
  token: string,
  acceptorName: string,
): Promise<void> {
  if (!token) return;
  console.log('[Push] Sending FriendAccepted to token:', token);
  await pushSend(
    buildMessages([token], `${acceptorName} accepted your Friend Request`, '', { type: 'friend' }),
  );
}

export async function sendFriendRemovedNotification(
  token: string,
  removerName: string,
): Promise<void> {
  if (!token) return;
  console.log('[Push] Sending FriendRemoved to token:', token);
  await pushSend(
    buildMessages([token], `${removerName} removed you as a friend`, '', { type: 'friend' }),
  );
}
