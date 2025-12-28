# 活動計分管理系統

一個用於管理活動和參加者計分的 Web 應用程式。

## 功能特色

- 🔐 使用者註冊與登入系統（Firebase Authentication）
- 📋 活動列表管理
- ➕ 新增活動功能（自動生成 6 位數字 PIN 碼）
- 🔑 輸入 PIN 碼加入別人的活動
- 👥 參加者管理
- 📊 分數加減功能
- 📝 分數明細記錄
- 📤 CSV 匯出功能
- 📥 CSV 匯入參加者

## 技術棧

- **Next.js 14** - React 框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式設計
- **Firebase** - 後端服務（Authentication + Firestore）

## 安裝與執行

1. 安裝依賴套件：
```bash
npm install
```

2. 設定 Firebase 環境變數：
   在專案根目錄建立 `.env.local` 檔案，並填入以下 Firebase 設定：
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. 啟動開發伺服器：
```bash
npm run dev
```

4. 開啟瀏覽器訪問：http://localhost:3000

## Firebase 設定

1. 在 [Firebase Console](https://console.firebase.google.com/) 建立新專案
2. 啟用 **Authentication**（Email/Password 登入方式）
3. 建立 **Firestore Database**（使用測試模式或設定安全規則）
4. 在專案設定中取得 Web App 設定值，填入 `.env.local` 檔案

## Firestore 安全規則範例

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 使用者資料：只能讀寫自己的資料
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 活動資料：所有人都可以讀取，只有擁有者可以寫入
    match /activities/{activityId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
    
    // 參加者資料：所有人都可以讀取，已登入使用者可以寫入
    match /participants/{participantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // 分數記錄：所有人都可以讀取，已登入使用者可以寫入
    match /scores/{scoreId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 使用說明

1. **註冊與登入**
   - 首次使用請點擊「註冊」建立新帳號
   - 輸入電子郵件、使用者名稱和密碼（至少 6 個字元）
   - 已有帳號的使用者可直接登入

2. **首頁 - 活動列表**
   - 查看您建立的所有活動
   - 點擊「新增活動」按鈕建立新活動（系統會自動生成 6 位數字 PIN 碼）
   - 點擊「輸入 PIN 碼加入活動」按鈕，輸入別人的活動 PIN 碼以加入該活動
   - 點擊活動卡片進入活動詳情頁面
   - 每個活動卡片會顯示該活動的 PIN 碼

3. **活動詳情頁面**
   - 查看該活動的所有參加者及其總分
   - 新增參加者（單個或批量 CSV 匯入）
   - 為參加者加減分（單個或批量）
   - 點擊參加者名稱或「查看明細」查看分數明細
   - 匯出 CSV 報表（分數名單表、個人明細表、時間序計分表）

4. **參加者詳情頁面**
   - 查看該參加者的總分
   - 查看所有分數記錄的明細（時間、分數、原因）
   - 新增或編輯分數記錄

## 專案結構

```
choirapp/
├── app/
│   ├── activity/
│   │   └── [id]/
│   │       └── page.tsx      # 活動詳情頁面
│   ├── participant/
│   │   └── [id]/
│   │       └── page.tsx      # 參加者詳情頁面
│   ├── login/
│   │   └── page.tsx          # 登入頁面
│   ├── layout.tsx            # 根布局
│   ├── page.tsx              # 首頁（活動列表）
│   └── globals.css           # 全局樣式
├── lib/
│   ├── firebase.ts           # Firebase 初始化
│   ├── firebase-auth.ts      # Firebase 認證邏輯
│   ├── firebase-db.ts        # Firestore 資料庫操作
│   └── storage.ts            # 舊的 LocalStorage 邏輯（已棄用）
├── types/
│   └── index.ts              # TypeScript 類型定義
└── package.json              # 專案配置

```

## 數據存儲

所有數據都存儲在 Firebase Firestore 中，包括：
- 使用者資料（`users` collection）
- 活動資料（`activities` collection，包含 PIN 碼）
- 參加者資料（`participants` collection）
- 分數記錄（`scores` collection）

## PIN 碼說明

- 每個活動建立時會自動生成一個 6 位數字的 PIN 碼
- PIN 碼為非流水號（不會是 123456、654321、111111 等）
- 使用者可以透過 PIN 碼加入別人的活動，共同進行計分管理

## 開發指令

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建立生產版本
- `npm start` - 啟動生產伺服器
- `npm run lint` - 執行 ESLint 檢查