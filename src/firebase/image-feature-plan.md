# Image Feature Plan — Profile Photo & Group Thumbnail

Current state: letter-symbol avatars only. Images deferred until storage is sorted.

---

## Option A — Firebase Storage (Paid, Blaze plan required)

Firebase Storage requires upgrading from the Spark (free) plan to Blaze (pay-as-you-go).
Pricing is very cheap in practice (~$0.026/GB/month storage, $0.12/GB egress) but requires a credit card.

### Storage Rules (paste into Firebase Console → Storage → Rules)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/profile.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /groups/{groupId}/thumbnail.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### New file: `src/firebase/storage.ts`

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/profile.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadGroupThumbnail(groupId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `groups/${groupId}/thumbnail.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
```

### Add to `src/firebase/config.ts`

```typescript
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);
```

---

## Option B — Cloudinary (Free, recommended)

Free tier: 25 GB storage + 25 GB bandwidth/month. No credit card required.
Upload via REST — no native SDK, no rebuild needed.

### Setup

1. Create account at cloudinary.com
2. Go to Settings → Upload → Add upload preset → set to "Unsigned"
3. Note your `cloud_name` and `upload_preset` name

### New file: `src/utils/cloudinaryUpload.ts`

```typescript
const CLOUD_NAME = 'your_cloud_name';
const UPLOAD_PRESET = 'your_unsigned_preset';

export async function uploadImageToCloudinary(uri: string, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return data.secure_url as string;
}

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  return uploadImageToCloudinary(uri, `centsible/profiles`);
}

export async function uploadGroupThumbnail(groupId: string, uri: string): Promise<string> {
  return uploadImageToCloudinary(uri, `centsible/groups`);
}
```

---

## Files to change (same for both options)

### `src/types/index.ts`
- Add `photoURL?: string` to `UserProfile`
- Add `thumbnailURL?: string` to `Group`

### `src/firebase/firestore.ts`
- Add `updateGroupThumbnail(groupId, url)` function:
  ```typescript
  export async function updateGroupThumbnail(groupId: string, thumbnailURL: string) {
    await updateDoc(doc(db, 'groups', groupId), { thumbnailURL });
  }
  ```
- Update `firestoreDocToGroup` to include:
  ```typescript
  thumbnailURL: (data.thumbnailURL as string | undefined) ?? undefined,
  ```

### `app.config.js`
- Add `'expo-image-picker'` to the `plugins` array (requires EAS rebuild)

### `src/screens/ProfileScreen.tsx` — pen icon + photo upload

```tsx
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Image } from 'react-native';
import { uploadProfilePhoto } from '../firebase/storage'; // or cloudinaryUpload

// Replace Avatar with AvatarDisplay that accepts photoURL:
function AvatarDisplay({ name, photoURL, size = 64 }: { name: string; photoURL?: string; size?: number }) {
  const colors = useAppTheme();
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: colors.primary, fontSize: size * 0.4, fontWeight: '800' }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// State to add:
const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
// Load on mount from profile.photoURL

// Pick handler:
const handleEditPhoto = () => {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
    async (buttonIndex) => {
      const result = buttonIndex === 1
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const url = await uploadProfilePhoto(user!.uid, result.assets[0].uri);
      await updateProfile(user!, { photoURL: url });
      await updateDoc(doc(db, 'users', user!.uid), { photoURL: url });
      setPhotoURL(url);
    }
  );
};

// Avatar with pen badge:
<TouchableOpacity onPress={handleEditPhoto} style={{ position: 'relative' }}>
  <AvatarDisplay name={name} photoURL={photoURL} size={88} />
  <View style={{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }}>
    <Ionicons name="pencil" size={12} color="#FFF" />
  </View>
</TouchableOpacity>
```

### `src/screens/GroupSettingsScreen.tsx` — thumbnail at top of settings

```tsx
// State:
const [localThumbUri, setLocalThumbUri] = useState<string | null>(null);

// At top of ListHeaderComponent, before GROUP NAME card:
<View style={[styles.thumbnailCard, { backgroundColor: colors.surface }]}>
  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GROUP PHOTO</Text>
  <TouchableOpacity onPress={handleEditThumbnail} style={{ position: 'relative', marginTop: 8 }}>
    {vm.group?.thumbnailURL ? (
      <Image source={{ uri: vm.group.thumbnailURL }} style={{ width: 72, height: 72, borderRadius: 18 }} />
    ) : (
      <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '700' }}>{vm.group?.name?.charAt(0).toUpperCase()}</Text>
      </View>
    )}
    <View style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }}>
      <Ionicons name="pencil" size={12} color="#FFF" />
    </View>
  </TouchableOpacity>
</View>
```

### `src/screens/HomeScreen.tsx` — show thumbnail in GroupCard

```tsx
import { Image } from 'react-native';

// In GroupCard, replace the letter icon View with:
{group.thumbnailURL ? (
  <Image source={{ uri: group.thumbnailURL }} style={styles.groupIcon} />
) : (
  <View style={[styles.groupIcon, { backgroundColor: colors.primaryLight }]}>
    <Text style={[styles.groupIconText, { color: colors.primary }]}>
      {group.name.charAt(0).toUpperCase()}
    </Text>
  </View>
)}
```

---

## Notes

- Both options use `expo-image-picker` with `allowsEditing: true, aspect: [1,1]` for the native iOS crop UI — no custom crop screen needed.
- Firebase Storage option: URL is permanent and cross-device immediately.
- Cloudinary option: URL is permanent, cross-device, and free. Slightly more setup but no billing required.
- For Option B, store the returned `secure_url` in Firestore (`users/{uid}.photoURL` and `groups/{groupId}.thumbnailURL`) so all devices see the same image.
