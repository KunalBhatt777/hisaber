# Google Sign-In on Android — Implementation Plan

## Current State
Google Sign-In works on **iOS only** via `expo-auth-session/providers/google`.
The button is hidden on Android (`Platform.OS === 'ios'` gate in `LoginScreen.tsx`).

## Why It Doesn't Work with expo-auth-session on Android
`expo-auth-session` opens a system browser (Chrome) to do the OAuth flow, then
redirects back to the app via a custom URI scheme:
`com.kunalbhatt777.centsible:/oauth2redirect/google`

Google does not allow custom URI schemes as redirect URIs in any OAuth client type:
- **Android-type client**: uses SHA-1 fingerprint verification, designed for the
  native Google Sign-In SDK — not browser redirects. Error: "Custom URI scheme is
  not enabled for your Android client."
- **Web-type client**: only accepts `http://` or `https://` redirect URIs.

## Correct Solution: @react-native-google-signin/google-signin

### Why this library
- Uses Android's native Google Sign-In SDK (no browser redirect needed)
- Works with the SHA-1-verified Android OAuth client
- Returns an ID token that plugs directly into Firebase Auth (same as iOS flow)
- Widely used, actively maintained, Expo-compatible via config plugin

### Existing credentials (already set up)
- **Android OAuth client ID**: `68897381471-st305spva6b0lq59ss35qfp4qkd2r3ua.apps.googleusercontent.com`
- **SHA-1**: `09:71:61:22:61:A6:F8:F6:2D:54:D5:D4:30:A6:1C:F9:56:20:81:9E`
- **Keystore**: `@kunalbhatt777__centsible.jks`
- **Web client ID** (used as `webClientId` for ID token): `68897381471-s4vud1783rasu674mca0j7l34ubf6ghs.apps.googleusercontent.com`

### Steps to implement

**1. Install the package**
```bash
npx expo install @react-native-google-signin/google-signin
```

**2. Add config plugin to app.config.js**
```js
plugins: [
  'expo-sqlite',
  'expo-sharing',
  '@react-native-google-signin/google-signin',
]
```

**3. Configure in app startup (e.g. App.tsx or firebase/config.ts)**
```ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '68897381471-s4vud1783rasu674mca0j7l34ubf6ghs.apps.googleusercontent.com',
});
```

**4. Update LoginScreen.tsx — Android Google Sign-In handler**
```tsx
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const handleAndroidGoogleSignIn = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const { data } = await GoogleSignin.signIn();
    const idToken = data?.idToken;
    if (idToken) {
      await signInWithGoogle(idToken); // existing Firebase helper
    }
  } catch (err) {
    Alert.alert('Google Sign-In Error', 'Failed to sign in with Google.');
  }
};
```

**5. Render the button on Android**
Replace the `Platform.OS === 'ios'` gate with platform-specific handlers:
```tsx
// iOS: uses GoogleSignInButton (expo-auth-session)
// Android: uses native GoogleSignin
{Platform.OS === 'ios' ? (
  <>
    <View style={styles.dividerRow}>...</View>
    <GoogleSignInButton />
  </>
) : (
  <>
    <View style={styles.dividerRow}>...</View>
    <TouchableOpacity onPress={handleAndroidGoogleSignIn} style={styles.googleBtn}>
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.googleBtnText}>Continue with Google</Text>
    </TouchableOpacity>
  </>
)}
```

**6. Rebuild the Android dev client**
The library has native code — a new EAS build is required after adding it:
```bash
npm run build:android:dev
```

### Notes
- `signInWithGoogle` in `src/firebase/auth.ts` already handles Firebase ID token
  sign-in — no changes needed there.
- The iOS flow via `expo-auth-session` can stay as-is.
- No Google Cloud Console changes needed — the existing Android OAuth client
  (`68897381471-st305spva6b0lq59ss35qfp4qkd2r3ua`) is correct for this library.
