import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase/config';
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  getGroups,
  getExpenses,
  getPayments,
  searchUsers,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getUserProfile,
} from '../firebase/firestore';
import { UserProfile, FriendWithBalance, GroupBalance } from '../types';
import { computeNetBetweenTwo } from '../utils/balanceCalculator';
import {
  sendFriendRequestNotification,
  sendFriendAcceptedNotification,
  sendFriendRemovedNotification,
} from '../utils/pushNotifications';

export interface FriendsViewModel {
  friends: UserProfile[];
  friendsWithBalances: FriendWithBalance[];
  incomingRequests: UserProfile[];
  outgoingRequests: UserProfile[];
  searchResults: UserProfile[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loading: boolean;
  balancesLoading: boolean;
  searching: boolean;
  actionLoading: boolean;
  runSearch: () => Promise<void>;
  sendRequest: (toUid: string) => Promise<void>;
  cancelRequest: (toUid: string) => Promise<void>;
  acceptRequest: (fromUid: string) => Promise<void>;
  declineRequest: (fromUid: string) => Promise<void>;
  removeFriendById: (uid: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFriendsViewModel(): FriendsViewModel {
  const uid = auth.currentUser?.uid ?? '';
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendsWithBalances, setFriendsWithBalances] = useState<FriendWithBalance[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBalances = useCallback(async (friendList: UserProfile[]) => {
    if (!uid || !friendList.length) {
      setFriendsWithBalances(friendList.map((f) => ({ friend: f, totalNet: 0, sharedGroups: [] })));
      return;
    }
    setBalancesLoading(true);
    try {
      const groups = await getGroups(uid);

      // Fetch expenses + payments for every group in parallel
      const groupData = await Promise.all(
        groups.map(async (g) => {
          const [exps, pmts] = await Promise.all([getExpenses(g.id), getPayments(g.id)]);
          return { group: g, expenses: exps, payments: pmts };
        }),
      );

      const result: FriendWithBalance[] = friendList.map((friend) => {
        const shared = groupData.filter((gd) => gd.group.memberIds.includes(friend.uid));

        const sharedGroups: GroupBalance[] = shared
          .map((gd) => ({
            groupId: gd.group.id,
            groupName: gd.group.name,
            net: computeNetBetweenTwo(gd.expenses, gd.payments, uid, friend.uid),
          }))
          .filter((g) => Math.abs(g.net) > 0.005);

        const totalNet = parseFloat(
          sharedGroups.reduce((sum, g) => sum + g.net, 0).toFixed(2),
        );

        return { friend, totalNet, sharedGroups };
      });

      setFriendsWithBalances(result);
    } finally {
      setBalancesLoading(false);
    }
  }, [uid]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [f, r, o] = await Promise.all([
        getFriends(uid),
        getIncomingRequests(uid),
        getOutgoingRequests(uid),
      ]);
      setFriends(f);
      setIncomingRequests(r);
      setOutgoingRequests(o);
      // Kick off balance load without blocking the friends list render
      loadBalances(f);
    } finally {
      setLoading(false);
    }
  }, [uid, loadBalances]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchUsers(q);
      setSearchResults(results.filter((u) => u.uid !== uid));
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (toUid: string) => {
    setActionLoading(true);
    try {
      await sendFriendRequest(uid, toUid);
      setSearchResults([]);
      setSearchQuery('');
      await refresh();
      getUserProfile(toUid).then((profile) => {
        if (profile?.pushToken) {
          sendFriendRequestNotification(profile.pushToken, auth.currentUser?.displayName ?? 'Someone');
        }
      });
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async (toUid: string) => {
    setActionLoading(true);
    try {
      await cancelFriendRequest(uid, toUid);
      await refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const acceptRequest = async (fromUid: string) => {
    setActionLoading(true);
    try {
      await acceptFriendRequest(uid, fromUid);
      await refresh();
      getUserProfile(fromUid).then((profile) => {
        if (profile?.pushToken) {
          sendFriendAcceptedNotification(profile.pushToken, auth.currentUser?.displayName ?? 'Someone');
        }
      });
    } finally {
      setActionLoading(false);
    }
  };

  const declineRequest = async (fromUid: string) => {
    setActionLoading(true);
    try {
      await declineFriendRequest(uid, fromUid);
      await refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const removeFriendById = async (friendUid: string) => {
    setActionLoading(true);
    try {
      await removeFriend(uid, friendUid);
      await refresh();
      getUserProfile(friendUid).then((profile) => {
        if (profile?.pushToken) {
          sendFriendRemovedNotification(profile.pushToken, auth.currentUser?.displayName ?? 'Someone');
        }
      });
    } finally {
      setActionLoading(false);
    }
  };

  return {
    friends,
    friendsWithBalances,
    incomingRequests,
    outgoingRequests,
    searchResults,
    searchQuery,
    setSearchQuery,
    loading,
    balancesLoading,
    searching,
    actionLoading,
    runSearch,
    sendRequest,
    cancelRequest,
    acceptRequest,
    declineRequest,
    removeFriendById,
    refresh,
  };
}
