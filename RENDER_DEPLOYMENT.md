# Render 部署指南

本指南將協助您將應用程式部署到 Render。

## 前置準備

1. 確保您已經完成 Firebase 設定（參考 `FIREBASE_SETUP.md`）
2. 確保所有 Firebase 環境變數都已準備好

## 部署步驟

### 步驟 1：建立 Render 帳號

1. 前往 [Render](https://render.com/)
2. 註冊或登入帳號
3. 連接您的 GitHub/GitLab/Bitbucket 帳號（建議）

### 步驟 2：建立新的 Web Service

1. 在 Render Dashboard 點擊「New +」
2. 選擇「Web Service」
3. 連接您的 Git 儲存庫（或選擇手動部署）

### 步驟 3：設定部署配置

如果使用 `render.yaml`（推薦）：
- Render 會自動讀取 `render.yaml` 配置
- 確保所有環境變數都已設定（見下方）

如果手動設定：
- **Name**: `scoreapp`（或您喜歡的名稱）
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: `20`（根據 `.nvmrc`）

### 步驟 4：設定環境變數

在 Render Dashboard 的「Environment」區塊中，新增以下環境變數：

```
NODE_ENV=production
NEXT_PUBLIC_FIREBASE_API_KEY=您的_API_Key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=您的專案ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=您的專案ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=您的專案ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=您的_Sender_ID
NEXT_PUBLIC_FIREBASE_APP_ID=您的_App_ID
```

**重要**：
- 所有 `NEXT_PUBLIC_*` 開頭的環境變數必須在 Render 中設定
- 這些值應該與您的 `.env.local` 檔案中的值相同
- 不要在環境變數值前後加上引號

### 步驟 5：部署

1. 點擊「Create Web Service」
2. Render 會自動開始構建和部署
3. 等待部署完成（通常需要 5-10 分鐘）

### 步驟 6：驗證部署

1. 部署完成後，Render 會提供一個 URL（例如：`https://scoreapp.onrender.com`）
2. 訪問該 URL 確認應用程式正常運作
3. 測試登入功能
4. 測試建立活動功能

## 常見問題排查

### 構建失敗

**問題**: 構建過程中出現錯誤

**解決方案**:
1. 檢查構建日誌中的錯誤訊息
2. 確認所有環境變數都已正確設定
3. 確認 `package.json` 中的依賴版本正確
4. 確認 Node.js 版本為 20（檢查 `.nvmrc`）

### 環境變數未載入

**問題**: 應用程式無法連接到 Firebase

**解決方案**:
1. 確認所有 `NEXT_PUBLIC_*` 環境變數都已設定
2. 確認環境變數名稱正確（大小寫敏感）
3. 確認環境變數值沒有多餘的空格或引號
4. 重新部署應用程式

### 應用程式無法啟動

**問題**: 部署成功但應用程式無法訪問

**解決方案**:
1. 檢查 Render 日誌中的錯誤訊息
2. 確認 `next.config.js` 中的 `output: 'standalone'` 設定正確
3. 確認 `package.json` 中的 `start` 腳本正確
4. 檢查端口配置（Render 會自動處理）

### Firebase 連接錯誤

**問題**: 瀏覽器控制台顯示 Firebase 初始化錯誤

**解決方案**:
1. 確認 Firebase 環境變數都已正確設定
2. 確認 Firebase Console 中的 Authentication 已啟用
3. 確認 Firestore Database 已建立
4. 檢查 Firebase 專案的 API 金鑰是否正確

## 自動部署

如果您連接了 Git 儲存庫，Render 會在您推送程式碼時自動重新部署。

## 免費方案限制

Render 免費方案的限制：
- 應用程式在 15 分鐘無活動後會進入休眠狀態
- 休眠後首次訪問需要等待約 30 秒喚醒
- 每月有構建時間限制

如果需要避免休眠，可以考慮升級到付費方案。

## 額外資源

- [Render 文件](https://render.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Firebase 設定指南](./FIREBASE_SETUP.md)

