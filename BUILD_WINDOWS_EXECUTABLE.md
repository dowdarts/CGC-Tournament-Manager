# Building CGC Tournament Manager for Windows

## Prerequisites

- Node.js 18+ installed
- Windows OS (for building Windows executables)
- All dependencies installed (`npm install` in the `frontend` folder)

## Building the Windows Executable

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Build the Application
```bash
npm run electron:build:win
```

This command will:
1. Build the React/Vite application for production
2. Package it with Electron
3. Create a Windows installer (.exe)

### Step 3: Find the Output

The built files will be in:
```
frontend/dist-electron/
├── CGC Tournament Manager-Setup-1.0.0.exe  (Installer)
└── win-unpacked/                           (Portable version)
```

## Distribution Package

### What to Include in Your Distribution

1. **Installer File**: `CGC Tournament Manager-Setup-1.0.0.exe`
   - This is what users will download and run
   - Includes everything needed to install the app
   - Creates Start Menu and Desktop shortcuts
   - Can be uninstalled via Windows Settings

2. **Optional Files**:
   - `README.txt` - Instructions for users
   - `LICENSE.txt` - Your license
   - Icon file (if you want to show it separately)

### Creating a Distribution Folder

1. Create a new folder: `CGC-Tournament-Manager-v1.0.0-Windows`
2. Copy these files into it:
   ```
   CGC-Tournament-Manager-v1.0.0-Windows/
   ├── CGC Tournament Manager-Setup-1.0.0.exe
   ├── README.txt
   └── LICENSE.txt (optional)
   ```
3. Right-click the folder → "Send to" → "Compressed (zipped) folder"
4. You now have `CGC-Tournament-Manager-v1.0.0-Windows.zip` ready for distribution

## Installation Instructions for Users

### For End Users (Include this in README.txt):

```
CGC Tournament Manager - Installation Instructions

IMPORTANT: You must have internet access to use this application.
This app connects to online services (Supabase) for data storage.

INSTALLATION:
1. Extract this ZIP file to a temporary folder
2. Double-click "CGC Tournament Manager-Setup-1.0.0.exe"
3. Follow the installation wizard
4. Choose installation location (default is recommended)
5. Click "Install"
6. Launch from Desktop shortcut or Start Menu

FIRST RUN:
1. The app will open to the sign-in page
2. Create a new account or sign in with existing credentials
3. Your tournaments are stored in the cloud
4. You can access them from any computer by signing in

REQUIREMENTS:
- Windows 10 or later (64-bit)
- Active internet connection
- 500 MB free disk space

UNINSTALL:
- Windows Settings → Apps → CGC Tournament Manager → Uninstall

SUPPORT:
For issues or questions, contact: [Your email/support URL]

© 2026 CGC Tournament Manager
```

## Adding a Custom Icon

### Step 1: Prepare Your Icon

1. Create or obtain an `.ico` file (Windows icon format)
2. Recommended sizes: 16x16, 32x32, 48x48, 256x256 pixels
3. Name it: `tournament-manager.ico`
4. Place it in: `frontend/public/`

### Step 2: Update Configuration

Edit `frontend/electron-builder.yml`:
```yaml
win:
  icon: public/tournament-manager.ico
nsis:
  installerIcon: public/tournament-manager.ico
  uninstallerIcon: public/tournament-manager.ico
```

Edit `frontend/electron/main.js`:
```javascript
icon: path.join(__dirname, '../public/tournament-manager.ico'),
```

### Step 3: Rebuild
```bash
npm run electron:build:win
```

## Development Mode (Testing)

To test the Electron app without building:
```bash
npm run electron:dev
```

This will:
- Start the Vite dev server
- Launch Electron with hot-reload
- Open DevTools for debugging

## Build Commands Reference

| Command | Description |
|---------|-------------|
| `npm run electron:dev` | Run in development mode with hot-reload |
| `npm run electron:build` | Build for current platform |
| `npm run electron:build:win` | Build Windows installer |
| `npm run pack` | Create unpacked directory (for testing) |
| `npm run dist` | Create distributable packages |

## File Sizes (Approximate)

- Installer: ~150-200 MB
- Installed app: ~300-400 MB
- Distribution ZIP: ~150 MB

## Troubleshooting

### Build Fails
- Make sure all dependencies are installed: `npm install`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear electron-builder cache: `npx electron-builder clean-cache`

### Icon Not Showing
- Make sure the `.ico` file is properly formatted
- Rebuild the application completely
- Windows may cache old icons - restart Windows Explorer

### App Won't Start
- Check if Windows Defender or antivirus is blocking it
- Run the installer as Administrator
- Check Event Viewer for error messages

## Advanced: Portable Version

The `win-unpacked` folder in `dist-electron` contains a portable version:
- Doesn't require installation
- Can run from USB drive
- Doesn't create registry entries
- Useful for testing or portable use

To distribute portable version:
1. Zip the entire `win-unpacked` folder
2. Name it: `CGC-Tournament-Manager-v1.0.0-Portable.zip`
3. Users extract and run `CGC Tournament Manager.exe`

## Code Signing (Optional, for Professional Distribution)

To avoid "Unknown Publisher" warnings:
1. Purchase a code signing certificate ($100-400/year)
2. Add to `electron-builder.yml`:
   ```yaml
   win:
     certificateFile: path/to/certificate.pfx
     certificatePassword: your-password
   ```
3. Rebuild - installer will be signed

## Auto-Updates (Future Enhancement)

To add automatic updates:
1. Set up GitHub Releases or update server
2. Configure in `electron-builder.yml`:
   ```yaml
   publish:
     provider: github
     owner: your-username
     repo: CGC-Tournament-Manager
   ```
3. Use electron-updater in your app

## Notes

- The app requires internet to work (connects to Supabase)
- Data is NOT stored locally - everything is in the cloud
- Users need to create accounts and sign in
- Multiple users can use the same installation (each with their own account)
- The Electron version is functionally identical to the web version
- Updates require rebuilding and redistributing the installer
