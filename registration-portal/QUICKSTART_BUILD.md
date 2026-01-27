# Quick Start Guide - Building Mobile Apps

## 🎯 Quick Commands

### Update and Sync


```bash
# After making changes to index.html
npm run build        # Copy files to www/
npm run sync         # Sync with both iOS and Android
```

### Open in IDEs


```bash
npm run open:android    # Open in Android Studio
npm run open:ios        # Open in Xcode (Mac only)
```

## 📱 For Android Users (Windows/Mac/Linux)

### One-Time Setup


1. Install [Android Studio](https://developer.android.com/studio)
2. Install JDK 17+ if not already installed

### Build Your APK


1. Run: `npm run open:android`
2. In Android Studio: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Find your APK at: `android/app/build/outputs/apk/debug/app-debug.apk`
4. Upload this file to your website for download

**For production (signed):**

- Go to **Build** → **Generate Signed Bundle / APK**
- Follow the wizard to create a keystore
- Output: `android/app/build/outputs/apk/release/app-release.apk`

## 🍎 For iOS Users (Mac Required)

### iOS Setup Requirements

1. Install Xcode from Mac App Store
2. Install CocoaPods: `sudo gem install cocoapods`
3. Get an Apple Developer account ($99/year)

### Build Your IPA


1. Run: `npm run open:ios`
2. In Xcode, select **Product** → **Archive**
3. Click **Distribute App** and choose distribution method
4. Export the .ipa file

**Note:** iOS apps cannot be directly installed like Android APKs. You need:

- TestFlight (for beta testing)
- App Store (for public distribution)
- Enterprise certificate (for internal distribution)

## 📤 Upload to Your Website

### Android


- Upload the `.apk` file directly
- Users download and install (may need to enable "Unknown Sources")

### iOS


- Direct installation not supported
- Use TestFlight for distribution
- Or publish to App Store

## 🔄 Updating Your App

1. Edit `index.html` or other files in `registration-portal/`
2. Run `npm run build`
3. Run `npm run sync`
4. Rebuild in Android Studio / Xcode
5. Upload new files to your website

## ⚠️ Important Notes

- **Android APK**: Easy to distribute via direct download
- **iOS IPA**: Requires App Store, TestFlight, or Enterprise MDM
- **Keystore**: Keep your Android keystore safe - you need it for updates!
- **Mac Required**: You must have a Mac to build iOS apps

## 📂 File Locations

After building:

| Platform | File Location |
| -------- | ------------- |
| Android Debug | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Android Release | `android/app/build/outputs/apk/release/app-release.apk` |
| iOS | Wherever you chose to export in Xcode |

---

For detailed instructions, see [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)
