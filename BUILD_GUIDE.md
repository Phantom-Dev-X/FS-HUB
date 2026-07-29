# FS Hub Build Guide (Android + iOS)

This project is configured for EAS Build and EAS Update.

## Requirements

### Android APK
- Expo account
- EAS CLI installed
- No Google Play account required for preview APK

### iOS install on real iPhone
- Apple Developer Program account required ($99/year)
- EAS will manage signing/provisioning if you allow it

## First-time setup after cloning

```bash
git clone https://github.com/Phantom-Dev-X/FS-HUB.git
cd FS-HUB
npm install
npm install -g eas-cli
eas login
npx expo-doctor
```

Expected doctor result:

```txt
18/18 checks passed
```

## Build Android APK only

```bash
eas build -p android --profile preview --clear-cache
```

Download the APK from the Expo build link and install it on Android.

## Build iOS only

Requires Apple Developer account:

```bash
eas build -p ios --profile preview --clear-cache
```

EAS may ask you to log in to Apple and create/manage credentials.

## Build Android + iOS together

```bash
eas build -p all --profile preview --clear-cache
```

This starts both Android and iOS builds.

## Production builds

Android production creates an AAB for Play Store:

```bash
eas build -p android --profile production --clear-cache
```

iOS production creates App Store/TestFlight build:

```bash
eas build -p ios --profile production --clear-cache
```

Build both production apps:

```bash
eas build -p all --profile production --clear-cache
```

## OTA updates

Publish OTA update to all platforms on production channel:

```bash
eas update --channel production --message "Update message"
```

Android only:

```bash
eas update --channel production --platform android --message "Android update"
```

iOS only:

```bash
eas update --channel production --platform ios --message "iOS update"
```

## Important OTA rule

This app uses:

```json
"runtimeVersion": { "policy": "appVersion" }
```

So OTA updates only apply to installed apps with the same `expo.version`.

Example:
- APK version `1.0.2` receives only runtime `1.0.2` updates.
- If you change `app.json` version to `1.0.3`, you must build a fresh APK/IPA for users to receive `1.0.3` OTA updates.

## If you changed Expo account/project

If your Expo account is not `phantomdevs`, update `app.json`:

```json
"owner": "YOUR_EXPO_USERNAME",
"updates": {
  "url": "https://u.expo.dev/YOUR_PROJECT_ID"
},
"extra": {
  "eas": {
    "projectId": "YOUR_PROJECT_ID"
  }
}
```

You can create/link a new EAS project with:

```bash
eas build:configure
```

## If build queue is stuck

Check builds:

```bash
eas build:list
```

Open dashboard:

```txt
https://expo.dev/accounts/phantomdevs/projects/sfa-app-v2/builds
```

If queued for too long, cancel on dashboard and retry later.
