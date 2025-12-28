# Firebase 快速設定指南

## 🚀 快速開始（5 分鐘設定）

### 步驟 1：建立 Firebase 專案

1. 前往 https://console.firebase.google.com/
2. 點擊「新增專案」
3. 輸入專案名稱（例如：`scoreapp`）
4. 完成建立

### 步驟 2：取得 Web App 設定

1. 點擊專案設定（⚙️ 圖示）
2. 向下滾動到「您的應用程式」
3. 點擊 `</>` 圖示（新增 Web 應用程式）
4. 輸入應用程式暱稱
5. **複製 `firebaseConfig` 物件中的所有值**

### 步驟 3：建立環境變數檔案

在專案根目錄建立 `.env.local` 檔案：

```bash
# Windows PowerShell
New-Item .env.local

# 或使用文字編輯器直接建立
```

填入以下內容（替換成您的 Firebase 設定值）：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=您的_API_Key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=您的專案ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=您的專案ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=您的專案ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=您的_Sender_ID
NEXT_PUBLIC_FIREBASE_APP_ID=您的_App_ID
```

### 步驟 4：啟用 Authentication

1. 在 Firebase Console 左側選單點擊「Authentication」
2. 點擊「開始使用」
3. 點擊「Sign-in method」標籤
4. 點擊「Email/Password」
5. 啟用「Email/Password」
6. 點擊「儲存」

### 步驟 5：建立 Firestore Database

1. 在 Firebase Console 左側選單點擊「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇「以測試模式啟動」
4. 選擇位置（建議：`asia-east1` 或 `asia-northeast1`）
5. 點擊「啟用」

### 步驟 6：設定 Firestore 安全規則

1. 在 Firestore Database 頁面點擊「規則」標籤
2. 複製 `firestore.rules` 檔案的內容
3. 貼上到規則編輯器中
4. 點擊「發布」

### 步驟 7：檢查設定

安裝依賴並執行檢查腳本：

```bash
npm install
npm run check-firebase
```

如果所有項目都顯示 ✅，表示設定完成！

### 步驟 8：啟動應用程式

```bash
npm run dev
```

開啟瀏覽器訪問 http://localhost:3000

## 📋 設定檢查清單

- [ ] Firebase 專案已建立
- [ ] Web App 已註冊並取得設定值
- [ ] `.env.local` 檔案已建立並填入所有環境變數
- [ ] Authentication (Email/Password) 已啟用
- [ ] Firestore Database 已建立
- [ ] Firestore 安全規則已設定
- [ ] `npm run check-firebase` 檢查通過
- [ ] 應用程式可以正常啟動

## ❓ 需要詳細說明？

請參考 `FIREBASE_SETUP.md` 檔案，裡面有完整的步驟說明和疑難排解指南。

## 🔒 安全提醒

- `.env.local` 檔案包含敏感資訊，**不要**提交到 Git
- 生產環境請更新 Firestore 安全規則，不要使用測試模式
- 定期檢查 Firebase Console 的使用量和費用

