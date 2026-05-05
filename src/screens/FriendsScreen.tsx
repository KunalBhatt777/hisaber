import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useFriendsViewModel } from '../viewmodels/useFriendsViewModel';
import { UserProfile } from '../types';

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = useAppTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryLight,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.4 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function UserRow({
  user,
  action,
}: {
  user: UserProfile;
  action: React.ReactNode;
}) {
  const colors = useAppTheme();
  return (
    <View style={[styles.userRow, { backgroundColor: colors.card }]}>
      <Avatar name={user.displayName} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{user.displayName}</Text>
        <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{user.username}</Text>
      </View>
      {action}
    </View>
  );
}

export default function FriendsScreen() {
  const colors = useAppTheme();
  const vm = useFriendsViewModel();

  const confirmRemove = (friend: UserProfile) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => vm.removeFriendById(friend.uid),
        },
      ],
    );
  };

  const isAlreadyFriend = (uid: string) => vm.friends.some((f) => f.uid === uid);
  const hasSentRequest = (uid: string) => vm.outgoingRequests.some((r) => r.uid === uid);
  const hasIncomingRequest = (uid: string) => vm.incomingRequests.some((r) => r.uid === uid);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search username, email, or phone…"
            placeholderTextColor={colors.textSecondary}
            value={vm.searchQuery}
            onChangeText={vm.setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={vm.runSearch}
          />
          {vm.searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : vm.searchQuery.length > 0 ? (
            <TouchableOpacity onPress={vm.runSearch}>
              <Text style={[styles.searchGoText, { color: colors.primary }]}>Go</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'main'}
        renderItem={null}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <>
            {/* Search results */}
            {vm.searchResults.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SEARCH RESULTS</Text>
                {vm.searchResults.map((user) => (
                  <UserRow
                    key={user.uid}
                    user={user}
                    action={
                      isAlreadyFriend(user.uid) ? (
                        <Text style={[styles.tagText, { color: colors.success }]}>Friends</Text>
                      ) : hasSentRequest(user.uid) || hasIncomingRequest(user.uid) ? (
                        <Text style={[styles.tagText, { color: colors.textSecondary }]}>Requested</Text>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.primary }]}
                          onPress={() => vm.sendRequest(user.uid)}
                        >
                          <Ionicons name="person-add-outline" size={16} color="#FFF" />
                        </TouchableOpacity>
                      )
                    }
                  />
                ))}
              </>
            )}

            {/* Requests sent */}
            {vm.outgoingRequests.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  REQUESTS SENT ({vm.outgoingRequests.length})
                </Text>
                {vm.outgoingRequests.map((user) => (
                  <UserRow
                    key={user.uid}
                    user={user}
                    action={
                      <View style={styles.pendingTag}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.pendingText, { color: colors.textSecondary }]}>Pending</Text>
                        <TouchableOpacity
                          onPress={() => vm.cancelRequest(user.uid)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ marginLeft: 8 }}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    }
                  />
                ))}
              </>
            )}

            {/* Incoming requests */}
            {vm.incomingRequests.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  FRIEND REQUESTS ({vm.incomingRequests.length})
                </Text>
                {vm.incomingRequests.map((user) => (
                  <UserRow
                    key={user.uid}
                    user={user}
                    action={
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: colors.success }]}
                          onPress={() => vm.acceptRequest(user.uid)}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: colors.danger }]}
                          onPress={() => vm.declineRequest(user.uid)}
                        >
                          <Ionicons name="close" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    }
                  />
                ))}
              </>
            )}

            {/* Friends list */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              MY FRIENDS ({vm.friends.length})
            </Text>
            {vm.loading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            )}
            {!vm.loading && vm.friends.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Search by username, email, or phone to add friends.
                </Text>
              </View>
            )}
            {vm.friends.map((friend) => (
              <UserRow
                key={friend.uid}
                user={friend}
                action={
                  <TouchableOpacity onPress={() => confirmRemove(friend)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                }
              />
            ))}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 2 },
  searchGoText: { fontSize: 14, fontWeight: '700', paddingLeft: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600' },
  userHandle: { fontSize: 13, marginTop: 1 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { fontSize: 13, fontWeight: '600' },
  pendingTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingText: { fontSize: 13, fontWeight: '500' },
  emptyContainer: {
    paddingHorizontal: 32,
    paddingTop: 32,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
