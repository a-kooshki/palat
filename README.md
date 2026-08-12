# Stone Inventory Management System

## فارسی | [English](#english)

---

## 📌 درباره پروژه

سیستم مدیریت انبار سنگ برای کارخانه‌های فرآوری سنگ و انبارهای سنگ. این نرم‌افزار یک **برنامه دسکتاپ** مبتنی بر **Electron** است که به صورت **آفلاین** کار می‌کند و برای استفاده در محیط‌های صنعتی طراحی شده است.

### ✨ ویژگی‌ها

- ✅ **مدیریت اطلاعات سنگ‌ها** (نوع، کد برش، شماره پالت، گرید، ابعاد، مقدار، مساحت)
- ✅ **ورود اطلاعات به صورت جدول قابل ویرایش** (با پشتیبانی از کلید Enter)
- ✅ **جستجو و فیلتر پیشرفته** (بر اساس نوع، پالت، گرید، ابعاد و ...)
- ✅ **مدیریت انواع سنگ**
- ✅ **گزارش‌گیری و چاپ** (PDF برای کارت پالت و نتایج جستجو)
- ✅ **ذخیره‌سازی در SQLite** (با پشتیبانی از Backup/Restore)
- ✅ **نمايش گرافیکی** (نمايش مساحت سنگ‌ها با نمودار)
- ✅ **امنیتی کامل** (contextIsolation, sandbox, IPC secure)
- ✅ **پشتیبانی از زبان فارسی** (RTL)
- ✅ **ذخیره خودکار** (هر ۵ ثانیه)

---

## 🚀 راه‌اندازی پروژه

### پیش‌نیازها

