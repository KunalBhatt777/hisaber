import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import FAB from '../components/FAB';
import { Group, HomeStackParamList, UserProfile } from '../types';
import { formatCurrency } from '../utils/formatters';
import { auth } from '../firebase/config';
import {
  getGroups,
  createGroup,
  deleteGroup,
  getExpenses,
  getUserProfile,
  getFriends,
} from '../firebase/firestore';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onPress,
  onDelete,
}: {
  group: Group;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useAppTheme();
  const memberCount = Object.keys(group.members).length;

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        onPress={onDelete}
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      >
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[styles.groupIcon, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.groupIconText, { color: colors.primary }]}>
            {group.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
            {group.expenseCount !== undefined
              ? ` · ${group.expenseCount} ${group.expenseCount === 1 ? 'item' : 'items'}`
              : ''}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {group.total !== undefined && group.total > 0 && (
            <Text style={[styles.cardTotal, { color: colors.primary }]}>
              {formatCurrency(group.total)}
            </Text>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Create Group Modal ───────────────────────────────────────────────────────

function CreateGroupModal({
  visible,
  friends,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  friends: UserProfile[];
  onConfirm: (name: string, memberUids: string[]) => void;
  onCancel: () => void;
}) {
  const colors = useAppTheme();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed, Array.from(selected));
    setName('');
    setSelected(new Set());
  };

  const handleCancel = () => {
    setName('');
    setSelected(new Set());
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={handleCancel}>
        <Pressable
          style={[styles.modalBox, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Group</Text>

          <TextInput
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Group name (e.g. Vegas Trip)"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
          />

          {friends.length > 0 && (
            <>
              <Text style={[styles.memberLabel, { color: colors.textSecondary }]}>ADD FRIENDS</Text>
              {friends.map((f) => (
                <TouchableOpacity
                  key={f.uid}
                  style={styles.friendRow}
                  onPress={() => toggle(f.uid)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.friendAvatarText, { color: colors.primary }]}>
                      {f.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.friendName, { color: colors.text }]}>{f.displayName}</Text>
                  <Ionicons
                    name={selected.has(f.uid) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected.has(f.uid) ? colors.primary : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={handleCancel} style={styles.modalBtn}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.5 }]}
              disabled={!name.trim()}
            >
              <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Create</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useAppTheme();

  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const uid = auth.currentUser?.uid ?? '';

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [rawGroups, profile, userFriends] = await Promise.all([
        getGroups(uid),
        getUserProfile(uid),
        getFriends(uid),
      ]);

      // Fetch expense counts + totals for each group
      const enriched = await Promise.all(
        rawGroups.map(async (g) => {
          const expenses = await getExpenses(g.id);
          return {
            ...g,
            expenseCount: expenses.length,
            total: expenses.reduce((s, e) => s + e.totalPrice, 0),
          };
        }),
      );

      setGroups(enriched);
      setUserProfile(profile);
      setFriends(userFriends);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleCreate = async (name: string, memberUids: string[]) => {
    if (!userProfile) return;
    setShowModal(false);
    try {
      const groupId = await createGroup(
        uid,
        { displayName: userProfile.displayName, username: userProfile.username },
        name,
        memberUids,
      );
      await refresh();
      navigation.navigate('Group', { groupId, groupName: name });
    } catch (e) {
      Alert.alert('Error', 'Failed to create group.');
    }
  };

  const confirmDelete = (group: Group) => {
    Alert.alert(
      'Delete Group',
      `Delete "${group.name}"? All expenses will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(group.id);
            await refresh();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.appTitle, { color: colors.primary }]}>Centsible</Text>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {userProfile ? `Welcome, ${userProfile.displayName.split(' ')[0]}` : 'Welcome'}
        </Text>
      </View>

      {loading && groups.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Tap + to create your first expense group
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <GroupCard
                group={item}
                onPress={() =>
                  navigation.navigate('Group', { groupId: item.id, groupName: item.name })
                }
                onDelete={() => confirmDelete(item)}
              />
            )}
          />
        </>
      )}

      <FAB onPress={() => setShowModal(true)} />

      <CreateGroupModal
        visible={showModal}
        friends={friends}
        onConfirm={handleCreate}
        onCancel={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  appTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  greeting: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  groupIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupIconText: { fontSize: 20, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  cardTotal: { fontSize: 15, fontWeight: '700' },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginLeft: 6 },
  deleteActionText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '88%',
    maxHeight: '75%',
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  memberLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: { fontSize: 14, fontWeight: '700' },
  friendName: { flex: 1, fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
