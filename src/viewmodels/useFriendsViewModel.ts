import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase/config';
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  searchUsers,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '../firebase/firestore';
import { UserProfile } from '../types';

export interface FriendsViewModel {
  friends: UserProfile[];
  incomingRequests: UserProfile[];
  outgoingRequests: UserProfile[];
  searchResults: UserProfile[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loading: boolean;
  searching: boolean;
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
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, [uid]);

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
      // Exclude self
      setSearchResults(results.filter((u) => u.uid !== uid));
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (toUid: string) => {
    await sendFriendRequest(uid, toUid);
    setSearchResults([]);
    setSearchQuery('');
    await refresh();
  };

  const cancelRequest = async (toUid: string) => {
    await cancelFriendRequest(uid, toUid);
    await refresh();
  };

  const acceptRequest = async (fromUid: string) => {
    await acceptFriendRequest(uid, fromUid);
    await refresh();
  };

  const declineRequest = async (fromUid: string) => {
    await declineFriendRequest(uid, fromUid);
    await refresh();
  };

  const removeFriendById = async (friendUid: string) => {
    await removeFriend(uid, friendUid);
    await refresh();
  };

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,
    searchQuery,
    setSearchQuery,
    loading,
    searching,
    runSearch,
    sendRequest,
    cancelRequest,
    acceptRequest,
    declineRequest,
    removeFriendById,
    refresh,
  };
}