- [Node.js](https://nodejs.org/) (نسخه 18 یا بالاتر)
- [Git](https://git-scm.com/)
- [Python](https://www.python.org/) (برای build در برخی سیستم‌ها)

### نصب

```bash
# Clone کردن ریپوزیتوری
git clone https://github.com/a-kooshki/palat.git
cd palat

# نصب وابستگی‌ها
npm install

# اجرا در حالت توسعه
npm run dev
```

### Build برای تولید

```bash
# Build برای Windows
npm run build:electron

# فایل‌های خروجی در پوشه dist قرار می‌گیرند
```

---

## 📁 ساختار پروژه

```
palat/
├── main/                  # Main Process
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload script (IPC bridge)
│   └── database.js        # SQLite database layer
├── renderer/              # Renderer Process
│   ├── src/
│   │   ├── App.js         # کامپوننت اصلی React
│   │   ├── index.js       # نقطه ورود React
│   │   └── index.css      # استایل‌های Tailwind CSS
│   └── public/
│       ├── index.html     # HTML template
│       └── icon.png       # آیکون برنامه
├── package.json           # تنظیمات پروژه
├── electron-builder.json  # تنظیمات build
├── tailwind.config.js     # تنظیمات Tailwind
├── postcss.config.js      # تنظیمات PostCSS
├── .gitignore             # فایل‌های نادیده گرفته شده
└── README.md              # مستندات
```

---

## 🔧 تنظیمات

### تنظیمات دیتابیس

دیتابیس SQLite به صورت خودکار در پوشه `userData` ایجاد می‌شود. برای تغییر مسیر دیتابیس، فایل `main/database.js` را ویرایش کنید.

### تنظیمات امنیتی

- **contextIsolation**: فعال
- **nodeIntegration**: غیرفعال
- **sandbox**: فعال
- **IPC**: با preload script امن شده

---

## 📊 API های در دسترس

### از طریق `window.electronAPI`

#### داده‌ها
- `loadData()` - بارگذاری تمام داده‌ها
- `saveData(data)` - ذخیره تمام داده‌ها

#### سنگ‌ها
- `addStone(stone)` - اضافه کردن سنگ جدید
- `updateStone(stone)` - به‌روزرسانی سنگ
- `deleteStone(id)` - حذف سنگ

#### انواع سنگ
- `addStoneType(type)` - اضافه کردن نوع سنگ
- `deleteStoneType(type)` - حذف نوع سنگ

#### Backup/Restore
- `backupDatabase(path)` - ایجاد بکاپ
- `restoreDatabase(path)` - بازگردانی بکاپ

#### جستجو
- `searchStones(filters)` - جستجوی سنگ‌ها

#### لاگ‌ها
- `getAuditLogs(options)` - دریافت لاگ‌های تغییرات

---

## 🎨 رابط کاربری

### تب‌ها
1. **Form** - ورود اطلاعات سنگ‌ها به صورت جدول
2. **Search & Review** - جستجو و بررسی سنگ‌ها
3. **Pallet Card** - نمایش و چاپ کارت پالت
4. **Stone Types** - مدیریت انواع سنگ

### میانبرهای صفحه‌کلید
- **Enter**: رفتن به سطر بعدی / اضافه کردن سنگ جدید
- **Escape**: لغو ویرایش
- **Delete**: حذف سنگ انتخاب شده

---

## 🔒 امنیتی

- **contextIsolation**: فعال برای جلوگیری از دسترسی به Node.js از Renderer
- **sandbox**: فعال برای محدود کردن دسترسی‌ها
- **IPC Validation**: اعتبارسنجی تمام درخواست‌های IPC
- **SQL Injection Prevention**: استفاده از prepared statements در SQLite
- **Path Traversal Prevention**: اعتبارسنجی مسیرها

---

## 📦 وابستگی‌ها

- **Electron**: فریمورک اصلی
- **React**: کتابخانه UI
- **SQLite3**: دیتابیس محلی
- **Chart.js**: نمودارهای گرافیکی
- **jsPDF**: ایجاد فایل‌های PDF
- **Tailwind CSS**: استایل‌دهی

---

## 🤝 مشارکت

1. Fork کردن ریپوزیتوری
2. ایجاد شاخه جدید (`git checkout -b feature/your-feature`)
3. اعمال تغییرات
4. Commit کردن (`git commit -m 'Add some feature'`)
5. Push کردن (`git push origin feature/your-feature`)
6. ایجاد Pull Request

---

## 📄 مجوز

MIT License

---

# English

# Stone Inventory Management System

A **desktop application** built with **Electron** for managing stone inventory in stone processing factories and warehouses. Works **completely offline** and is designed for industrial environments.

## ✨ Features

- ✅ **Stone Information Management** (type, cut code, pallet number, grade, dimensions, quantity, area)
- ✅ **Editable Table Input** (with Enter key support)
- ✅ **Advanced Search & Filtering** (by type, pallet, grade, dimensions, etc.)
- ✅ **Stone Types Management**
- ✅ **Reporting & Printing** (PDF for pallet cards and search results)
- ✅ **SQLite Database** (with Backup/Restore support)
- ✅ **Graphical Charts** (area visualization)
- ✅ **Full Security** (contextIsolation, sandbox, secure IPC)
- ✅ **Persian Language Support** (RTL)
- ✅ **Auto-save** (every 5 seconds)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- [Python](https://www.python.org/) (for building on some systems)

### Installation

```bash
# Clone the repository
git clone https://github.com/a-kooshki/palat.git
cd palat

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build for Production

```bash
# Build for Windows
npm run build:electron

# Output files will be in the dist folder
```

---

## 📁 Project Structure

```
palat/
├── main/                  # Main Process
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload script (IPC bridge)
│   └── database.js        # SQLite database layer
├── renderer/              # Renderer Process
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Tailwind CSS styles
│   └── public/
│       ├── index.html     # HTML template
│       └── icon.png       # App icon
├── package.json           # Project configuration
├── electron-builder.json  # Build configuration
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── .gitignore             # Ignored files
└── README.md              # Documentation
```

---

## 🔧 Configuration

### Database Configuration

SQLite database is automatically created in the `userData` folder. To change the database path, edit `main/database.js`.

### Security Configuration

- **contextIsolation**: Enabled
- **nodeIntegration**: Disabled
- **sandbox**: Enabled
- **IPC**: Secured with preload script

---

## 📊 Available APIs

### Via `window.electronAPI`

#### Data
- `loadData()` - Load all data
- `saveData(data)` - Save all data

#### Stones
- `addStone(stone)` - Add new stone
- `updateStone(stone)` - Update stone
- `deleteStone(id)` - Delete stone

#### Stone Types
- `addStoneType(type)` - Add stone type
- `deleteStoneType(type)` - Delete stone type

#### Backup/Restore
- `backupDatabase(path)` - Create backup
- `restoreDatabase(path)` - Restore backup

#### Search
- `searchStones(filters)` - Search stones

#### Audit Logs
- `getAuditLogs(options)` - Get change logs

---

## 🎨 User Interface

### Tabs
1. **Form** - Enter stone information in editable table
2. **Search & Review** - Search and review stones
3. **Pallet Card** - Display and print pallet cards
4. **Stone Types** - Manage stone types

### Keyboard Shortcuts
- **Enter**: Move to next row / Add new stone
- **Escape**: Cancel editing
- **Delete**: Delete selected stone

---

## 🔒 Security

- **contextIsolation**: Enabled to prevent Node.js access from Renderer
- **sandbox**: Enabled to restrict access
- **IPC Validation**: All IPC requests are validated
- **SQL Injection Prevention**: Using prepared statements in SQLite
- **Path Traversal Prevention**: Path validation

---

## 📦 Dependencies

- **Electron**: Main framework
- **React**: UI library
- **SQLite3**: Local database
- **Chart.js**: Graphical charts
- **jsPDF**: PDF generation
- **Tailwind CSS**: Styling

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature`)
6. Create a Pull Request

---

## 📄 License

MIT License
