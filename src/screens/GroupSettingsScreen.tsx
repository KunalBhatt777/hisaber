import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useGroupSettingsViewModel } from '../viewmodels/useGroupSettingsViewModel';
import { HomeStackParamList } from '../types';
import { auth } from '../firebase/config';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'GroupSettings'>;
  route: RouteProp<HomeStackParamList, 'GroupSettings'>;
};

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = useAppTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function GroupSettingsScreen({ route }: Props) {
  const { groupId } = route.params;
  const colors = useAppTheme();
  const vm = useGroupSettingsViewModel(groupId);
  const currentUid = auth.currentUser?.uid ?? '';

  const isAdmin = vm.group?.createdBy === currentUid;

  const canAddTax = (() => {
    const parsed = parseFloat(vm.newTaxValue.trim());
    return !isNaN(parsed) && parsed > 0 && parsed <= 100;
  })();

  const confirmRemoveMember = (uid: string, name: string) => {
    if (uid === currentUid) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself from the group.');
      return;
    }
    Alert.alert(
      'Remove Member',
      `Remove "${name}" from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => vm.removeMember(uid) },
      ],
    );
  };

  const confirmRemoveTax = (value: number) => {
    if (vm.taxOptions.length <= 1) return;
    Alert.alert(
      'Remove Tax Bracket',
      `Remove ${value}% from this group's tax brackets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => vm.removeTaxOption(value) },
      ],
    );
  };

  const members = vm.group ? Object.entries(vm.group.members) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {vm.loading && !vm.group ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => 'main'}
          renderItem={null}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* ── Group Name ───────────────────────────────────────── */}
              <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GROUP NAME</Text>
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={vm.groupNameDraft}
                  onChangeText={vm.setGroupNameDraft}
                  returnKeyType="done"
                  onSubmitEditing={vm.saveGroupName}
                  onBlur={vm.saveGroupName}
                />
              </View>

              {/* ── Settings ─────────────────────────────────────────── */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SETTINGS</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Simplify Debts</Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                      Minimize number of transactions in summary
                    </Text>
                  </View>
                  {vm.saving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Switch
                      value={vm.simplifyDebts}
                      onValueChange={vm.toggleSimplifyDebts}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFFFFF"
                      disabled={vm.saving}
                    />
                  )}
                </View>
              </View>

              {/* ── Tax Brackets ─────────────────────────────────────── */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TAX BRACKETS</Text>
              <View style={[styles.taxCard, { backgroundColor: colors.surface }]}>
                {vm.taxOptions.map((value, index) => (
                  <View key={value}>
                    <View style={styles.taxBracketRow}>
                      <View style={[styles.taxBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.taxBadgeText, { color: colors.primary }]}>{value}%</Text>
                      </View>
                      <Text style={[styles.taxLabel, { color: colors.text }]}>{value}% tax rate</Text>
                      <TouchableOpacity
                        onPress={() => confirmRemoveTax(value)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        disabled={vm.taxOptions.length <= 1 || vm.saving}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={vm.taxOptions.length <= 1 || vm.saving ? colors.border : colors.danger}
                        />
                      </TouchableOpacity>
                    </View>
                    {index < vm.taxOptions.length - 1 && (
                      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                    )}
                  </View>
                ))}
                <View style={[styles.separator, { backgroundColor: colors.separator, marginTop: 4 }]} />
                <View style={styles.addTaxRow}>
                  <TextInput
                    style={[styles.addTaxInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="New bracket %"
                    placeholderTextColor={colors.textSecondary}
                    value={vm.newTaxValue}
                    onChangeText={vm.setNewTaxValue}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={vm.addTaxOption}
                  />
                  <TouchableOpacity
                    onPress={vm.addTaxOption}
                    style={[styles.addTaxBtn, { backgroundColor: canAddTax && !vm.saving ? colors.primary : colors.border }]}
                    disabled={!canAddTax || vm.saving}
                  >
                    {vm.saving
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Ionicons name="add" size={20} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Members ──────────────────────────────────────────── */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                MEMBERS ({members.length})
              </Text>

              {/* Current members */}
              <View style={[styles.membersCard, { backgroundColor: colors.surface }]}>
                {members.map(([uid, m], index) => (
                  <View key={uid}>
                    <View style={styles.memberRow}>
                      <Avatar name={m.displayName} />
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={[styles.memberName, { color: colors.text }]}>{m.displayName}</Text>
                          {uid === vm.group?.createdBy && (
                            <View style={[styles.adminBadge, { backgroundColor: colors.primaryLight }]}>
                              <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Admin</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>@{m.username}</Text>
                      </View>
                      {uid === currentUid ? (
                        <Text style={[styles.youTag, { color: colors.primary }]}>You</Text>
                      ) : isAdmin ? (
                        <TouchableOpacity
                          onPress={() => confirmRemoveMember(uid, m.displayName)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          disabled={vm.saving}
                        >
                          <Ionicons name="remove-circle-outline" size={22} color={vm.saving ? colors.border : colors.danger} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {index < members.length - 1 && (
                      <View style={[styles.separator, { backgroundColor: colors.separator, marginLeft: 60 }]} />
                    )}
                  </View>
                ))}
              </View>

              {/* Add friends section — admin only */}
              {isAdmin && vm.friends.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ADD FRIENDS</Text>
                  <View style={[styles.membersCard, { backgroundColor: colors.surface }]}>
                    {vm.friends.map((friend, index) => (
                      <View key={friend.uid}>
                        <View style={styles.memberRow}>
                          <Avatar name={friend.displayName} />
                          <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: colors.text }]}>{friend.displayName}</Text>
                            <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>@{friend.username}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: vm.saving ? colors.border : colors.primary }]}
                            onPress={() => vm.addMember(friend.uid)}
                            disabled={vm.saving}
                          >
                            {vm.saving
                              ? <ActivityIndicator size="small" color="#FFF" />
                              : <Ionicons name="add" size={18} color="#FFF" />}
                          </TouchableOpacity>
                        </View>
                        {index < vm.friends.length - 1 && (
                          <View style={[styles.separator, { backgroundColor: colors.separator, marginLeft: 60 }]} />
                        )}
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 40 },
  infoCard: { margin: 16, padding: 16, borderRadius: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  settingsCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 14, paddingHorizontal: 16 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLeft: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  taxCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  taxBracketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  taxBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, minWidth: 52, alignItems: 'center' },
  taxBadgeText: { fontSize: 13, fontWeight: '700' },
  taxLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  addTaxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  addTaxInput: { flex: 1, fontSize: 15, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10 },
  addTaxBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  membersCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 14, paddingHorizontal: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberHandle: { fontSize: 12, marginTop: 1 },
  youTag: { fontSize: 13, fontWeight: '600' },
  addBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth },
});
