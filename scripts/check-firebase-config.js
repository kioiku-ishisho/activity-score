/**
 * Firebase 設定檢查腳本
 * 執行方式：node scripts/check-firebase-config.js
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

console.log('🔍 檢查 Firebase 環境變數設定...\n');

// 檢查 .env.local 檔案是否存在
const envLocalPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.log('❌ 找不到 .env.local 檔案！\n');
  console.log('📝 請執行以下步驟：');
  console.log('1. 在專案根目錄建立 .env.local 檔案');
  console.log('2. 參考 SETUP_QUICK_START.md 或 FIREBASE_SETUP.md 取得 Firebase 設定值');
  console.log('3. 填入所有必要的環境變數');
  console.log('4. 重新執行此腳本檢查設定');
  process.exit(1);
}

// 載入 .env.local 檔案
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('⚠️  無法載入 .env.local 檔案，請確認檔案格式正確');
  console.log('   錯誤訊息：', error.message);
  process.exit(1);
}

let allSet = true;
const missingVars = [];
const emptyVars = [];

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  
  // 檢查是否為空或使用預設值
  if (!value || value.trim() === '') {
    console.log(`❌ ${varName}: 未設定`);
    allSet = false;
    missingVars.push(varName);
  } else if (
    value.includes('your_') || 
    value.includes('your-') ||
    value === 'your_api_key_here' ||
    value === `your_${varName.toLowerCase().replace('next_public_firebase_', '').replace(/_/g, '_')}`
  ) {
    console.log(`❌ ${varName}: 仍使用預設值`);
    allSet = false;
    emptyVars.push(varName);
  } else {
    // 顯示部分值（隱藏敏感資訊）
    const displayValue = value.length > 30 
      ? `${value.substring(0, 15)}...${value.substring(value.length - 10)}` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n' + '='.repeat(60));

if (allSet) {
  console.log('✅ 所有 Firebase 環境變數已正確設定！\n');
  console.log('📋 下一步檢查清單：');
  console.log('   [ ] Firebase Console 中已啟用 Authentication (Email/Password)');
  console.log('   [ ] 已建立 Firestore Database');
  console.log('   [ ] 已設定 Firestore 安全規則（參考 firestore.rules）');
  console.log('\n🚀 執行 npm run dev 啟動應用程式');
} else {
  if (missingVars.length > 0) {
    console.log('❌ 發現未設定的環境變數：');
    missingVars.forEach((varName) => {
      console.log(`   - ${varName}`);
    });
  }
  if (emptyVars.length > 0) {
    console.log('❌ 發現仍使用預設值的環境變數：');
    emptyVars.forEach((varName) => {
      console.log(`   - ${varName}`);
    });
  }
  console.log('\n📝 設定步驟：');
  console.log('1. 開啟 .env.local 檔案');
  console.log('2. 參考 SETUP_QUICK_START.md 或 FIREBASE_SETUP.md 取得 Firebase 設定值');
  console.log('3. 填入所有必要的環境變數（替換掉預設值）');
  console.log('4. 重新執行此腳本檢查設定');
}

console.log('='.repeat(60));

