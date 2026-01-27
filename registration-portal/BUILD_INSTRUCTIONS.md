# Mobile App Build Instructions

This directory contains the mobile app versions of the Tournament Registration Portal for both iOS and Android.

## 📁 Project Structure

```text
registration-portal/
├── www/                    # Web assets (HTML, CSS, images)
├── android/                # Android native project
├── ios/                    # iOS native project (Xcode)
├── capacitor.config.ts     # Capacitor configuration
└── package.json           # Dependencies and build scripts
```

## 🔧 Prerequisites

### For Android (.apk)


- **Android Studio** (latest version)
- **Java Development Kit (JDK)** 17 or higher
- **Android SDK** (installed via Android Studio)

### For iOS (.ipa)


- **macOS** (required for iOS builds)
- **Xcode** 14 or higher
- **Apple Developer Account** ($99/year for distribution)
- **CocoaPods** (install via: `sudo gem install cocoapods`)

## 📱 Building for Android

### Step 1: Update Web Assets


```bash
# Copy your latest HTML files to www folder
npm run build
```


### Step 2: Sync with Android Project


```bash
npx cap sync android
```


### Step 3: Open in Android Studio


```bash
npx cap open android
```


### Step 4: Build APK in Android Studio


1. In Android Studio, click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Once complete, click "locate" to find the APK file
3. The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 5: For Production (Signed APK)

1. In Android Studio, click **Build** → **Generate Signed Bundle / APK**
2. Choose **APK**
3. Create or select a keystore file
4. Fill in the signing configuration
5. Select **release** build variant
6. The signed APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Alternative Android Build: Command Line

```bash
cd android
./gradlew assembleDebug    # For debug APK
./gradlew assembleRelease  # For release APK (requires signing)
```

## 🍎 Building for iOS

### Step 1: Install CocoaPods Dependencies

```bash
cd ios/App
pod install
cd ../..
```

### Step 2: Update Web Assets

```bash
npm run build
```

### Step 3: Sync with iOS Project

```bash
npx cap sync ios
```

### Step 4: Open in Xcode

```bash
npx cap open ios
```

### Step 5: Configure Signing in Xcode

1. In Xcode, select the **App** target
2. Go to **Signing & Capabilities** tab
3. Select your **Team** (requires Apple Developer account)
4. Xcode will automatically manage signing

### Step 6: Build for Testing (Simulator)

1. Select a simulator device (e.g., iPhone 15)
2. Click **Product** → **Build**
3. Click **Product** → **Run** to test in simulator

### Step 7: Build for Physical Device

1. Connect your iPhone via USB
2. Select your device from the device dropdown
3. Click **Product** → **Build**
4. Click **Product** → **Run** to install on device

### Step 8: Archive for Distribution (.ipa)

1. Select **Any iOS Device (arm64)** as the destination
2. Click **Product** → **Archive**
3. Once archiving completes, the Organizer window opens
4. Click **Distribute App**
5. Choose distribution method:
   - **App Store Connect**: Submit to Apple App Store
   - **Ad Hoc**: For testing on registered devices
   - **Enterprise**: For internal company distribution
   - **Development**: For development testing
6. Follow the wizard to export the .ipa file

### Alternative iOS Build: Command Line

```bash
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive -archivePath build/App.xcarchive
xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build -exportOptionsPlist ExportOptions.plist
```

## 🌐 Updating Web Content

Whenever you update the HTML or assets:

```bash
# 1. Copy updated files to www/
cp index.html www/
cp registration-portal-logo.png www/

# 2. Sync changes to both platforms
npx cap sync

# 3. Rebuild apps in Android Studio / Xcode
```

## 📦 Distribution Files

After building, you'll have:

### Android

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk` (for testing)
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk` (for distribution)

### iOS

- **IPA file**: Located where you exported it in Xcode Organizer
- Can be distributed via TestFlight, App Store, or direct download (requires MDM for enterprise)

## 🔐 App Signing

### Android Keystore (Important!)

- Keep your keystore file safe - you'll need it for all future updates
- Store the keystore password securely
- Without the original keystore, you cannot update your app

### iOS Certificate

- Managed through Apple Developer Account
- Xcode can automatically manage certificates
- Distribution certificates expire annually

## 🚀 Publishing

### Google Play Store (Android)

1. Create a Google Play Developer account ($25 one-time fee)
2. Create a new app listing
3. Upload your signed APK or AAB bundle
4. Fill in store listing details
5. Submit for review

### Apple App Store (iOS)

1. Requires Apple Developer Program membership ($99/year)
2. Archive and upload via Xcode or Application Loader
3. Create app listing in App Store Connect
4. Submit for review (typically 1-3 days)

### Direct Download (Website)

- **Android APK**: Can be directly downloaded and installed
  - Users need to enable "Install from Unknown Sources"
  - Provide clear installation instructions
- **iOS IPA**: Requires enterprise certificate or MDM
  - Cannot be directly installed like Android
  - Consider TestFlight for beta distribution

## 📝 App Configuration

### Change App Name

Edit `capacitor.config.ts`:

```typescript
appName: 'Your App Name'
```

### Change App ID

Edit `capacitor.config.ts`:

```typescript
appId: 'com.yourcompany.yourapp'
```

Then rebuild both platforms:

```bash
npx cap sync
```

### Change App Icon

- **Android**: Replace icons in `android/app/src/main/res/mipmap-*` folders
- **iOS**: Replace icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## 🐛 Troubleshooting

### Android Build Fails

- Ensure Android Studio is properly installed
- Check JDK version (should be 17+)
- Clean build: `cd android && ./gradlew clean`

### iOS Build Fails

- Ensure CocoaPods is installed: `pod --version`
- Run `pod install` in `ios/App` directory
- Clean build: In Xcode, **Product** → **Clean Build Folder**

### Changes Not Appearing

- Always run `npx cap sync` after updating web assets
- Rebuild the app in Android Studio / Xcode

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio/run)
- [Xcode Guide](https://developer.apple.com/xcode/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

## 🆘 Support

For issues specific to:

- **Capacitor**: <https://github.com/ionic-team/capacitor/issues>
- **Android**: <https://stackoverflow.com/questions/tagged/android>
- **iOS**: <https://developer.apple.com/forums/>

---

**Note**: Building for iOS requires a Mac. If you only have Windows, you can only build the Android APK. For iOS builds, you'll need access to a Mac or use a cloud Mac service like MacStadium or MacinCloud.
