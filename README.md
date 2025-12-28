# 活動計分管理系統

一個用於管理活動和參加者計分的 Web 應用程式。

## 功能特色

- 🔐 使用者登入系統
- 📋 活動列表管理
- ➕ 新增活動功能
- 👥 參加者管理
- 📊 分數加減功能
- 📝 分數明細記錄

## 技術棧

- **Next.js 14** - React 框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式設計
- **LocalStorage** - 數據存儲

## 安裝與執行

1. 安裝依賴套件：
```bash
npm install
```

2. 啟動開發伺服器：
```bash
npm run dev
```

3. 開啟瀏覽器訪問：http://localhost:3000

## 預設帳號

- **使用者名稱**：admin
- **密碼**：admin123

## 使用說明

1. **登入系統**
   - 使用預設帳號登入系統

2. **首頁 - 活動列表**
   - 查看所有活動
   - 點擊「新增活動」按鈕建立新活動
   - 點擊活動卡片進入活動詳情頁面

3. **活動詳情頁面**
   - 查看該活動的所有參加者及其總分
   - 新增參加者
   - 為參加者加減分
   - 點擊參加者名稱或「查看明細」查看分數明細

4. **參加者詳情頁面**
   - 查看該參加者的總分
   - 查看所有分數記錄的明細（時間、分數、原因）

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
│   └── storage.ts            # 數據存儲邏輯
├── types/
│   └── index.ts              # TypeScript 類型定義
└── package.json              # 專案配置

```

## 數據存儲

所有數據都存儲在瀏覽器的 LocalStorage 中，包括：
- 使用者資料
- 活動資料
- 參加者資料
- 分數記錄

## 開發指令

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建立生產版本
- `npm start` - 啟動生產伺服器
- `npm run lint` - 執行 ESLint 檢查

# activity-score
