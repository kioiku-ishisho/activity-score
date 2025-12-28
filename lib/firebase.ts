import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// 驗證必要的環境變數
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 在生產環境中檢查環境變數
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  const missingVars: string[] = [];
  if (!requiredEnvVars.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!requiredEnvVars.authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!requiredEnvVars.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!requiredEnvVars.storageBucket) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!requiredEnvVars.messagingSenderId) missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!requiredEnvVars.appId) missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  
  if (missingVars.length > 0) {
    throw new Error(
      `缺少必要的 Firebase 環境變數: ${missingVars.join(', ')}\n` +
      '請在 Render 的環境變數設定中新增這些變數。'
    );
  }
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
};

// 初始化 Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// 生成 6 位數字 PIN 碼（非流水號）
export function generatePin(): string {
  // 生成隨機 6 位數字，確保不是流水號
  let pin: string;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (isSequentialPin(pin));
  
  return pin;
}

// 檢查是否為流水號（如 123456, 654321, 111111 等）
function isSequentialPin(pin: string): boolean {
  // 檢查是否為相同數字（如 111111）
  if (/^(\d)\1{5}$/.test(pin)) {
    return true;
  }
  
  // 檢查是否為連續遞增（如 123456）
  let isAscending = true;
  for (let i = 1; i < pin.length; i++) {
    if (parseInt(pin[i]) !== parseInt(pin[i - 1]) + 1) {
      isAscending = false;
      break;
    }
  }
  
  // 檢查是否為連續遞減（如 654321）
  let isDescending = true;
  for (let i = 1; i < pin.length; i++) {
    if (parseInt(pin[i]) !== parseInt(pin[i - 1]) - 1) {
      isDescending = false;
      break;
    }
  }
  
  return isAscending || isDescending;
}

