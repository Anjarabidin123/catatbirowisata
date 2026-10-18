# Setup Native App Icons - Malika Tour

## Untuk Developer

Logo native app sudah digenerate dan disimpan di `resources/icon.png`. Ini adalah icon yang akan muncul di home screen HP (Android & iOS).

### Cara Setup Icons Secara Manual (Lokal)

Jika Anda ingin build native app secara lokal, ikuti langkah berikut:

#### 1. Install Capacitor Assets Tool (Recommended)
```bash
npm install -g @capacitor/assets
```

Lalu generate semua ukuran icon otomatis:
```bash
npx capacitor-assets generate --iconBackgroundColor '#0088FF' --iconBackgroundColorDark '#003366'
```

Tool ini akan otomatis membuat semua ukuran icon yang dibutuhkan untuk Android dan iOS.

#### 2. Manual Setup (Alternative)

Jika tidak menggunakan tool di atas, Anda perlu resize icon secara manual:

**Untuk Android:**
- Buat folder: `android/app/src/main/res/mipmap-*`
- Copy dan resize `resources/icon.png` ke berbagai ukuran:
  - `mipmap-mdpi/ic_launcher.png` - 48x48
  - `mipmap-hdpi/ic_launcher.png` - 72x72
  - `mipmap-xhdpi/ic_launcher.png` - 96x96
  - `mipmap-xxhdpi/ic_launcher.png` - 144x144
  - `mipmap-xxxhdpi/ic_launcher.png` - 192x192

**Untuk iOS:**
- Buat folder: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Copy dan resize `resources/icon.png` ke berbagai ukuran:
  - 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

Gunakan tool seperti ImageMagick untuk resize:
```bash
convert resources/icon.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

### 3. Sync ke Native Platform

Setelah icon di-setup:
```bash
npx cap sync
```

### 4. Rebuild App

```bash
# Android
npx cap run android

# iOS (hanya di Mac)
npx cap run ios
```

## GitHub Actions

GitHub Actions workflow sudah dikonfigurasi untuk otomatis copy icon ke native folders saat build. Icon akan muncul di:
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Catatan Penting

1. **Logo Web vs Logo Native:**
   - Logo di web/app (animasi bus) ≠ Logo native app (icon di home screen)
   - Logo native menggunakan `resources/icon.png` (gambar pantai + bus + kelapa)
   - Logo di web menggunakan `BusAnimation.tsx` (animasi SVG)

2. **Update Icon:**
   - Jika ingin ganti icon, replace `resources/icon.png` dengan gambar baru
   - Ukuran recommended: 1024x1024 px
   - Format: PNG dengan background
   - Re-run step 1 atau 2 di atas

3. **Splash Screen:**
   - Background color sudah dikonfigurasi di `capacitor.config.ts`: `#0088FF`
   - Durasi: 2 detik
   - Spinner: Aktif (small)

## Troubleshooting

**Icon tidak berubah setelah build?**
- Clean build: `rm -rf android ios`
- Re-add platform: `npx cap add android` atau `npx cap add ios`
- Sync: `npx cap sync`
- Rebuild app

**Icon terlalu kecil/besar?**
- Pastikan `resources/icon.png` berukuran 1024x1024 px
- Gunakan tool resize untuk generate ulang semua ukuran

**Icon tidak muncul di iOS?**
- Buka Xcode: `ios/App/App.xcworkspace`
- Check `Assets.xcassets/AppIcon.appiconset`
- Pastikan semua ukuran icon ada

## Resources

- Icon generator: https://icon.kitchen/
- Capacitor Assets: https://github.com/ionic-team/capacitor-assets
- Android Icon Guidelines: https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher
- iOS Icon Guidelines: https://developer.apple.com/design/human-interface-guidelines/app-icons
