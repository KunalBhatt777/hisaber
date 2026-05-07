import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useFriendsViewModel } from '../viewmodels/useFriendsViewModel';
import { UserProfile, FriendWithBalance } from '../types';
import { formatCurrency } from '../utils/formatters';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = useAppTheme();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.4 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── UserRow (search results / requests) ─────────────────────────────────────

function UserRow({ user, action }: { user: UserProfile; action: React.ReactNode }) {
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

// ─── Friend Card (expandable with balance) ────────────────────────────────────

function FriendCard({
  fw,
  expanded,
  balancesLoading,
  onToggleExpand,
  onOpenProfile,
}: {
  fw: FriendWithBalance;
  expanded: boolean;
  balancesLoading: boolean;
  onToggleExpand: () => void;
  onOpenProfile: () => void;
}) {
  const colors = useAppTheme();
  const net = fw.totalNet;
  const isSettled = Math.abs(net) < 0.005;
  const iOwe = net > 0;

  return (
    <View style={[styles.friendCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity style={styles.friendCardRow} onPress={onToggleExpand} activeOpacity={0.85}>
        <TouchableOpacity onPress={onOpenProfile} activeOpacity={0.7}>
          <Avatar name={fw.friend.displayName} size={44} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.friendInfo} onPress={onOpenProfile} activeOpacity={0.7}>
          <Text style={[styles.friendName, { color: colors.text }]}>{fw.friend.displayName}</Text>
          <Text style={[styles.friendHandle, { color: colors.textSecondary }]}>@{fw.friend.username}</Text>
        </TouchableOpacity>

        <View style={styles.friendRight}>
          {balancesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          ) : isSettled ? (
            <Text style={[styles.settledText, { color: colors.success }]}>All settled</Text>
          ) : (
            <View style={styles.balanceWrap}>
              <Text style={[styles.balanceLabel, { color: iOwe ? colors.danger : colors.success }]}>
                {iOwe ? 'you owe' : 'owes you'}
              </Text>
              <Text style={[styles.balanceAmount, { color: iOwe ? colors.danger : colors.success }]}>
                {formatCurrency(Math.abs(net))}
              </Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.breakdown, { borderTopColor: colors.separator }]}>
          {fw.sharedGroups.length === 0 ? (
            <Text style={[styles.noGroupsText, { color: colors.textSecondary }]}>
              {balancesLoading ? 'Loading…' : 'No shared groups with a balance'}
            </Text>
          ) : (
            fw.sharedGroups.map((g) => {
              const gIowe = g.net > 0;
              return (
                <View key={g.groupId} style={styles.groupRow}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.groupName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {g.groupName}
                  </Text>
                  <Text style={[styles.groupNet, { color: gIowe ? colors.danger : colors.success }]}>
                    {gIowe ? '−' : '+'}{formatCurrency(Math.abs(g.net))}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({
  visible,
  friend,
  onClose,
  onRemove,
}: {
  visible: boolean;
  friend: UserProfile | null;
  onClose: () => void;
  onRemove: () => void;
}) {
  const colors = useAppTheme();
  if (!friend) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.profileOverlay} onPress={onClose}>
        <Pressable style={[styles.profileSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.profileHandle, { backgroundColor: colors.border }]} />
          <Avatar name={friend.displayName} size={72} />
          <Text style={[styles.profileName, { color: colors.text }]}>{friend.displayName}</Text>
          <Text style={[styles.profileHandle2, { color: colors.textSecondary }]}>@{friend.username}</Text>

          <TouchableOpacity
            style={[styles.removeBtn, { borderColor: colors.danger }]}
            onPress={() => { onRemove(); onClose(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
            <Text style={[styles.removeBtnText, { color: colors.danger }]}>Remove Friend</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const colors = useAppTheme();
  const vm = useFriendsViewModel();

  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [profileFriend, setProfileFriend] = useState<UserProfile | null>(null);

  const toggleExpand = (uid: string) =>
    setExpandedUid((prev) => (prev === uid ? null : uid));

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
        contentContainerStyle={{ paddingBottom: 32 }}
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

            {vm.friendsWithBalances.map((fw) => (
              <FriendCard
                key={fw.friend.uid}
                fw={fw}
                expanded={expandedUid === fw.friend.uid}
                balancesLoading={vm.balancesLoading}
                onToggleExpand={() => toggleExpand(fw.friend.uid)}
                onOpenProfile={() => setProfileFriend(fw.friend)}
              />
            ))}

            {/* Fallback while balances haven't loaded yet */}
            {!vm.loading && vm.friends.length > 0 && vm.friendsWithBalances.length === 0 && (
              vm.friends.map((friend) => (
                <UserRow
                  key={friend.uid}
                  user={friend}
                  action={<ActivityIndicator size="small" color={colors.primary} />}
                />
              ))
            )}
          </>
        }
      />

      <ProfileModal
        visible={!!profileFriend}
        friend={profileFriend}
        onClose={() => setProfileFriend(null)}
        onRemove={() => profileFriend && vm.removeFriendById(profileFriend.uid)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // UserRow (requests / search)
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
  avatar: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600' },
  userHandle: { fontSize: 13, marginTop: 1 },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  requestActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 13, fontWeight: '600' },
  pendingTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingText: { fontSize: 13, fontWeight: '500' },

  // Friend card
  friendCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  friendCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '600' },
  friendHandle: { fontSize: 13, marginTop: 1 },
  friendRight: { flexDirection: 'row', alignItems: 'center' },
  balanceWrap: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 11, fontWeight: '600' },
  balanceAmount: { fontSize: 15, fontWeight: '700' },
  settledText: { fontSize: 13, fontWeight: '600' },

  // Breakdown
  breakdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { flex: 1, fontSize: 13 },
  groupNet: { fontSize: 13, fontWeight: '700' },
  noGroupsText: { fontSize: 13, paddingVertical: 4 },

  // Profile modal
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  profileSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  profileHandle: { width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  profileHandle2: { fontSize: 14, marginBottom: 20 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 15, fontWeight: '600' },
  closeBtn: { marginTop: 12, paddingVertical: 10 },
  closeBtnText: { fontSize: 15 },

  // Empty
  emptyContainer: { paddingHorizontal: 32, paddingTop: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
