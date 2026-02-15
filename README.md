# Stone Inventory (Electron)

این پروژه با Electron + React + Vite اجرا می‌شود و می‌توانید از آن فایل نصبی بگیرید.

## پیش‌نیازها
- Node.js نسخه 18 یا بالاتر
- npm

## اجرای پروژه در حالت توسعه
1. وابستگی‌ها را نصب کنید:
   ```bash
   npm install
   ```
2. برنامه را در حالت توسعه اجرا کنید:
   ```bash
   npm run dev
   ```

## ساخت خروجی نهایی (Desktop Build)
1. ابتدا خروجی فرانت ساخته می‌شود:
   ```bash
   npm run build:renderer
   ```
2. برای گرفتن خروجی بدون installer (صرفاً unpacked)، اجرا کنید:
   ```bash
   npm run pack
   ```
3. برای گرفتن فایل نصبی (installer)، اجرا کنید:
   ```bash
   npm run dist
   ```

> خروجی‌ها داخل پوشه `dist/` و `dist_electron/` تولید می‌شوند (بسته به پلتفرم).

## خروجی نصبی روی هر سیستم
- **Windows**: فایل `.exe` (NSIS installer)
- **Linux**: فایل `.AppImage` و `.deb`
- **macOS**: فایل `.dmg`

## نکته مهم برای Windows
اگر روی لینوکس یا macOS هستید، ساخت installer ویندوز ممکن است نیاز به Wine/محیط CI مناسب داشته باشد. بهترین حالت این است که installer هر سیستم را روی همان سیستم (native) بسازید.

## شخصی‌سازی آیکن برنامه
اگر خواستید آیکن بگذارید:
1. پوشه `build/` بسازید.
2. آیکن‌ها را قرار دهید:
   - `build/icon.ico` برای Windows
   - `build/icon.icns` برای macOS
   - `build/icon.png` برای Linux

`electron-builder` به‌صورت خودکار از این آیکن‌ها استفاده می‌کند.
