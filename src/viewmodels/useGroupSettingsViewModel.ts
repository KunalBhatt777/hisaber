import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getGroup,
  updateGroupName,
  updateGroupTaxOptions,
  updateGroupSimplifyDebts,
  addMemberToGroup,
  removeMemberFromGroup,
  getFriends,
  getUserProfile,
} from '../firebase/firestore';
import { auth } from '../firebase/config';
import { Group, UserProfile } from '../types';
import {
  sendAddedToGroupNotification,
  sendRemovedFromGroupNotification,
} from '../utils/pushNotifications';

export interface GroupSettingsViewModel {
  group: Group | null;
  groupNameDraft: string;
  setGroupNameDraft: (v: string) => void;
  saveGroupName: () => Promise<void>;
  taxOptions: number[];
  newTaxValue: string;
  setNewTaxValue: (v: string) => void;
  addTaxOption: () => Promise<void>;
  removeTaxOption: (value: number) => Promise<void>;
  simplifyDebts: boolean;
  toggleSimplifyDebts: () => Promise<void>;
  friends: UserProfile[];
  addMember: (uid: string) => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useGroupSettingsViewModel(groupId: string): GroupSettingsViewModel {
  const uid = auth.currentUser?.uid ?? '';
  const [group, setGroup] = useState<Group | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [taxOptions, setTaxOptions] = useState<number[]>([]);
  const [newTaxValue, setNewTaxValue] = useState('');
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [g, userFriends] = await Promise.all([
        getGroup(groupId),
        getFriends(uid),
      ]);
      if (g) {
        setGroup(g);
        setGroupNameDraft(g.name);
        setTaxOptions(g.enabledTaxOptions);
        setSimplifyDebts(g.simplifyDebts);
      }
      // Only show friends not already in the group
      const memberUids = new Set(g ? Object.keys(g.members) : []);
      setFriends(userFriends.filter((f) => !memberUids.has(f.uid)));
    } finally {
      setLoading(false);
    }
  }, [groupId, uid]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const saveGroupName = useCallback(async () => {
    const name = groupNameDraft.trim();
    if (!name || name === group?.name) return;
    await updateGroupName(groupId, name);
    setGroup((prev) => prev ? { ...prev, name } : prev);
  }, [groupId, groupNameDraft, group]);

  const addTaxOption = useCallback(async () => {
    const parsed = parseFloat(newTaxValue.trim());
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) return;
    if (taxOptions.includes(parsed)) return;
    const newOptions = [...taxOptions, parsed].sort((a, b) => a - b);
    await updateGroupTaxOptions(groupId, newOptions);
    setTaxOptions(newOptions);
    setNewTaxValue('');
  }, [groupId, newTaxValue, taxOptions]);

  const removeTaxOption = useCallback(async (value: number) => {
    if (taxOptions.length <= 1) return;
    const newOptions = taxOptions.filter((v) => v !== value);
    await updateGroupTaxOptions(groupId, newOptions);
    setTaxOptions(newOptions);
  }, [groupId, taxOptions]);

  const toggleSimplifyDebts = useCallback(async () => {
    const next = !simplifyDebts;
    await updateGroupSimplifyDebts(groupId, next);
    setSimplifyDebts(next);
    setGroup((prev) => prev ? { ...prev, simplifyDebts: next } : prev);
  }, [groupId, simplifyDebts]);

  const addMember = useCallback(async (memberUid: string) => {
    const currentGroupName = group?.name ?? '';
    await addMemberToGroup(groupId, memberUid);
    await refresh();
    getUserProfile(memberUid).then((profile) => {
      if (profile?.pushToken) {
        sendAddedToGroupNotification(
          profile.pushToken,
          auth.currentUser?.displayName ?? 'Someone',
          currentGroupName,
          groupId,
        );
      }
    });
  }, [groupId, refresh, group]);

  const removeMember = useCallback(async (memberUid: string) => {
    const currentGroupName = group?.name ?? '';
    await removeMemberFromGroup(groupId, memberUid);
    await refresh();
    getUserProfile(memberUid).then((profile) => {
      if (profile?.pushToken) {
        sendRemovedFromGroupNotification(profile.pushToken, currentGroupName);
      }
    });
  }, [groupId, refresh, group]);

  return {
    group,
    groupNameDraft,
    setGroupNameDraft,
    saveGroupName,
    taxOptions,
    newTaxValue,
    setNewTaxValue,
    addTaxOption,
    removeTaxOption,
    simplifyDebts,
    toggleSimplifyDebts,
    friends,
    addMember,
    removeMember,
    loading,
    refresh,
  };
}
