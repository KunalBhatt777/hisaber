import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  username: string,
  phoneNumber: string,
) {
  const usernameAvailable = await isUsernameAvailable(username);
  if (!usernameAvailable) throw new Error('Username is already taken.');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  await setDoc(doc(db, 'users', cred.user.uid), {
    email: email.toLowerCase(),
    displayName,
    username: username.toLowerCase(),
    phoneNumber: phoneNumber.trim(),
    friendIds: [],
    incomingRequests: [],
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function signInWithGoogle(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);

  // Create Firestore profile on first Google sign-in
  const userRef = doc(db, 'users', cred.user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    const displayName = cred.user.displayName ?? 'User';
    const email = cred.user.email ?? '';
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    await setDoc(userRef, {
      email: email.toLowerCase(),
      displayName,
      username: base,
      phoneNumber: '',
      friendIds: [],
      incomingRequests: [],
      outgoingRequests: [],
      createdAt: serverTimestamp(),
    });
  }

  return cred.user;
}

async function isUsernameAvailable(username: string): Promise<boolean> {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username.toLowerCase()),
  );
  const snap = await getDocs(q);
  return snap.empty;
}
