import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Group, GroupExpense, UserProfile } from '../types';

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

export async function searchUsers(term: string): Promise<UserProfile[]> {
  const lower = term.toLowerCase().trim();
  const results: UserProfile[] = [];

  // Search by username
  const byUsername = await getDocs(
    query(collection(db, 'users'), where('username', '==', lower)),
  );
  byUsername.forEach((d) => results.push({ uid: d.id, ...d.data() } as UserProfile));

  // Search by email
  const byEmail = await getDocs(
    query(collection(db, 'users'), where('email', '==', lower)),
  );
  byEmail.forEach((d) => {
    if (!results.find((r) => r.uid === d.id)) {
      results.push({ uid: d.id, ...d.data() } as UserProfile);
    }
  });

  // Search by phone (exact match)
  if (/^\d+$/.test(term.trim())) {
    const byPhone = await getDocs(
      query(collection(db, 'users'), where('phoneNumber', '==', term.trim())),
    );
    byPhone.forEach((d) => {
      if (!results.find((r) => r.uid === d.id)) {
        results.push({ uid: d.id, ...d.data() } as UserProfile);
      }
    });
  }

  return results;
}

// ─── Friend Requests ──────────────────────────────────────────────────────────

export async function sendFriendRequest(fromUid: string, toUid: string) {
  await Promise.all([
    updateDoc(doc(db, 'users', toUid), { incomingRequests: arrayUnion(fromUid) }),
    updateDoc(doc(db, 'users', fromUid), { outgoingRequests: arrayUnion(toUid) }),
  ]);
}

export async function acceptFriendRequest(myUid: string, fromUid: string) {
  await Promise.all([
    updateDoc(doc(db, 'users', myUid), {
      friendIds: arrayUnion(fromUid),
      incomingRequests: arrayRemove(fromUid),
    }),
    updateDoc(doc(db, 'users', fromUid), {
      friendIds: arrayUnion(myUid),
      outgoingRequests: arrayRemove(myUid),
    }),
  ]);
}

export async function declineFriendRequest(myUid: string, fromUid: string) {
  await Promise.all([
    updateDoc(doc(db, 'users', myUid), { incomingRequests: arrayRemove(fromUid) }),
    updateDoc(doc(db, 'users', fromUid), { outgoingRequests: arrayRemove(myUid) }),
  ]);
}

export async function cancelFriendRequest(myUid: string, toUid: string) {
  await Promise.all([
    updateDoc(doc(db, 'users', myUid), { outgoingRequests: arrayRemove(toUid) }),
    updateDoc(doc(db, 'users', toUid), { incomingRequests: arrayRemove(myUid) }),
  ]);
}

export async function removeFriend(myUid: string, friendUid: string) {
  await Promise.all([
    updateDoc(doc(db, 'users', myUid), { friendIds: arrayRemove(friendUid) }),
    updateDoc(doc(db, 'users', friendUid), { friendIds: arrayRemove(myUid) }),
  ]);
}

export async function getFriends(uid: string): Promise<UserProfile[]> {
  const profile = await getUserProfile(uid);
  if (!profile || !profile.friendIds.length) return [];
  const friends = await Promise.all(
    profile.friendIds.map((fid) => getUserProfile(fid)),
  );
  return friends.filter(Boolean) as UserProfile[];
}

export async function getIncomingRequests(uid: string): Promise<UserProfile[]> {
  const profile = await getUserProfile(uid);
  if (!profile || !profile.incomingRequests.length) return [];
  const requesters = await Promise.all(
    profile.incomingRequests.map((rid) => getUserProfile(rid)),
  );
  return requesters.filter(Boolean) as UserProfile[];
}

