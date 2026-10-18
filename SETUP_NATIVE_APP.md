# Setup Native Mobile App - Malika Tour

## 📱 Panduan Lengkap Setup Aplikasi Native

Aplikasi Malika Tour sudah dikonfigurasi untuk menjadi native mobile app menggunakan Capacitor. Ikuti langkah-langkah berikut untuk build dan test aplikasi di perangkat Anda.

## 🚀 Persyaratan

### Untuk Android:
- **Android Studio** (terbaru)
- **JDK 17** atau lebih tinggi
- **Android SDK** (akan otomatis terinstall dengan Android Studio)

### Untuk iOS (Mac only):
- **Xcode** (terbaru dari App Store)
- **CocoaPods** (install dengan: `sudo gem install cocoapods`)
- **macOS** (iOS development hanya bisa di Mac)

## 📋 Langkah-langkah Setup

### 1. Clone Repository dari GitHub

```bash
# Clone repository Anda
git clone [URL_GITHUB_REPOSITORY_ANDA]
cd [NAMA_FOLDER_PROJECT]

# Install dependencies
npm install
```

### 2. Build Web App

```bash
npm run build
```

### 3. Setup Platform

#### Untuk Android:

```bash
# Tambah platform Android
npx cap add android

# Sync project
npx cap sync android

# Buka di Android Studio
npx cap open android
```

#### Untuk iOS (Mac only):

```bash
# Tambah platform iOS
npx cap add ios

# Sync project
npx cap sync ios

# Install pods
cd ios/App
pod install
cd ../..

# Buka di Xcode
npx cap open ios
```

### 4. Update Capacitor Config (Opsional)

Jika Anda ingin test dengan build production, edit `capacitor.config.ts` dan comment atau hapus bagian `server`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.6d973c9f1c0440799785c7427ebdf9bb',
  appName: 'Malika Tour',
  webDir: 'dist',
  // Comment bagian server untuk production build
  // server: {
  //   url: 'https://6d973c9f-1c04-4079-9785-c7427ebdf9bb.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
};
```

Jangan lupa sync ulang setelah perubahan:
```bash
npx cap sync
```

## 🔄 Development Workflow

### Testing di Perangkat/Emulator

#### Android:
1. Buka Android Studio
2. Pilih emulator atau connect physical device
3. Click tombol ▶️ (Run) di Android Studio
4. Aplikasi akan terinstall dan berjalan di device

#### iOS:
1. Buka Xcode
2. Pilih simulator atau connect iPhone
3. Click tombol ▶️ (Run) di Xcode
4. Aplikasi akan terinstall dan berjalan di device

### Update Code

Setiap kali Anda update code di Lovable atau git pull perubahan baru:

```bash
# Pull perubahan terbaru
git pull

# Install dependencies baru (jika ada)
npm install

# Build ulang
npm run build

# Sync ke native platforms
npx cap sync
```

## 🤖 GitHub Actions (Automatic Build)

Repository ini sudah dilengkapi dengan GitHub Actions untuk automatic build. Setiap kali Anda push ke branch `main`, GitHub akan otomatis:

1. ✅ Build web app
2. ✅ Build Android APK (Debug)
3. ✅ Build iOS archive
4. ✅ Upload artifacts yang bisa didownload

Anda bisa download hasil build di tab **Actions** → pilih workflow run → scroll ke **Artifacts**.

## 📝 Tips Penting

### Hot Reload untuk Development
Dengan konfigurasi `server.url` di `capacitor.config.ts`, aplikasi akan langsung connect ke Lovable preview. Ini berarti:
- ✅ Tidak perlu build ulang untuk test perubahan
- ✅ Edit di Lovable, langsung terlihat di mobile app
- ✅ Lebih cepat untuk development

### Production Build
Untuk production release:
1. Comment bagian `server` di `capacitor.config.ts`
2. Build web app: `npm run build`
3. Sync: `npx cap sync`
4. Build release di Android Studio / Xcode

### Troubleshooting

#### "Module not found" error:
```bash
npm install
npm run build
npx cap sync
```

#### Android build error:
- Pastikan JDK 17 terinstall
- Check Android SDK di Android Studio
- Clean & rebuild: `cd android && ./gradlew clean`

#### iOS build error:
- Update CocoaPods: `sudo gem install cocoapods`
- Clean pods: `cd ios/App && rm -rf Pods && pod install`
- Clean Xcode: Product → Clean Build Folder

## 📱 Publishing ke Store

### Google Play Store (Android):
1. Buat keystore untuk signing
2. Build release APK/AAB di Android Studio
3. Upload ke Google Play Console
4. Lengkapi listing & submit untuk review

### Apple App Store (iOS):
1. Daftar Apple Developer Program ($99/tahun)
2. Setup certificates & provisioning profiles
3. Archive & upload di Xcode
4. Submit untuk review di App Store Connect

## 🆘 Butuh Bantuan?

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio
- **Xcode**: https://developer.apple.com/xcode/

---

**Selamat mencoba! 🚀**

Jika ada pertanyaan atau kendala, silakan buka issue di repository GitHub.
