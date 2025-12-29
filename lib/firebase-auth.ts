import { doc, setDoc, getDoc, getDocs, query, where, collection, serverTimestamp } from 'firebase/firestore';
import { db, generateUserCode } from './firebase';
import { User } from '@/types';

// 檢查用戶碼是否已存在
async function checkUserCodeExists(userCode: string): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userCode', '==', userCode));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('檢查用戶碼失敗:', error);
    return true; // 發生錯誤時假設已存在，避免重複
  }
}

// 生成唯一的用戶碼
async function generateUniqueUserCode(): Promise<string> {
  let userCode: string;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 100;

  while (exists && attempts < maxAttempts) {
    userCode = generateUserCode();
    exists = await checkUserCodeExists(userCode);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('無法生成唯一的用戶碼，請稍後再試');
  }

  return userCode!;
}

// 生成唯一的用戶 ID
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 註冊新使用者（只需要用戶名）
export async function registerUser(username: string): Promise<{ user: User | null; userCode: string | null; error: string | null }> {
  try {
    if (!username.trim()) {
      return { user: null, userCode: null, error: '請輸入使用者名稱' };
    }

    // 生成唯一的用戶 ID
    const userId = generateUserId();

    // 生成唯一的用戶碼
    const userCode = await generateUniqueUserCode();

    // 在 Firestore 中建立使用者資料
    const userData: User = {
      id: userId,
      username: username.trim(),
      userCode,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: serverTimestamp(),
    });

    // 同時建立用戶碼索引（方便查詢）
    await setDoc(doc(db, 'userCodes', userCode), {
      userId: userId,
      createdAt: serverTimestamp(),
    });

    // 在 localStorage 中存儲用戶資訊（用於後續認證）
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('userCode', userCode);
    }

    return { user: userData, userCode, error: null };
  } catch (error: any) {
    return { user: null, userCode: null, error: error.message || '註冊失敗' };
  }
}

// 通過用戶碼登入
export async function loginUserByCode(userCode: string): Promise<{ user: User | null; error: string | null }> {
  try {
    if (!userCode.trim() || userCode.trim().length !== 6) {
      return { user: null, error: '用戶碼必須為 6 位數字' };
    }

    // 通過用戶碼查找用戶
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userCode', '==', userCode.trim()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { user: null, error: '找不到此用戶碼對應的用戶' };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data() as User;
    const userId = userDoc.id;

    // 在 localStorage 中存儲用戶資訊
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify({ ...userData, id: userId }));
      localStorage.setItem('userCode', userCode.trim());
    }

    return { user: { ...userData, id: userId }, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || '登入失敗' };
  }
}

// 登出使用者
export async function logoutUser(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userCode');
  }
}

// 取得當前使用者（從 localStorage 或 Firestore）
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 從 localStorage 讀取
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser) as User;
      // 驗證用戶碼是否仍然有效
      const userCode = localStorage.getItem('userCode');
      if (userCode) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userCode', '==', userCode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data() as User;
          const updatedUser = { ...userData, id: userDoc.id };
          // 更新 localStorage 中的用戶資料
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          return updatedUser;
        } else {
          // 用戶碼無效，清除 localStorage
          localStorage.removeItem('currentUser');
          localStorage.removeItem('userCode');
          return null;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('取得使用者資料失敗:', error);
    return null;
  }
}

// 監聽認證狀態變化（適配新的認證方式）
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  // 使用 Firestore 和 localStorage 進行認證檢查
  const checkAuth = async () => {
    const user = await getCurrentUser();
    callback(user);
  };

  // 初始檢查
  checkAuth();

  // 監聽 localStorage 變化（當用戶登入/登出時）
  if (typeof window !== 'undefined') {
    // 監聽 storage 事件（跨標籤頁）
    window.addEventListener('storage', checkAuth);
    
    // 監聽 localStorage 的直接修改（同標籤頁）
    // 由於 localStorage 的修改不會觸發 storage 事件（同標籤頁），
    // 我們需要定期檢查或使用自定義事件
    const intervalId = setInterval(checkAuth, 1000); // 每秒檢查一次
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(intervalId);
    };
  }

  return () => {};
}

// 從 Firestore 取得使用者資料
export async function getUserData(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { ...userDoc.data() as User, id: userDoc.id };
    }
    return null;
  } catch (error) {
    console.error('取得使用者資料失敗:', error);
    return null;
  }
}

// 通過用戶碼取得使用者資料
export async function getUserByCode(userCode: string): Promise<User | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userCode', '==', userCode.trim()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    return { ...userDoc.data() as User, id: userDoc.id };
  } catch (error) {
    console.error('通過用戶碼取得使用者資料失敗:', error);
    return null;
  }
}

