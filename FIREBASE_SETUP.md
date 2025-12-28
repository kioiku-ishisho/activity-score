# Firebase 設定指南

本指南將協助您完成 Firebase 的設定，讓應用程式能夠正常運作。

## 步驟 1：建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」或「Add project」
3. 輸入專案名稱（例如：`scoreapp`）
4. 選擇是否啟用 Google Analytics（可選）
5. 點擊「建立專案」

## 步驟 2：建立 Web 應用程式

1. 在 Firebase Console 中，點擊專案設定（齒輪圖示）
2. 向下滾動到「您的應用程式」區塊
3. 點擊「</>」圖示（Web 應用程式）
4. 輸入應用程式暱稱（例如：`scoreapp-web`）
5. **不要**勾選「也設定 Firebase Hosting」
6. 點擊「註冊應用程式」
7. 複製顯示的設定值（`firebaseConfig`）

## 步驟 3：設定環境變數

1. 在專案根目錄建立 `.env.local` 檔案
2. 將 `.env.example` 的內容複製到 `.env.local`
3. 填入從 Firebase Console 取得的設定值：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...（您的 API Key）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### 如何找到這些值？

在 Firebase Console 的專案設定中，您會看到類似這樣的設定：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

對應關係：
- `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
- `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

## 步驟 4：啟用 Authentication

1. 在 Firebase Console 左側選單中，點擊「Authentication」
2. 點擊「開始使用」或「Get started」
3. 點擊「Sign-in method」標籤
4. 點擊「Email/Password」
5. 啟用「Email/Password」提供者
6. 點擊「儲存」

## 步驟 5：建立 Firestore Database

1. 在 Firebase Console 左側選單中，點擊「Firestore Database」
2. 點擊「建立資料庫」或「Create database」
3. 選擇「以測試模式啟動」（開發階段）
   - 注意：測試模式允許所有讀寫操作，僅適用於開發
4. 選擇 Firestore 位置（建議選擇離您最近的區域，例如：`asia-east1`）
5. 點擊「啟用」

## 步驟 6：設定 Firestore 安全規則

1. 在 Firestore Database 頁面中，點擊「規則」標籤
2. 將以下規則貼上：

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

3. 點擊「發布」

## 步驟 7：建立 Firestore 索引（可選）

如果遇到查詢錯誤，Firebase 會提示您建立索引。您可以：

1. 點擊錯誤訊息中的連結
2. 或在 Firestore Console 中點擊「索引」標籤
3. 建立所需的複合索引

常見的索引需求：
- `activities` collection：`ownerId` (Ascending) + `createdAt` (Descending)

## 步驟 8：測試設定

1. 重新啟動開發伺服器：
```bash
npm run dev
```

2. 開啟瀏覽器訪問：http://localhost:3000

3. 嘗試註冊新帳號：
   - 點擊「註冊」
   - 輸入電子郵件、使用者名稱和密碼
   - 如果成功，應該會導向首頁

4. 檢查 Firebase Console：
   - Authentication 中應該看到新註冊的使用者
   - Firestore Database 中應該看到 `users` collection

## 疑難排解

### 問題：環境變數沒有生效

- 確保檔案名稱是 `.env.local`（不是 `.env`）
- 重新啟動開發伺服器
- 檢查變數名稱是否正確（必須以 `NEXT_PUBLIC_` 開頭）

### 問題：Authentication 錯誤

- 確認已啟用 Email/Password 提供者
- 檢查 `.env.local` 中的設定值是否正確
- 查看瀏覽器控制台的錯誤訊息

### 問題：Firestore 權限錯誤

- 確認已設定 Firestore 安全規則
- 檢查規則語法是否正確
- 確認使用者已登入（`request.auth != null`）

### 問題：查詢錯誤需要索引

- 按照 Firebase 的錯誤訊息建立索引
- 或暫時使用測試模式（不建議用於生產環境）

## 生產環境注意事項

在部署到生產環境前，請：

1. **更新 Firestore 安全規則**：根據您的需求調整規則，避免使用測試模式
2. **設定 CORS**：如果需要從不同網域存取
3. **啟用 Firebase App Check**：增加安全性
4. **設定備份**：定期備份 Firestore 資料

## 需要協助？

如果遇到問題，請檢查：
- 瀏覽器控制台的錯誤訊息
- Firebase Console 中的日誌
- 專案的 `.env.local` 檔案設定