export async function getOutgoingRequests(uid: string): Promise<UserProfile[]> {
  const profile = await getUserProfile(uid);
  if (!profile || !profile.outgoingRequests?.length) return [];
  const requestees = await Promise.all(
    profile.outgoingRequests.map((rid) => getUserProfile(rid)),
  );
  return requestees.filter(Boolean) as UserProfile[];
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function createGroup(
  creatorUid: string,
  creatorProfile: { displayName: string; username: string },
  name: string,
  initialMemberUids: string[] = [],
): Promise<string> {
  const memberProfiles = await Promise.all(
    initialMemberUids.map((uid) => getUserProfile(uid)),
  );

  const members: Record<string, { displayName: string; username: string }> = {
    [creatorUid]: creatorProfile,
  };
  memberProfiles.forEach((p) => {
    if (p) members[p.uid] = { displayName: p.displayName, username: p.username };
  });

  const memberIds = Object.keys(members);

  const ref = await addDoc(collection(db, 'groups'), {
    name,
    createdBy: creatorUid,
    memberIds,
    members,
    enabledTaxOptions: [2.25, 3.25, 10.25],
    simplifyDebts: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getGroups(uid: string): Promise<Group[]> {
  const q = query(
    collection(db, 'groups'),
    where('memberIds', 'array-contains', uid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => firestoreDocToGroup(d.id, d.data()));
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;
  return firestoreDocToGroup(snap.id, snap.data());
}

export async function updateGroupName(groupId: string, name: string) {
  await updateDoc(doc(db, 'groups', groupId), { name });
}

export async function updateGroupTaxOptions(groupId: string, options: number[]) {
  await updateDoc(doc(db, 'groups', groupId), { enabledTaxOptions: options });
}

export async function updateGroupSimplifyDebts(groupId: string, value: boolean) {
  await updateDoc(doc(db, 'groups', groupId), { simplifyDebts: value });
}

export async function addMemberToGroup(groupId: string, memberUid: string) {
  const profile = await getUserProfile(memberUid);
  if (!profile) throw new Error('User not found');
  await updateDoc(doc(db, 'groups', groupId), {
    [`members.${memberUid}`]: {
      displayName: profile.displayName,
      username: profile.username,
    },
    memberIds: arrayUnion(memberUid),
  });
}

export async function removeMemberFromGroup(groupId: string, memberUid: string) {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return;
  const data = snap.data();
  const members = { ...data.members };
  delete members[memberUid];
  await updateDoc(doc(db, 'groups', groupId), {
    members,
    memberIds: arrayRemove(memberUid),
  });
}

export async function deleteGroup(groupId: string) {
  // Delete all expenses subcollection first
  const expenses = await getDocs(collection(db, 'groups', groupId, 'expenses'));
  await Promise.all(expenses.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'groups', groupId));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(groupId: string): Promise<GroupExpense[]> {
  const q = query(
    collection(db, 'groups', groupId, 'expenses'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => firestoreDocToExpense(d.id, groupId, d.data()));
}

export async function getExpense(
  groupId: string,
  expenseId: string,
): Promise<GroupExpense | null> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
  if (!snap.exists()) return null;
  return firestoreDocToExpense(snap.id, groupId, snap.data());
}

export async function addExpense(
  groupId: string,
  data: Omit<GroupExpense, 'id' | 'groupId' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'groups', groupId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  data: Omit<GroupExpense, 'id' | 'groupId' | 'createdAt'>,
) {
  await updateDoc(doc(db, 'groups', groupId, 'expenses', expenseId), data);
}

export async function deleteExpense(groupId: string, expenseId: string) {
  await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firestoreDocToGroup(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    name: data.name as string,
    createdBy: data.createdBy as string,
    memberIds: (data.memberIds as string[]) ?? [],
    members: (data.members ?? {}) as Group['members'],
    enabledTaxOptions: (data.enabledTaxOptions as number[]) ?? [2.25, 3.25, 10.25],
    simplifyDebts: (data.simplifyDebts as boolean) ?? true,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : String(data.createdAt ?? ''),
  };
}

function firestoreDocToExpense(
  id: string,
  groupId: string,
  data: Record<string, unknown>,
): GroupExpense {
  return {
    id,
    groupId,
    itemName: data.itemName as string,
    rawPrice: data.rawPrice as number,
    taxRate: data.taxRate as number,
    totalPrice: data.totalPrice as number,
    quantity: data.quantity as number,
    isLiquor: data.isLiquor as boolean,
    liquorStateTax: data.liquorStateTax as number,
    liquorCountyTax: data.liquorCountyTax as number,
    paidBy: data.paidBy as string,
    splits: (data.splits ?? {}) as GroupExpense['splits'],
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : String(data.createdAt ?? ''),
  };
}
